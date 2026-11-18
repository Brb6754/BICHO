'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Gift, Minus, Plus, Stamp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { Avatar, Pestanas } from '@/components/tenant-dash/crecer/ui';
import type { DatosLealtad, Promo, TarjetaFila } from '@/lib/lealtad/datos';
import { promoVigente } from '@/lib/lealtad/tarjeta';
import {
  alternarPromo,
  borrarPromo,
  canjear,
  darTarjeta,
  guardarPromo,
  guardarRegla,
  sumarSello,
} from '@/app/t/[slug]/dashboard/lealtad/actions';

// La pantalla de Lealtad. La misma sirve al panel real y al demo
// (`soloLectura`): en el demo los sellos se ponen en pantalla para que se
// sienta, pero no se guarda nada.
//
// Tres pestañas: Tarjetas (lo de todos los días: ponerle un sello,
// entregar el premio), Promociones y Configuración (la tarjeta de sellos
// visual, que se toca una vez).

export type TarjetaConLinks = TarjetaFila & { url: string; wa: string };

type Resp = { ok: true } | { ok: false; error: string };
type Vista = 'tarjetas' | 'promos' | 'config';

const PREMIOS = ['Tu siguiente visita gratis', '10% de descuento en tu siguiente visita', 'Un tratamiento de regalo'];

const fechaCorta = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function estadoPromo(p: Promo, hoy: string): { label: string; tono: string } {
  if (!p.active) return { label: 'En pausa', tono: 'bg-ink/[0.07] text-muted' };
  if (promoVigente(p, hoy)) return { label: 'Se ve en tu página', tono: 'bg-success-soft text-success' };
  if (p.starts_on > hoy) return { label: 'Empieza pronto', tono: 'bg-info-soft text-info' };
  return { label: 'Ya terminó', tono: 'bg-ink/[0.07] text-muted' };
}

/**
 * Los sellos como en la tarjeta de papel: círculos que se llenan con el
 * color del negocio y el último con el regalo. `nuevo` = el sello recién
 * puesto, que entra con un rebote.
 */
function Sellos({ sellos, requeridos, nuevo, grande }: { sellos: number; requeridos: number; nuevo?: boolean; grande?: boolean }) {
  const caja = grande ? 'h-11 w-11' : requeridos > 12 ? 'h-7 w-7' : 'h-9 w-9';
  const icono = grande ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <span className="flex flex-wrap gap-2" role="img" aria-label={`${sellos} de ${requeridos} sellos`}>
      {Array.from({ length: requeridos }, (_, i) => {
        const lleno = i < sellos;
        const premio = i === requeridos - 1;
        return (
          <span
            key={i}
            aria-hidden="true"
            className={`${caja} flex shrink-0 items-center justify-center rounded-full ${
              lleno
                ? `bg-primary text-[rgb(var(--color-cta-fg))] ${nuevo && i === sellos - 1 ? 'animate-pop-in' : ''}`
                : grande
                  ? 'border-2 border-dashed border-[rgb(var(--color-cta-fg))]/45 text-[rgb(var(--color-cta-fg))]/70'
                  : 'border-2 border-dashed border-ink/20 text-ink/40'
            }`}
          >
            {premio ? <Gift className={icono} /> : lleno ? <Stamp className={icono} /> : null}
          </span>
        );
      })}
    </span>
  );
}

