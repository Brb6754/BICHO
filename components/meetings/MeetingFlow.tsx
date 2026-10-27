'use client';

import { useCallback, useMemo, useState } from 'react';
import { Building2, Check, MapPin, Users, Video, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addDaysKey, dayKey, formatTime, longDate } from '@/lib/dates/tenantTime';
import { MODALIDADES, pideDireccion, type Modalidad } from '@/lib/meetings/kinds';
import { DateStrip, CalendarSheet, type StripDay } from '@/components/booking/dates';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';

// AGENDAR UNA REUNIÓN — la cara pública.
//
// Es el flujo de citas con otra pregunta detrás, y esa diferencia manda
// en tres cosas:
//
//   · NO HAY PRECIOS. Una reunión de venta no se cobra, y poner "$0"
//     al lado de "Visita técnica" hace dudar de si va a costar.
//   · LA EMPRESA ES UN CAMPO DE PRIMERA. Quien agenda suele representar
//     a un negocio, y el asesor necesita saber a cuál antes de llegar.
//   · LA DIRECCIÓN SOLO APARECE EN LA VISITA A SITIO. Pedírsela a quien
//     agenda una videollamada es pedir un dato que nadie va a usar.
//
// Los horarios salen de `get_available_slots`, la MISMA función que usa
// la página de citas y el panel. Una reunión y una cita ocupan al mismo
// asesor y comparten tabla (db/039), así que lo que aquí se ofrece ya
// descuenta las citas y los bloqueos — sin una línea de lógica nueva.

const ICONO: Record<Modalidad, typeof Video> = {
  video: Video,
  sitio: MapPin,
  oficina: Users,
};

export type MeetingType = {
  id: string;
  name: string;
  duration_minutes: number;
  modality: Modalidad | null;
};

type Slot = { slot_start: string; slot_end: string; resourceId: string };

type Paso = 'tipo' | 'cuando' | 'datos' | 'listo';

