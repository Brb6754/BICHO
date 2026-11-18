'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, Mail, MessageCircle, Pencil, Star, UserRoundX } from 'lucide-react';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { Avatar, CheckListo, Pestanas } from '@/components/tenant-dash/crecer/ui';
import { mailtoLink, waLink } from '@/lib/regresan/mensajes';

// La pantalla de "Clientes que regresan", separada de la página para
// que el panel real y la demo pública (/panel/regresan) dibujen lo mismo.
//
// Ningún botón manda nada: abre WhatsApp (wa.me) o el correo con el texto
// listo para que el dueño lo revise y lo envíe él. Envío masivo
// automático = número baneado.
//
// shortcut: "ya le escribiste" vive solo en este teléfono (localStorage),
// no hay columna para guardarlo; si se quiere entre equipos, va a la base.

export type FilaRegresan = {
  key: string;
  name: string;
  phone: string | null;
  email?: string | null;
  /** "Hace 7 semanas · Retoque de uñas" */
  detalle: string;
  mensaje: string;
};

export type ProximoRecordatorio = {
  id: string;
  name: string;
  cuando: string;
  estado: 'enviado' | 'pendiente' | 'sin-canal';
};

/** El "¿qué es esto?" del encabezado, compartido por el panel y la demo. */
export function AyudaRegresan() {
  return (
    <HelpTip title="¿Esto manda mensajes solo?">
      Solo el recordatorio de cita, un día antes. Lo demás lo mandas tú: tocas «Escribirle», revisas el mensaje y se
      abre tu WhatsApp con el texto listo. Nadie recibe mensajes en masa y tu número no corre riesgo.
    </HelpTip>
  );
}

const ESTADO_LABEL: Record<ProximoRecordatorio['estado'], string> = {
  enviado: 'Recordatorio enviado',
  pendiente: 'Se manda solo',
  'sin-canal': 'Sin correo ni WhatsApp',
};

// Coral del módulo, en versión que pasa AA: texto oscuro sobre pastel.
const CORAL = { suave: '#FFF1EB', chip: '#FDE2D6', fuerte: '#A8361A' };
const MIEL = { chip: '#FFF0C2', fuerte: '#7A5200' };

const CLAVE_LS = 'bicho:regresan:escritas';
const VIGENCIA_MS = 30 * 24 * 3600 * 1000;

function leerEscritas(): Record<string, number> {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_LS) ?? '{}') as Record<string, number>;
    const ahora = Date.now();
    return Object.fromEntries(Object.entries(crudo).filter(([, t]) => ahora - t < VIGENCIA_MS));
  } catch {
    return {};
  }
}