const linkSecundario =
  'inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-2xl px-3 text-[15px] font-medium text-ink ring-1 ring-border transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export function LealtadVista({
  slug,
  negocio,
  datos,
  tarjetas,
  hoy,
  soloLectura = false,
}: {
  slug: string;
  negocio: string;
  datos: DatosLealtad;
  tarjetas: TarjetaConLinks[];
  hoy: string;
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [vista, setVista] = useState<Vista>('tarjetas');

  const [requeridos, setRequeridos] = useState(datos.regla.requeridos);
  const [premio, setPremio] = useState(datos.regla.premio);
  const [contacto, setContacto] = useState('');
  const [promo, setPromo] = useState({ title: '', details: '', code: '', starts_on: hoy, ends_on: hoy });

  // Sellos puestos en pantalla antes de que llegue el dato del servidor
  // (y en la demo, los únicos). Se limpian cuando llegan tarjetas nuevas.
  const [extra, setExtra] = useState<Record<string, number>>({});
  const [sellado, setSellado] = useState<string | null>(null);
  useEffect(() => setExtra({}), [tarjetas]);

  function correr(fn: () => Promise<Resp>, listo: string, despues?: () => void) {
    if (soloLectura) {
      toast('Es una demo: aquí no se guarda nada.');
      return;
    }
    startTransition(async () => {
      const r = await fn().catch(() => ({ ok: false as const, error: 'No se pudo guardar. Revisa tu internet e inténtalo otra vez.' }));
      if (!r.ok) {
        toast(r.error, 'error');
        return;
      }
      toast(listo);
      despues?.();
      router.refresh();
    });
  }

  function ponerSello(t: TarjetaConLinks) {
    setSellado(t.id);
    setExtra((e) => ({ ...e, [t.id]: (e[t.id] ?? 0) + 1 }));
    if (soloLectura) {
      toast(`Sello puesto a ${t.nombre}. En la demo no se guarda.`);
      return;
    }
    startTransition(async () => {
      const r = await sumarSello(slug, t.id).catch(() => ({ ok: false as const, error: 'No se pudo poner el sello. Revisa tu internet.' }));
      if (!r.ok) {
        setExtra((e) => ({ ...e, [t.id]: Math.max(0, (e[t.id] ?? 1) - 1) }));
        toast(r.error, 'error');
        return;
      }
      toast(`Sello puesto a ${t.nombre}`);
      router.refresh();
    });
  }

  const vistas = tarjetas.map((t) => {
    const sellos = Math.min(t.estado.requeridos, t.estado.sellos + (extra[t.id] ?? 0));
    return { t, sellos, completa: t.estado.completa || sellos >= t.estado.requeridos };
  });
  // Las que ya ganaron primero; luego las que están más cerca del premio.
  const ordenadas = [...vistas].sort(
    (a, b) => Number(b.completa) - Number(a.completa) || a.t.estado.requeridos - a.sellos - (b.t.estado.requeridos - b.sellos)
  );
  const listas = vistas.filter((v) => v.completa).length;
  const cerca = vistas.filter((v) => !v.completa && v.t.estado.requeridos - v.sellos === 1).length;
  const regla = `${datos.regla.requeridos} sellos = ${datos.regla.premio.toLowerCase()}`;

  return (
    <div className="mt-6 flex flex-col gap-8">
      <Pestanas
        etiqueta="Secciones de lealtad"
        actual={vista}
        onCambiar={setVista}
        opciones={[
          { id: 'tarjetas', texto: 'Tarjetas', cuenta: tarjetas.length },
          { id: 'promos', texto: 'Promociones', cuenta: datos.promos.length || undefined },
          { id: 'config', texto: 'Configuración' },
        ]}
      />

      {vista === 'tarjetas' && (
        <>
          <section aria-labelledby="lealtad-tarjetas">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 id="lealtad-tarjetas" className="flex items-center gap-1 text-[17px] font-semibold tracking-tight text-ink">
                {regla}
                <HelpTip title="¿Cómo se ganan los sellos?">
                  Cada cita que marcas como «Vino» en tu agenda le suma un sello a esa clienta, sin que hagas nada más. Ella
                  ve su tarjeta en su teléfono con el link que le mandas por WhatsApp. Si se te pasó marcar una, toca
                  «Ponerle un sello».
                </HelpTip>
              </h2>
            </div>

            {(listas > 0 || cerca > 0) && (
              <p className="mb-5 flex flex-wrap gap-2">
                {listas > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3.5 py-2 text-[15px] font-semibold text-success">
                    <Gift className="h-4 w-4" aria-hidden="true" />
                    {listas} {listas === 1 ? 'ya ganó su premio' : 'ya ganaron su premio'}
                  </span>
                )}
                {cerca > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-3.5 py-2 text-[15px] font-medium text-ink">
                    <Stamp className="h-4 w-4" aria-hidden="true" />
                    {cerca} a un sello del premio
                  </span>
                )}
              </p>
            )}

            {tarjetas.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-surface px-5 [&>div]:py-10">
                <EmptyState
                  icon={Stamp}
                  title="Todavía no hay tarjetas"
                  description="La tarjeta se crea sola la primera vez que marcas que una clienta vino. También puedes dársela aquí abajo."
                  why="Una clienta con tarjeta vuelve para completarla, y esta no se pierde en la bolsa."
                />
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {ordenadas.map(({ t, sellos, completa }) => {
                  const faltan = t.estado.requeridos - sellos;
                  return (
                    <li key={t.id} className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
                      <div className="flex items-start gap-3">
                        <Avatar nombre={t.nombre} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[17px] font-semibold leading-snug text-ink">{t.nombre}</p>
                          <p className={`text-[15px] ${completa ? 'font-semibold text-success' : 'text-muted'}`}>
                            {completa
                              ? t.estado.premiosPendientes > 1
                                ? `Ganó ${t.estado.premiosPendientes} premios`
                                : '¡Ganó su premio!'
                              : faltan === 1
                                ? 'Le falta 1 sello'
                                : `Le faltan ${faltan} sellos`}
                          </p>
                        </div>
                      </div>

                      <div key={`${t.id}-${sellos}`} className="rounded-2xl bg-ink/[0.03] p-3">
                        <Sellos sellos={sellos} requeridos={t.estado.requeridos} nuevo={sellado === t.id} />
                      </div>

                      <div className="mt-auto flex flex-col gap-2">
                        {completa ? (
                          <ConfirmForm
                            action={async () => correr(() => canjear(slug, t.id), `Premio entregado a ${t.nombre}`)}
                            confirmTitle={`¿Entregar el premio a ${t.nombre}?`}
                            confirmMessage={`Su tarjeta vuelve a empezar desde cero. Hazlo cuando ya le diste: ${datos.regla.premio.toLowerCase()}.`}
                            confirmLabel="Sí, ya se lo di"
                            dismissLabel="Todavía no"
                            triggerVariant="success"
                            triggerClassName="!min-h-[3.25rem] w-full !rounded-2xl !text-[16px] !font-semibold"
                          >
                            <Gift className="h-5 w-5" aria-hidden="true" /> Entregar premio
                          </ConfirmForm>
                        ) : (
                          <Button
                            type="button"
                            disabled={pendiente && sellado === t.id}
                            onClick={() => ponerSello(t)}
                            className="!min-h-[3.25rem] w-full !rounded-2xl !text-[16px] !font-semibold"
                          >
                            <Stamp className="h-5 w-5" aria-hidden="true" /> Ponerle un sello
                          </Button>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <a href={t.wa} target="_blank" rel="noreferrer" className={linkSecundario}>
                            Compartir tarjeta
                          </a>
                          <a href={t.url} target="_blank" rel="noreferrer" className={linkSecundario}>
                            <ExternalLink className="h-4 w-4 text-muted" aria-hidden="true" /> Ver como ella
                          </a>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {datos.sinTarjeta.length > 0 && (
              <form
                className="mt-5 flex flex-wrap items-end gap-2 rounded-3xl border border-border bg-surface p-4 sm:p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (contacto) correr(() => darTarjeta(slug, contacto), 'Tarjeta creada', () => setContacto(''));
                }}
              >
                <FormField label="Darle tarjeta a una clienta" className="min-w-0 flex-1 basis-56">
                  <Select value={contacto} onChange={(e) => setContacto(e.target.value)} className="w-full">
                    <option value="">Elige a quién…</option>
                    {datos.sinTarjeta.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <Button type="submit" variant="outline" disabled={!contacto || pendiente} className="max-sm:w-full">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Dar tarjeta
                </Button>
              </form>
            )}
          </section>

          <section>
            <SectionHeading title="Premios entregados" meta={datos.canjes.length ? 'Los últimos 20' : undefined} />
            {datos.canjes.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-border px-5 py-6 text-center text-[15px] text-muted">
                Cuando entregues el primer premio, queda anotado aquí.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
                {datos.canjes.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <Avatar nombre={c.nombre} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] text-ink">{c.nombre}</p>
                      <p className="text-[14px] text-muted">
                        {c.premio} · {new Date(c.cuando).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {vista === 'promos' && (
        <section aria-labelledby="lealtad-promos">
          <h2 id="lealtad-promos" className="mb-4 flex items-center gap-1 text-[17px] font-semibold tracking-tight text-ink">
            Promociones con fecha
            <HelpTip title="¿Dónde salen las promociones?">
              En tu página de reservas, solo entre las fechas que elijas. Al terminar desaparecen solas. Si quieres quitarla
              un tiempo, ponla en pausa en vez de borrarla.
            </HelpTip>
          </h2>

          {datos.promos.length > 0 && (
            <ul className="mb-5 grid gap-3 sm:grid-cols-2">
              {datos.promos.map((p) => {
                const e = estadoPromo(p, hoy);
                return (
                  <li key={p.id} className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4 sm:p-5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px] font-semibold leading-snug text-ink">{p.title}</p>
                        <p className="mt-0.5 text-[14px] text-muted">
                          Del {fechaCorta(p.starts_on)} al {fechaCorta(p.ends_on)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold ${e.tono}`}>{e.label}</span>
                    </div>
                    {p.code && (
                      <p className="self-start rounded-xl border-2 border-dashed border-border px-3 py-1.5 text-[15px] font-semibold tracking-wide text-ink">
                        Código: {p.code}
                      </p>
                    )}
                    <div className="mt-auto flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pendiente}
                        className="flex-1"
                        onClick={() =>
                          correr(() => alternarPromo(slug, p.id, !p.active), p.active ? 'Promoción en pausa' : 'Promoción activa otra vez')
                        }
                      >
                        {p.active ? 'Pausar' : 'Reanudar'}
                      </Button>
                      <ConfirmForm
                        action={async () => correr(() => borrarPromo(slug, p.id), 'Promoción borrada')}
                        confirmTitle={`¿Borrar «${p.title}»?`}
                        confirmMessage="Deja de salir en tu página y ya no la verás aquí. Si solo quieres quitarla un tiempo, mejor ponla en pausa."
                        confirmLabel="Borrar promoción"
                        dismissLabel="No, conservarla"
                        triggerVariant="ghost"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" /> Borrar
                      </ConfirmForm>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form
            className="grid gap-4 rounded-3xl border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              correr(
                () => guardarPromo(slug, promo),
                'Promoción agregada',
                () => setPromo({ title: '', details: '', code: '', starts_on: hoy, ends_on: hoy })
              );
            }}
          >
            <p className="text-[17px] font-semibold text-ink sm:col-span-2">Nueva promoción</p>
            <FormField label="¿Qué promoción?" className="sm:col-span-2">
              <Input
                placeholder="Ej. Martes 20% en pedicure"
                maxLength={80}
                required
                value={promo.title}
                onChange={(e) => setPromo({ ...promo, title: e.target.value })}
                className="w-full"
              />
            </FormField>
            <FormField label="Detalle" optional className="sm:col-span-2">
              <Input
                placeholder="Ej. Menciónala al llegar"
                maxLength={240}
                value={promo.details}
                onChange={(e) => setPromo({ ...promo, details: e.target.value })}
                className="w-full"
              />
            </FormField>
            <FormField label="Empieza">
              <Input type="date" required value={promo.starts_on} onChange={(e) => setPromo({ ...promo, starts_on: e.target.value })} className="w-full" />
            </FormField>
            <FormField label="Termina">
              <Input
                type="date"
                required
                min={promo.starts_on}
                value={promo.ends_on}
                onChange={(e) => setPromo({ ...promo, ends_on: e.target.value })}
                className="w-full"
              />
            </FormField>
            <FormField label="Código" optional hint="Una palabra que tu clienta dice al llegar. Ej. MARTES20">
              <Input maxLength={30} value={promo.code} onChange={(e) => setPromo({ ...promo, code: e.target.value.toUpperCase() })} className="w-full" />
            </FormField>
            <div className="flex items-end">
              <Button type="submit" isLoading={pendiente} className="max-sm:w-full">
                Agregar promoción
              </Button>
            </div>
          </form>
        </section>
      )}

      {vista === 'config' && (
        <section aria-labelledby="lealtad-config" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          {/* La tarjeta como la de papel, en vivo con lo que eliges. */}
          <div className="lg:sticky lg:top-6 lg:order-2">
            <p className="mb-2 text-[15px] font-medium text-muted">Así la ve tu clienta</p>
            <div className="rounded-[1.75rem] bg-primary p-5 text-[rgb(var(--color-cta-fg))] shadow-lg sm:p-6">
              <p className="truncate text-[22px] font-semibold leading-tight">{negocio}</p>
              <p className="mt-0.5 text-[15px] opacity-85">Tu tarjeta de sellos</p>
              <div className="mt-5">
                <Sellos sellos={Math.min(3, requeridos - 1)} requeridos={requeridos} grande />
              </div>
              <p className="mt-5 text-[16px] font-medium leading-snug">
                Junta {requeridos} sellos y gana: <span className="font-semibold">{premio.trim().toLowerCase() || '…'}</span>
              </p>
            </div>
          </div>

          <form
            className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-4 sm:p-6 lg:order-1"
            onSubmit={(e) => {
              e.preventDefault();
              correr(() => guardarRegla(slug, requeridos, premio), 'Tarjeta guardada');
            }}
          >
            <h2 id="lealtad-config" className="text-[17px] font-semibold tracking-tight text-ink">
              Tu tarjeta de sellos
            </h2>

            <fieldset>
              <legend className="mb-3 text-[15px] font-medium text-ink">¿Cuántos sellos para ganar?</legend>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRequeridos((n) => Math.max(2, n - 1))}
                  aria-label="Un sello menos"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border text-ink transition active:scale-95 hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Minus className="h-5 w-5" aria-hidden="true" />
                </button>
                <output className="min-w-[4.5rem] text-center text-[2rem] font-semibold tabular-nums text-ink" aria-live="polite">
                  {requeridos}
                </output>
                <button
                  type="button"
                  onClick={() => setRequeridos((n) => Math.min(30, n + 1))}
                  aria-label="Un sello más"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border text-ink transition active:scale-95 hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <input
                type="range"
                min={2}
                max={15}
                value={Math.min(requeridos, 15)}
                onChange={(e) => setRequeridos(Number(e.target.value))}
                aria-label="Sellos para ganar"
                className="mt-4 h-11 w-full cursor-pointer accent-primary"
              />
              <p className="text-[14px] text-muted">Lo más común en salones: entre 6 y 10.</p>
            </fieldset>

            <fieldset>
              <legend className="mb-3 text-[15px] font-medium text-ink">¿Qué gana?</legend>
              <div className="flex flex-wrap gap-2">
                {PREMIOS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPremio(p)}
                    aria-pressed={premio === p}
                    className={`min-h-[2.75rem] rounded-full px-4 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      premio === p ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : 'bg-ink/[0.05] text-ink hover:bg-ink/[0.09]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <FormField label="O escríbelo a tu manera" className="mt-4">
                <Input maxLength={120} required value={premio} onChange={(e) => setPremio(e.target.value)} className="w-full" />
              </FormField>
            </fieldset>

            <Button type="submit" isLoading={pendiente} className="!min-h-[3.25rem] max-sm:w-full !text-[16px]">
              Guardar tarjeta
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