export function MeetingFlow({
  slug,
  businessName,
  tipos,
  asesores,
  timezone,
  accentColor,
}: {
  slug: string;
  businessName: string;
  tipos: MeetingType[];
  asesores: { id: string; name: string }[];
  timezone: string | null;
  accentColor: string;
}) {
  const [paso, setPaso] = useState<Paso>('tipo');
  const [tipoId, setTipoId] = useState<string | null>(tipos.length === 1 ? tipos[0].id : null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [diaKey, setDiaKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [calendario, setCalendario] = useState(false);

  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [tel, setTel] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tipo = tipos.find((t) => t.id === tipoId) ?? null;
  const necesitaDireccion = pideDireccion(tipo?.modality);

  // Se piden los huecos de TODOS los asesores en paralelo y se
  // deduplica por hora de inicio. Es lo que permite no preguntarle al
  // visitante con quién quiere hablar: a esta altura de la venta no
  // conoce a nadie, y elegir entre dos nombres desconocidos es una
  // decisión que no puede tomar.
  const cargarPara = useCallback(
    async (idTipo: string) => {
    if (!idTipo || asesores.length === 0) return;
    setCargando(true);
    setErrorCarga(null);
    const supabase = createClient();
    const desde = dayKey(new Date(), timezone);

    const respuestas = await Promise.all(
      asesores.map((a) =>
        supabase.rpc('get_available_slots', {
          p_resource_id: a.id,
          p_service_type_id: idTipo,
          p_from: desde,
          p_to: addDaysKey(desde, 45),
        })
      )
    );
    setCargando(false);

    if (respuestas.every((r) => r.error)) {
      setErrorCarga('No pudimos cargar los horarios. Vuelve a intentarlo.');
      setSlots([]);
      return;
    }

    const porInicio = new Map<string, Slot>();
    respuestas.forEach((r, i) => {
      for (const s of (r.data ?? []) as { slot_start: string; slot_end: string }[]) {
        if (!porInicio.has(s.slot_start)) {
          porInicio.set(s.slot_start, { ...s, resourceId: asesores[i].id });
        }
      }
    });
    const libres = [...porInicio.values()].sort(
      (a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
    );
    setSlots(libres);
    // Caer en el primer día CON huecos y no en hoy: un calendario que
    // abre en un día vacío se lee como "no hay nada", aunque mañana
    // esté libre entero.
    setDiaKey(libres.length ? dayKey(libres[0].slot_start, timezone) : null);
    },
    [asesores, timezone]
  );

  // El reintento y el refresco tras un choque de horario repiten la
  // misma carga con el tipo ya elegido.
  const cargar = useCallback(() => {
    if (tipoId) return cargarPara(tipoId);
  }, [tipoId, cargarPara]);

  const diasConHueco = useMemo(
    () => new Set(slots.map((s) => dayKey(s.slot_start, timezone))),
    [slots, timezone]
  );

  const tira: StripDay[] = useMemo(() => {
    const hoy = dayKey(new Date(), timezone);
    return Array.from({ length: 14 }, (_, i) => {
      const key = addDaysKey(hoy, i);
      const d = new Date(`${key}T12:00:00`);
      return {
        key,
        weekday: d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', ''),
        dayNumber: String(d.getDate()),
        available: diasConHueco.has(key),
        isToday: i === 0,
      };
    });
  }, [diasConHueco, timezone]);

  const delDia = useMemo(
    () => slots.filter((s) => dayKey(s.slot_start, timezone) === diaKey),
    [slots, diaKey, timezone]
  );

  async function enviar() {
    setError(null);
    if (!slot || !tipo) return;
    if (!nombre.trim()) return setError('Escribe tu nombre.');
    if (!tel.trim()) return setError('Escribe un teléfono donde podamos localizarte.');
    if (necesitaDireccion && !direccion.trim()) {
      return setError('Necesitamos la dirección para ir a verte.');
    }

    setEnviando(true);
    const res = await fetch('/api/reuniones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        resource_id: slot.resourceId,
        meeting_type_id: tipo.id,
        starts_at: slot.slot_start,
        ends_at: slot.slot_end,
        name: nombre,
        phone: tel,
        email: correo,
        company: empresa,
        address: direccion,
        notes: notas,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setEnviando(false);

    if (!res.ok) {
      // Si el hueco se ocupó mientras llenaba el formulario, hay que
      // recargar ANTES de mostrar el error y devolverlo a elegir hora:
      // dejarlo en el formulario con un horario que ya no existe lo
      // manda a reintentar lo mismo.
      if (res.status === 409) {
        setSlot(null);
        setPaso('cuando');
        await cargar();
      }
      setError(json.error ?? 'No se pudo agendar la reunión.');
      return;
    }
    setPaso('listo');
  }

  // ── Confirmación ──────────────────────────────────────────────────
  if (paso === 'listo' && slot && tipo) {
    const Icono = ICONO[(tipo.modality ?? 'oficina') as Modalidad];
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
          Listo, quedamos
        </h2>
        <p className="mt-2 text-[15px] text-muted">
          {longDate(slot.slot_start, timezone)} a las {formatTime(slot.slot_start, timezone)}
        </p>
        <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-border px-4 py-3 text-left text-sm">
          <p className="flex items-center gap-2 text-ink">
            <Icono className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            {tipo.name}
          </p>
          <p className="mt-1 text-muted">
            {tipo.modality ? MODALIDADES[tipo.modality].ayuda : ''}
          </p>
          {necesitaDireccion && direccion && (
            <p className="mt-2 text-muted">Vamos a: {direccion}</p>
          )}
        </div>
        <p className="mx-auto mt-5 max-w-sm text-sm text-muted">
          {businessName} te va a confirmar
          {correo ? ' por correo' : ' por teléfono'}. Si necesitas moverla, escríbenos y lo
          acomodamos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
      {/* El rastro de lo ya decidido, clickeable para volver. Sustituye
          a un indicador de pasos numerado: a quien agenda no le importa
          ir en el 2 de 3, le importa qué lleva elegido. */}
      {(tipo || slot) && paso !== 'tipo' && (
        <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          {tipo && (
            <button
              type="button"
              onClick={() => setPaso('tipo')}
              className="rounded-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {tipo.name}
            </button>
          )}
          {slot && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setPaso('cuando')}
                className="rounded-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {longDate(slot.slot_start, timezone)}, {formatTime(slot.slot_start, timezone)}
              </button>
            </>
          )}
        </div>
      )}

      {paso === 'tipo' && (
        <div>
          <h2
            className="text-lg font-semibold text-ink"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            ¿De qué quieres que hablemos?
          </h2>
          <p className="mt-1 text-sm text-muted">Después eliges el día y la hora.</p>

          <ul className="mt-4 overflow-hidden rounded-2xl border border-border">
            {tipos.map((t, i) => {
              const Icono = ICONO[(t.modality ?? 'oficina') as Modalidad];
              return (
                <li key={t.id} className={i > 0 ? 'border-t border-border' : ''}>
                  {/* La fila entera es el botón: un CTA chiquito al lado
                      obliga a apuntar a un objetivo pequeño cuando el
                      renglón completo ya era el objetivo. */}
                  <button
                    type="button"
                    // Los horarios se piden AQUÍ y no en un efecto que
                    // mire el paso: elegir el tipo es el evento que de
                    // verdad los cambia, y un efecto que escribe estado
                    // al entrar al paso provoca renders en cascada.
                    onClick={() => {
                      setTipoId(t.id);
                      setSlot(null);
                      setPaso('cuando');
                      cargarPara(t.id);
                    }}
                    className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                  >
                    <Icono className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{t.name}</span>
                      <span className="mt-0.5 block text-sm text-muted">
                        {t.duration_minutes} min
                        {t.modality ? ` · ${MODALIDADES[t.modality].corto}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {paso === 'cuando' && (
        <div>
          <h2
            className="text-lg font-semibold text-ink"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            ¿Cuándo te queda bien?
          </h2>

          <div className="mt-4">
            <DateStrip
              days={tira}
              selectedKey={diaKey}
              onSelect={(k) => {
                setDiaKey(k);
                setSlot(null);
              }}
              onOpenCalendar={() => setCalendario(true)}
            />
          </div>

          <CalendarSheet
            open={calendario}
            onClose={() => setCalendario(false)}
            selected={diaKey ? new Date(`${diaKey}T12:00:00`) : undefined}
            onSelect={(d) => {
              if (!d) return;
              setDiaKey(dayKey(d, timezone));
              setSlot(null);
              setCalendario(false);
            }}
            availableDateKeys={diasConHueco}
            accentColor={accentColor}
            onToday={() => setDiaKey(dayKey(new Date(), timezone))}
          />

          <div className="mt-5">
            {cargando && <p className="text-sm text-muted">Buscando horarios…</p>}

            {!cargando && errorCarga && (
              <div>
                <p className="text-sm text-error">{errorCarga}</p>
                <Button type="button" variant="ghost" onClick={cargar} className="mt-2">
                  Reintentar
                </Button>
              </div>
            )}

            {!cargando && !errorCarga && delDia.length === 0 && (
              <p className="text-sm text-muted">
                Ese día no nos quedan horarios.{' '}
                {slots.length > 0 ? 'Elige otro arriba.' : 'Escríbenos y lo acomodamos.'}
              </p>
            )}

            {!cargando && delDia.length > 0 && (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {delDia.map((s) => {
                  const elegido = slot?.slot_start === s.slot_start;
                  return (
                    <li key={s.slot_start}>
                      <button
                        type="button"
                        onClick={() => {
                          setSlot(s);
                          setPaso('datos');
                        }}
                        aria-pressed={elegido}
                        className={`flex h-12 w-full items-center justify-center rounded-xl border text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          elegido
                            ? 'border-primary bg-primary/10 font-semibold text-primary ring-1 ring-primary/30'
                            : 'border-border text-ink hover:bg-ink/[0.04]'
                        }`}
                      >
                        {formatTime(s.slot_start, timezone)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {paso === 'datos' && tipo && slot && (
        <div>
          <button
            type="button"
            onClick={() => setPaso('cuando')}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Cambiar hora
          </button>

          <h2
            className="mt-2 text-lg font-semibold text-ink"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            ¿Con quién hablamos?
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="mf-nombre">Tu nombre</Label>
              <Input
                id="mf-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="name"
                maxLength={120}
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <Label htmlFor="mf-empresa">
                Empresa <span className="font-normal text-muted">(si aplica)</span>
              </Label>
              <div className="relative mt-1.5">
                <Building2
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <Input
                  id="mf-empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  autoComplete="organization"
                  maxLength={160}
                  className="w-full pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mf-tel">Teléfono</Label>
              <Input
                id="mf-tel"
                type="tel"
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                autoComplete="tel"
                maxLength={30}
                className="mt-1.5 w-full"
              />
            </div>
            <div>
              <Label htmlFor="mf-correo">
                Correo <span className="font-normal text-muted">(opcional)</span>
              </Label>
              <Input
                id="mf-correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                maxLength={160}
                className="mt-1.5 w-full"
              />
              <p className="mt-1 text-xs text-muted">Para mandarte la confirmación.</p>
            </div>
          </div>

          {necesitaDireccion && (
            <div className="mt-4">
              <Label htmlFor="mf-dir">¿A dónde vamos?</Label>
              <Input
                id="mf-dir"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                autoComplete="street-address"
                maxLength={300}
                placeholder="Calle, número, colonia y ciudad"
                className="mt-1.5 w-full"
              />
              <p className="mt-1 text-xs text-muted">
                Es donde haríamos el trabajo, para que el asesor llegue preparado.
              </p>
            </div>
          )}

          <div className="mt-4">
            <Label htmlFor="mf-notas">
              Cuéntanos algo más <span className="font-normal text-muted">(opcional)</span>
            </Label>
            <textarea
              id="mf-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              maxLength={1000}
              className="mt-1.5 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 sm:text-sm"
            />
          </div>

          {error && <p className="mt-4 text-sm text-error">{error}</p>}

          <Button type="button" onClick={enviar} isLoading={enviando} className="mt-5 w-full sm:w-auto">
            Agendar la reunión
          </Button>
        </div>
      )}
    </div>
  );
}
