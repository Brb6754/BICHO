'use client';

import { useState, useTransition } from 'react';
import { CalendarOff, Copy, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { correrConAviso } from '@/components/tenant-dash/ui/ActionForm';
import { addDaysKey, formatTime, instantFromLocal } from '@/lib/dates/tenantTime';
import { Avatar, CAMPO, Campo, colorPara } from './visual';
import { SEMANA, hora, horas, reglaDe, resumirHorario } from './horario';

// EL HORARIO COMO SEMANA QUE SE TOCA.
//
// Arriba, a quién estás viendo (una persona a la vez: tres semanas
// completas una debajo de otra eran un muro). Debajo, sus siete días como
// barras sobre una regla de horas: lo abierto en el color de la persona,
// lo bloqueado de esta semana en ámbar rayado. Tocar una barra abre su
// hoja: cambiar las horas, copiarlas a los demás días o quitarlas. Tocar
// un día cerrado lo abre.
//
// Sin acciones es la demo: todo se toca igual y al guardar confirma
// "Ejemplo: …" sin escribir nada.

export type FranjaVista = { id?: string; resource_id: string; day_of_week: number; starts_at: string; ends_at: string };
export type BloqueoVista = { id: string; resource_id: string | null; starts_at: string; ends_at: string; reason: string | null };

type Acciones = {
  slug: string;
  crear: (slug: string, fd: FormData) => Promise<void>;
  /** Cambia las horas de una franja sin quitarla antes (crea y luego borra en el servidor). */
  cambiar: (id: string, slug: string, fd: FormData) => Promise<void>;
  quitar: (id: string, slug: string) => Promise<void>;
  quitarBloqueo: (id: string, slug: string) => Promise<void>;
};

type Hoja =
  | { tipo: 'franja'; dow: number; franja: FranjaVista; delDia: FranjaVista[] }
  | { tipo: 'cerrado'; dow: number }
  | { tipo: 'bloqueo'; bloqueo: BloqueoVista; texto: string };

const pct = (h: number, r: { desde: number; hasta: number }) => ((Math.min(Math.max(h, r.desde), r.hasta) - r.desde) / (r.hasta - r.desde)) * 100;

export function SemanaVisual({
  personas,
  franjas,
  bloqueos = [],
  timezone,
  hoyKey,
  acciones,
}: {
  personas: { id: string; name: string; active?: boolean }[];
  franjas: FranjaVista[];
  bloqueos?: BloqueoVista[];
  timezone: string | null;
  /** YYYY-MM-DD de hoy en la zona del negocio. */
  hoyKey: string;
  acciones?: Acciones;
}) {
  const [personaId, setPersonaId] = useState(personas[0]?.id);
  const [hoja, setHoja] = useState<Hoja | null>(null);
  const persona = personas.find((p) => p.id === personaId) ?? personas[0];
  if (!persona) return null;

  const suyas = franjas.filter((f) => f.resource_id === persona.id);
  const regla = reglaDe(franjas);
  const { bg, fg } = colorPara(persona.name);

  // Los siete días de ESTA semana (lunes a domingo), con fecha: los bloqueos son de días concretos.
  const [y, m, d] = hoyKey.split('-').map(Number);
  const dowHoy = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  const lunes = addDaysKey(hoyKey, -((dowHoy + 6) % 7));
  const dias = SEMANA.map((s, i) => ({ ...s, key: addDaysKey(lunes, i) }));

  function bloqueosDe(key: string) {
    const ini = new Date(instantFromLocal(key, '00:00', timezone)).getTime();
    const fin = new Date(instantFromLocal(addDaysKey(key, 1), '00:00', timezone)).getTime();
    return bloqueos
      .filter((b) => (b.resource_id === null || b.resource_id === persona.id) && new Date(b.starts_at).getTime() < fin && new Date(b.ends_at).getTime() > ini)
      .map((b) => {
        const a = Math.max(new Date(b.starts_at).getTime(), ini);
        const z = Math.min(new Date(b.ends_at).getTime(), fin);
        const desde = horas(formatTime(new Date(a).toISOString(), timezone));
        const hasta = z >= fin ? 24 : horas(formatTime(new Date(z).toISOString(), timezone));
        const todoElDia = desde === 0 && hasta === 24;
        return { b, desde, hasta, texto: todoElDia ? 'Todo el día' : `${hora(formatTime(new Date(a).toISOString(), timezone))}–${hasta === 24 ? '24:00' : hora(formatTime(new Date(z).toISOString(), timezone))}` };
      });
  }

  const marcas = Array.from({ length: regla.hasta - regla.desde + 1 }, (_, i) => regla.desde + i);
  const paso = regla.hasta - regla.desde > 8 ? 3 : 2;

  return (
    <div>
      {personas.length > 1 && (
        <div role="tablist" aria-label="¿De quién es el horario?" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {personas.map((p) => {
            const activa = p.id === persona.id;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setPersonaId(p.id)}
                className={`flex min-h-14 shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-[16px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  activa ? 'bg-ink text-white' : 'border border-border bg-surface text-ink hover:bg-ink/[0.04]'
                }`}
              >
                <Avatar nombre={p.name} tamano="chico" />
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      <section aria-label={`Horario de ${persona.name}`} className="mt-4 rounded-3xl border border-border bg-surface p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[19px] font-semibold tracking-tight text-ink">
            {persona.name}
            {persona.active === false && <span className="ml-2 text-[14px] font-normal text-muted">(oculto de tu página)</span>}
          </h2>
          <p className="text-[15px] text-muted">{resumirHorario(suyas)}</p>
        </div>

        {/* La regla de horas, alineada con las barras. */}
        <div className="mt-5 grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3" aria-hidden="true">
          <span />
          <div className="relative h-5 text-[13px] tabular-nums text-muted">
            {marcas
              .filter((h) => (h - regla.desde) % paso === 0)
              .map((h) => (
                <span key={h} className="absolute -translate-x-1/2 first:translate-x-0" style={{ left: `${pct(h, regla)}%` }}>
                  {h}
                </span>
              ))}
          </div>
        </div>

        <ul className="mt-1 flex flex-col gap-1.5">
          {dias.map((dia) => {
            const delDia = suyas.filter((f) => f.day_of_week === dia.dow).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
            const bloq = bloqueosDe(dia.key);
            const esHoy = dia.key === hoyKey;
            return (
              <li key={dia.dow} className="grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-x-3">
                <span className={`text-[15px] leading-tight ${esHoy ? 'font-bold text-ink' : 'font-medium text-ink'}`}>
                  {dia.corto}
                  <span className="block text-[13px] font-normal tabular-nums text-muted">{esHoy ? 'Hoy' : Number(dia.key.slice(8))}</span>
                </span>
                <div className="relative h-14 rounded-2xl bg-ink/[0.04]">
                  {/* Líneas de cada hora. */}
                  {marcas.slice(1, -1).map((h) => (
                    <span key={h} aria-hidden="true" className="absolute inset-y-2 w-px bg-ink/[0.07]" style={{ left: `${pct(h, regla)}%` }} />
                  ))}
                  {delDia.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setHoja({ tipo: 'cerrado', dow: dia.dow })}
                      className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-strong text-[15px] font-medium text-muted transition-colors hover:bg-ink/[0.03] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Cerrado
                      <span className="text-[13px] underline underline-offset-4">Abrir</span>
                    </button>
                  )}
                  {delDia.map((f, i) => {
                    const izq = pct(horas(f.starts_at), regla);
                    const ancho = Math.max(pct(horas(f.ends_at), regla) - izq, 6);
                    return (
                      <button
                        key={f.id ?? i}
                        type="button"
                        onClick={() => setHoja({ tipo: 'franja', dow: dia.dow, franja: f, delDia })}
                        aria-label={`${dia.largo}: de ${hora(f.starts_at)} a ${hora(f.ends_at)}. Tocar para cambiar`}
                        className="animate-fade-in absolute inset-y-1 flex items-center justify-center overflow-hidden rounded-xl px-1.5 text-[14px] font-semibold tabular-nums shadow-sm transition-transform duration-150 active:scale-[0.97] motion-reduce:animate-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                        style={{ left: `${izq}%`, width: `${ancho}%`, background: bg, color: fg }}
                      >
                        <span className="truncate">
                          {hora(f.starts_at)}–{hora(f.ends_at)}
                        </span>
                      </button>
                    );
                  })}
                  {bloq.map(({ b, desde, hasta, texto }) => {
                    const izq = pct(desde, regla);
                    const ancho = Math.max(pct(hasta, regla) - izq, 8);
                    return (
                      <button
                        key={b.id + dia.key}
                        type="button"
                        onClick={() => setHoja({ tipo: 'bloqueo', bloqueo: b, texto: `${dia.largo} ${Number(dia.key.slice(8))}, ${texto.toLowerCase()}` })}
                        aria-label={`Bloqueado el ${dia.largo.toLowerCase()}: ${texto}${b.reason ? ', ' + b.reason : ''}`}
                        className="absolute inset-y-1 z-10 flex items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-warning/60 px-1.5 text-[13px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                        style={{
                          left: `${izq}%`,
                          width: `${ancho}%`,
                          background: 'repeating-linear-gradient(-45deg, #FEF3C7, #FEF3C7 6px, #FDE68A 6px, #FDE68A 12px)',
                        }}
                      >
                        <CalendarOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{b.reason || 'Bloqueado'}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-5 rounded" style={{ background: bg }} aria-hidden="true" />
            Abierto, toca para cambiar
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-5 rounded border border-warning/60" style={{ background: 'repeating-linear-gradient(-45deg, #FEF3C7, #FEF3C7 3px, #FDE68A 3px, #FDE68A 6px)' }} aria-hidden="true" />
            Bloqueado esta semana
          </span>
        </p>
      </section>

      <HojaSemana hoja={hoja} persona={persona} acciones={acciones} cerrar={() => setHoja(null)} />
    </div>
  );
}

function HojaSemana({
  hoja,
  persona,
  acciones,
  cerrar,
}: {
  hoja: Hoja | null;
  persona: { id: string; name: string };
  acciones?: Acciones;
  cerrar: () => void;
}) {
  const [pendiente, start] = useTransition();
  const [seguro, setSeguro] = useState(false);
  if (!hoja) return null;
  const salir = () => {
    setSeguro(false);
    cerrar();
  };

  const largo = (dow: number) => SEMANA.find((s) => s.dow === dow)!.largo;

  // Corre lo que haga falta y avisa; en la demo solo confirma el ejemplo.
  function correr(exito: string, trabajo?: () => Promise<void>) {
    if (!acciones || !trabajo) {
      toast(`Ejemplo: ${exito}. En la demo no se guarda nada.`);
      salir();
      return;
    }
    start(async () => {
      if (await correrConAviso(trabajo, new FormData(), exito)) salir();
    });
  }

  function formHorario(resource: string, dias: number[], desde: string, hasta: string) {
    const fd = new FormData();
    fd.set('resource_id', resource);
    for (const d of dias) fd.append('day_of_week', String(d));
    fd.set('starts_at', desde);
    fd.set('ends_at', hasta);
    return fd;
  }

  function leerHoras(e: React.FormEvent<HTMLFormElement>): [string, string] | null {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const desde = String(fd.get('starts_at') ?? '');
    const hasta = String(fd.get('ends_at') ?? '');
    // Se revisa aquí, antes de mandar nada al servidor.
    if (!desde || !hasta || desde >= hasta) {
      toast('La hora de cierre tiene que ser después de la de apertura, por ejemplo de 9:00 a 18:00.', 'error');
      return null;
    }
    return [desde, hasta];
  }

  if (hoja.tipo === 'bloqueo') {
    const b = hoja.bloqueo;
    return (
      <Modal open onClose={salir} title="Rato bloqueado">
        <p className="text-[17px] font-semibold text-ink first-letter:uppercase">{hoja.texto}</p>
        <p className="mt-1 text-[15px] text-muted">
          {b.resource_id ? `Solo ${persona.name}` : 'Todo el negocio'}
          {b.reason ? ` · ${b.reason}` : ''}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">Mientras esté bloqueado, nadie puede reservar esas horas en tu página.</p>
        <Button
          type="button"
          variant="outline"
          isLoading={pendiente}
          className="mt-5 min-h-12 w-full !text-[17px]"
          onClick={() => correr('bloqueo quitado', acciones && (() => acciones.quitarBloqueo(b.id, acciones.slug)))}
        >
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          Quitar el bloqueo
        </Button>
      </Modal>
    );
  }

  if (hoja.tipo === 'cerrado') {
    return (
      <Modal open onClose={salir} title={`Abrir el ${largo(hoja.dow).toLowerCase()}`}>
        <form
          className="flex flex-col gap-4 pt-1"
          onSubmit={(e) => {
            const h = leerHoras(e);
            if (!h) return;
            correr(`${persona.name} ya abre el ${largo(hoja.dow).toLowerCase()}`, acciones && (() => acciones.crear(acciones.slug, formHorario(persona.id, [hoja.dow], h[0], h[1]))));
          }}
        >
          <p className="text-[15px] text-muted">
            {persona.name} va a recibir citas todos los {largo(hoja.dow).toLowerCase()}s.
          </p>
          <HorasCampos desde="09:00" hasta="18:00" />
          <Button type="submit" isLoading={pendiente} className="min-h-12 w-full !text-[17px] font-semibold">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Abrir este día
          </Button>
        </form>
      </Modal>
    );
  }

  const { franja: f, dow, delDia } = hoja;
  const dia = largo(dow).toLowerCase();
  return (
    <Modal open onClose={salir} title={`${largo(dow)} de ${persona.name}`}>
      <form
        className="flex flex-col gap-4 pt-1"
        onSubmit={(e) => {
          const h = leerHoras(e);
          if (!h) return;
          correr(
            'Horario guardado',
            acciones &&
              (async () => {
                const fd = formHorario(persona.id, [dow], h[0], h[1]);
                if (f.id) await acciones.cambiar(f.id, acciones.slug, fd);
                else await acciones.crear(acciones.slug, fd);
              })
          );
        }}
      >
        <p className="text-[15px] text-muted">Todos los {dia}s. Cambia las horas y guarda.</p>
        <HorasCampos desde={f.starts_at.slice(0, 5)} hasta={f.ends_at.slice(0, 5)} />
        <Button type="submit" isLoading={pendiente} className="min-h-12 w-full !text-[17px] font-semibold">
          Guardar horario
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-[15px] font-semibold text-ink">Copiar estas horas</p>
        <p className="mt-0.5 text-[14px] text-muted">
          {delDia.map((x) => `${hora(x.starts_at)}–${hora(x.ends_at)}`).join(' y ')} a otros días. Se suman a lo que ya tengan.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { label: 'A todos los días', dias: [1, 2, 3, 4, 5, 6, 0] },
            { label: 'De lunes a viernes', dias: [1, 2, 3, 4, 5] },
          ].map((op) => (
            <Button
              key={op.label}
              type="button"
              variant="outline"
              isLoading={pendiente}
              className="min-h-12 !text-[15px]"
              onClick={() =>
                correr(
                  `Horas copiadas ${op.label.toLowerCase()}`,
                  acciones &&
                    (async () => {
                      for (const x of delDia) {
                        await acciones.crear(acciones.slug, formHorario(persona.id, op.dias, x.starts_at.slice(0, 5), x.ends_at.slice(0, 5)));
                      }
                    })
                )
              }
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {op.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Quitar pide un segundo toque, aquí mismo: otra ventana encima de la hoja confunde. */}
      {seguro ? (
        <div className="mt-5 rounded-2xl bg-error-soft p-4">
          <p className="text-[15px] text-ink">
            {persona.name} ya no recibirá citas el {dia} de {hora(f.starts_at)} a {hora(f.ends_at)}. Las citas que ya tenía siguen en pie.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="min-h-12 !text-[15px]" onClick={() => setSeguro(false)}>
              No, dejarlo
            </Button>
            <Button
              type="button"
              variant="danger"
              isLoading={pendiente}
              className="min-h-12 !bg-error !text-[15px] !text-white"
              onClick={() => correr('Horario quitado', acciones && f.id ? () => acciones.quitar(f.id!, acciones.slug) : undefined)}
            >
              Sí, quitar
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="danger" className="mt-5 min-h-12 w-full !text-[15px]" onClick={() => setSeguro(true)}>
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          Quitar este horario
        </Button>
      )}
    </Modal>
  );
}

function HorasCampos({ desde, hasta }: { desde: string; hasta: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Campo label="Abre a las">
        <input type="time" name="starts_at" required defaultValue={desde} className={CAMPO} />
      </Campo>
      <Campo label="Cierra a las">
        <input type="time" name="ends_at" required defaultValue={hasta} className={CAMPO} />
      </Campo>
    </div>
  );
}