function TarjetaClienta({
  fila,
  boton,
  asunto,
  demo,
  tono,
  escrita,
  onEscribir,
}: {
  fila: FilaRegresan;
  boton: string;
  asunto: string;
  demo: boolean;
  tono: { chip: string; fuerte: string };
  escrita: boolean;
  onEscribir: () => void;
}) {
  const [editar, setEditar] = useState(false);
  const [texto, setTexto] = useState(fila.mensaje);
  const wa = waLink(fila.phone, texto);
  const [cuando, ...resto] = fila.detalle.split(' · ');
  const que = resto.join(' · ');

  const abrir = (e: React.MouseEvent) => {
    if (demo) {
      e.preventDefault();
      toast('En la demo no se abre WhatsApp. Así se marca cuando ya le escribiste.');
    }
    onEscribir();
  };

  const grande =
    'ui-btn inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[16px] font-semibold transition active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2';

  return (
    <li
      className={`flex flex-col gap-4 rounded-3xl border bg-surface p-4 shadow-sm transition-colors sm:p-5 ${escrita ? 'border-success/40' : 'border-border'}`}
    >
      <div className="flex items-start gap-3">
        <Avatar nombre={fila.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold leading-snug text-ink">{fila.name}</p>
          {que && <p className="line-clamp-2 text-[15px] leading-snug text-muted">{que}</p>}
        </div>
        {escrita && <CheckListo />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-3 py-1 text-[14px] font-semibold" style={{ background: tono.chip, color: tono.fuerte }}>
          {cuando}
        </span>
        {escrita && <span className="text-[14px] font-medium text-success">Ya le escribiste</span>}
      </div>

      {editar && (
        <div className="animate-fade-in">
          <Label htmlFor={`msg-${fila.key}`}>Tu mensaje (cámbialo si quieres)</Label>
          <textarea
            id={`msg-${fila.key}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            className="w-full rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-[16px] leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" onClick={abrir} className={`${grande} bg-primary text-[rgb(var(--color-cta-fg))] shadow-sm hover:brightness-110`}>
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            {boton} por WhatsApp
          </a>
        ) : fila.email ? (
          <a
            href={demo ? '#' : mailtoLink(fila.email, asunto, texto)}
            onClick={abrir}
            className={`${grande} bg-primary text-[rgb(var(--color-cta-fg))] shadow-sm hover:brightness-110`}
          >
            <Mail className="h-5 w-5" aria-hidden="true" />
            {boton} por correo
          </a>
        ) : (
          <p className="rounded-2xl bg-ink/[0.04] px-4 py-3 text-center text-[15px] text-muted">No dejó teléfono ni correo</p>
        )}
        {(wa || fila.email) && (
          <button
            type="button"
            onClick={() => setEditar((v) => !v)}
            aria-expanded={editar}
            className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-2xl text-[15px] font-medium text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            {editar ? 'Listo, ya lo cambié' : 'Ver o cambiar el mensaje'}
          </button>
        )}
      </div>
    </li>
  );
}

function Vacio(props: React.ComponentProps<typeof EmptyState>) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface px-5 [&>div]:py-10">
      <EmptyState {...props} />
    </div>
  );
}

export function RegresanBoard({
  negocio,
  semanas,
  canal,
  proximos,
  inactivas,
  resenas,
  tieneLinkResena,
  demo = false,
  ajustes,
}: {
  negocio: string;
  semanas: number;
  canal: 'whatsapp' | 'correo';
  proximos: ProximoRecordatorio[];
  inactivas: FilaRegresan[];
  resenas: FilaRegresan[];
  tieneLinkResena: boolean;
  demo?: boolean;
  ajustes?: React.ReactNode;
}) {
  const [escritas, setEscritas] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!demo) setEscritas(leerEscritas());
  }, [demo]);
  function marcar(key: string) {
    setEscritas((prev) => {
      const sig = { ...prev, [key]: Date.now() };
      try {
        if (!demo) localStorage.setItem(CLAVE_LS, JSON.stringify(sig));
      } catch {
        /* sin almacenamiento: la palomita dura lo que dure la página */
      }
      return sig;
    });
  }
  const n = inactivas.length;
  const yaEscritas = inactivas.filter((f) => escritas[f.key]).length;
  const sem = `${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  const [vista, setVista] = useState<'recuperar' | 'resenas' | 'recordatorios'>('recuperar');

  return (
    <div className="mt-6 flex flex-col gap-8">
      <Pestanas
        etiqueta="Secciones de clientes que regresan"
        actual={vista}
        onCambiar={setVista}
        opciones={[
          { id: 'recuperar', texto: 'Recuperar clientas', cuenta: n },
          { id: 'resenas', texto: 'Reseñas', cuenta: tieneLinkResena ? resenas.length : undefined },
          { id: 'recordatorios', texto: 'Recordatorios', cuenta: proximos.length || undefined },
        ]}
      />

      {vista === 'recuperar' && (
      <section aria-labelledby="regresan-extranan">
        <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl p-5 sm:p-6" style={{ background: CORAL.suave }}>
          <h2 id="regresan-extranan" className="flex items-baseline gap-3">
            <span className="text-[3rem] font-semibold leading-none tabular-nums" style={{ color: CORAL.fuerte }}>
              {n}
            </span>
            <span className="text-[19px] font-semibold leading-tight text-ink">{n === 1 ? 'clienta te extraña' : 'clientas te extrañan'}</span>
          </h2>
          {n > 0 && (
            <span className="flex -space-x-3" aria-hidden="true">
              {inactivas.slice(0, 4).map((f) => (
                <span key={f.key} className="rounded-full ring-4 ring-[#FFF1EB]">
                  <Avatar nombre={f.name} />
                </span>
              ))}
            </span>
          )}
          <p className="basis-full text-[15px] leading-relaxed text-ink/80" aria-live="polite">
            {n === 0
              ? `Nadie lleva más de ${sem} sin venir. ¡Tus clientas regresan solas!`
              : yaEscritas > 0
                ? `Ya les escribiste a ${yaEscritas} de ${n}. Un mensaje a tiempo es la venta más barata del día.`
                : `Llevan más de ${sem} sin venir y no tienen cita. Un mensaje a tiempo es la venta más barata del día.`}
          </p>
        </div>

        {n === 0 ? (
          <Vacio
            icon={UserRoundX}
            title="Aquí aparecerán las que no han vuelto"
            description={`Cuando una clienta pase ${sem} sin agendar, sale aquí con un mensaje listo para mandarle.`}
            why="Recuperar a una clienta que ya te conoce cuesta mucho menos que conseguir una nueva."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {inactivas.map((f) => (
              <TarjetaClienta
                key={f.key}
                fila={f}
                boton="Escribirle"
                asunto={`Te extrañamos en ${negocio}`}
                demo={demo}
                tono={CORAL}
                escrita={Boolean(escritas[f.key])}
                onEscribir={() => marcar(f.key)}
              />
            ))}
          </ul>
        )}
      </section>
      )}

      {vista === 'resenas' && (
      <section>
        <h2 className="mb-4 flex items-center gap-1 text-[17px] font-semibold tracking-tight text-ink">
          Quién vino esta semana
          <HelpTip title="¿Por qué pedir reseña?">
            Aquí salen las clientas cuya cita marcaste como «Vino» en los últimos 7 días. Pedirla el mismo día o al
            siguiente es cuando más reseñas se consiguen, y más reseñas te suben en Google Maps.
          </HelpTip>
        </h2>
        {!tieneLinkResena ? (
          <Vacio
            icon={Star}
            title="Falta tu link de reseñas de Google"
            description="Con él, aquí te aparece quién vino esta semana y un mensaje listo para pedirle su reseña."
            why="Más reseñas = sales más arriba cuando alguien busca un salón en Google Maps."
            action={
              ajustes ? (
                <a
                  href="#regresan-resena"
                  className="ui-btn inline-flex min-h-[2.75rem] items-center rounded-full bg-primary px-5 text-[15px] font-semibold text-[rgb(var(--color-cta-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Pegar mi link
                </a>
              ) : undefined
            }
          />
        ) : resenas.length === 0 ? (
          <Vacio
            icon={Star}
            title="Nadie marcado como «Vino» esta semana"
            description="Cuando en tu agenda marques que una clienta vino, aparece aquí con el mensaje listo para pedirle su reseña."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {resenas.map((f) => (
              <TarjetaClienta
                key={f.key}
                fila={f}
                boton="Pedirle reseña"
                asunto={`¿Cómo te fue en ${negocio}?`}
                demo={demo}
                tono={MIEL}
                escrita={Boolean(escritas[f.key])}
                onEscribir={() => marcar(f.key)}
              />
            ))}
          </ul>
        )}
      </section>
      )}

      {vista === 'recordatorios' && (
      <section>
        <div className="flex items-start gap-3 rounded-3xl border border-border bg-surface px-4 py-4 sm:px-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-ink" aria-hidden="true">
            <BellRing className="h-5 w-5" />
          </span>
          <p className="text-[15px] leading-relaxed text-muted">
            Un día antes de cada cita le llega un recordatorio a tu clienta por{' '}
            <span className="font-semibold text-ink">{canal === 'whatsapp' ? 'WhatsApp' : 'correo'}</span>
            {canal === 'correo' && ' (si dejó su correo al reservar)'}. No tienes que hacer nada.
          </p>
        </div>
        {proximos.length === 0 && (
          <p className="mt-3 rounded-3xl border border-dashed border-border px-5 py-6 text-center text-[15px] text-muted">
            No hay citas en las próximas horas. Cuando las haya, aquí ves si ya salió su recordatorio.
          </p>
        )}
        {proximos.length > 0 && (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
            {proximos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
                <Avatar nombre={p.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium text-ink">{p.name}</p>
                  <p className="text-[14px] text-muted">{p.cuando}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold ${
                    p.estado === 'enviado'
                      ? 'bg-success-soft text-success'
                      : p.estado === 'sin-canal'
                        ? 'bg-warning-soft text-warning'
                        : 'bg-ink/[0.06] text-muted'
                  }`}
                >
                  {ESTADO_LABEL[p.estado]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      {ajustes}
    </div>
  );
}

export function AjustesRegresan({
  semanas,
  linkResena,
  onGuardar,
}: {
  semanas: number;
  linkResena: string;
  onGuardar: (input: { semanas: string; linkResena: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ semanas: String(semanas), linkResena });
  const [error, setError] = useState<{ campo: 'semanas' | 'link' | null; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const r = await onGuardar(form).catch(() => ({ ok: false as const, error: 'No se pudo guardar. Revisa tu internet e inténtalo otra vez.' }));
    setGuardando(false);
    if (r.ok) {
      toast('Ajustes guardados');
      router.refresh();
    } else {
      // El error se dice junto al campo que lo causó; lo escrito se queda.
      setError({ campo: /semana/i.test(r.error) ? 'semanas' : /link|https/i.test(r.error) ? 'link' : null, texto: r.error });
      toast(r.error, 'error');
    }
  }

  return (
    <section>
      <SectionHeading title="Ajustes de esta sección" />
      <form onSubmit={guardar} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface px-4 py-5 sm:px-5">
        <FormField
          label="¿Cuántas semanas sin venir para avisarte?"
          hint="Ejemplo: 6. Si alguien pasa ese tiempo sin agendar, aparece arriba en «no han vuelto»."
          error={error?.campo === 'semanas' ? error.texto : null}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={52}
            required
            value={form.semanas}
            onChange={(e) => setForm({ ...form, semanas: e.target.value })}
            className="w-28"
          />
        </FormField>
        <FormField
          label="Tu link de reseñas de Google"
          hint="En tu Perfil de Negocio de Google toca «Pedir reseñas» y copia el link."
          error={error?.campo === 'link' ? error.texto : null}
          optional
        >
          <Input
            id="regresan-resena"
            type="url"
            inputMode="url"
            placeholder="https://g.page/r/…/review"
            value={form.linkResena}
            onChange={(e) => setForm({ ...form, linkResena: e.target.value })}
            className="w-full scroll-mt-24"
          />
        </FormField>
        {error && !error.campo && (
          <p role="alert" className="rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error">
            {error.texto}
          </p>
        )}
        <div>
          <Button type="submit" isLoading={guardando} className="max-sm:w-full">
            {guardando ? 'Guardando…' : 'Guardar ajustes'}
          </Button>
        </div>
      </form>
    </section>
  );
}
