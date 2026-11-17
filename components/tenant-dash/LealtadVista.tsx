'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ExternalLink, Gift, MessageCircle, Plus, Stamp, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
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
// (`soloLectura`): en el demo los botones se ven pero no guardan nada.
//
// Orden pensado para el día a día: primero cómo van las tarjetas (quién
// ya ganó, quién está cerca), luego las promociones, y la regla de la
// tarjeta (que se toca una vez) plegada al final.

export type TarjetaConLinks = TarjetaFila & { url: string; wa: string };

type Resp = { ok: true } | { ok: false; error: string };

const PREMIOS = ['Tu siguiente visita gratis', '10% de descuento en tu siguiente visita'];

const fechaCorta = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function estadoPromo(p: Promo, hoy: string): { label: string; tono: string } {
  if (!p.active) return { label: 'En pausa', tono: 'bg-ink/[0.07] text-muted' };
  if (promoVigente(p, hoy)) return { label: 'Se ve en tu página', tono: 'bg-success-soft text-success' };
  if (p.starts_on > hoy) return { label: 'Empieza pronto', tono: 'bg-info-soft text-info' };
  return { label: 'Ya terminó', tono: 'bg-ink/[0.07] text-muted' };
}

function Sellos({ sellos, requeridos }: { sellos: number; requeridos: number }) {
  return (
    <span className="flex flex-wrap gap-1.5" aria-label={`${sellos} de ${requeridos} sellos`}>
      {Array.from({ length: requeridos }, (_, i) => (
        <span
          key={i}
          className={`h-3.5 w-3.5 rounded-full ${i < sellos ? 'bg-primary' : 'bg-ink/[0.1]'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

const PLEGABLE =
  'flex min-h-[2.75rem] cursor-pointer list-none items-center gap-3 rounded-2xl px-1 text-[15px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden';

export function LealtadVista({
  slug,
  datos,
  tarjetas,
  hoy,
  soloLectura = false,
}: {
  slug: string;
  datos: DatosLealtad;
  tarjetas: TarjetaConLinks[];
  hoy: string;
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [requeridos, setRequeridos] = useState(String(datos.regla.requeridos));
  const [premio, setPremio] = useState(datos.regla.premio);
  const [contacto, setContacto] = useState('');
  const [promo, setPromo] = useState({ title: '', details: '', code: '', starts_on: hoy, ends_on: hoy });

  function correr(fn: () => Promise<Resp>, listo: string, despues?: () => void) {
    if (soloLectura) {
      toast('Es una demo: aquí no se guarda nada.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await fn().catch(() => ({ ok: false as const, error: 'No se pudo guardar. Revisa tu internet e inténtalo otra vez.' }));
      if (!r.ok) {
        setError(r.error);
        toast(r.error, 'error');
        return;
      }
      toast(listo);
      despues?.();
      router.refresh();
    });
  }

  // Las que ya ganaron primero; luego las que están más cerca del premio.
  const ordenadas = [...tarjetas].sort(
    (a, b) =>
      Number(b.estado.completa) - Number(a.estado.completa) ||
      a.estado.requeridos - a.estado.sellos - (b.estado.requeridos - b.estado.sellos)
  );
  const listas = tarjetas.filter((t) => t.estado.completa).length;
  const cerca = tarjetas.filter((t) => !t.estado.completa && t.estado.requeridos - t.estado.sellos === 1).length;

  return (
    <div className="mt-8 flex flex-col gap-12">
      {error && (
        <p role="alert" className="rounded-2xl bg-error-soft px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {/* ── Cómo van las tarjetas ── */}
      <section>
        <SectionHeading
          title="Tarjetas de tus clientas"
          meta={tarjetas.length || undefined}
        />
        <div className="-mt-1 mb-4 flex flex-wrap items-center gap-x-1 text-[15px] text-muted">
          <span>
            Con <span className="font-semibold text-ink">{datos.regla.requeridos} sellos</span> ganan:{' '}
            <span className="font-semibold text-ink">{datos.regla.premio.toLowerCase()}</span>.
          </span>
          <HelpTip title="¿Cómo se ganan los sellos?">
            Cada cita que marcas como «atendida» en tu agenda le suma un sello a esa clienta, sin que hagas nada más. Ella
            ve su tarjeta en su teléfono con el link que le mandas por WhatsApp. Si se te pasó marcar una, usa «+1 sello».
          </HelpTip>
        </div>

        {tarjetas.length > 0 && (listas > 0 || cerca > 0) && (
          <p className="mb-4 flex flex-wrap gap-2">
            {listas > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-sm font-semibold text-success">
                <Gift className="h-4 w-4" aria-hidden="true" />
                {listas} {listas === 1 ? 'ya ganó su premio' : 'ya ganaron su premio'}
              </span>
            )}
            {cerca > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-3 py-1.5 text-sm font-medium text-ink">
                <Stamp className="h-4 w-4" aria-hidden="true" />
                {cerca} a un sello del premio
              </span>
            )}
          </p>
        )}

        {tarjetas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-5 [&>div]:py-10">
            <EmptyState
              icon={Stamp}
              title="Todavía no hay tarjetas"
              description="La tarjeta se crea sola la primera vez que marcas una cita como atendida. También puedes dársela a una clienta aquí abajo."
              why="Una clienta con tarjeta vuelve para completarla: es la tarjeta de sellos de papel, pero no se pierde."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {ordenadas.map((t) => {
              const faltan = t.estado.requeridos - t.estado.sellos;
              return (
                <li key={t.id} className="flex flex-col gap-3 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{t.nombre}</p>
                    {t.estado.completa ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[13px] font-semibold text-success">
                        <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                        {t.estado.premiosPendientes > 1 ? `${t.estado.premiosPendientes} premios ganados` : 'Ganó su premio'}
                      </span>
                    ) : (
                      <span className="text-[13px] text-muted">
                        {faltan === 1 ? 'Le falta 1 sello' : `Le faltan ${faltan} sellos`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Sellos sellos={t.estado.sellos} requeridos={t.estado.requeridos} />
                    <span className="text-[13px] tabular-nums text-muted">
                      {t.estado.sellos}/{t.estado.requeridos}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {t.estado.completa && (
                      <ConfirmForm
                        action={async () => correr(() => canjear(slug, t.id), `Premio entregado a ${t.nombre}`)}
                        confirmTitle={`¿Entregar el premio a ${t.nombre}?`}
                        confirmMessage={`Su tarjeta vuelve a empezar desde cero. Hazlo cuando ya le diste: ${datos.regla.premio.toLowerCase()}.`}
                        confirmLabel="Sí, ya se lo di"
                        dismissLabel="Todavía no"
                        triggerVariant="success"
                      >
                        <Gift className="h-4 w-4" aria-hidden="true" /> Entregar premio
                      </ConfirmForm>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pendiente}
                      onClick={() => correr(() => sumarSello(slug, t.id), `Sello sumado a ${t.nombre}`)}
                    >
                      <Stamp className="h-4 w-4" aria-hidden="true" /> +1 sello
                    </Button>
                    <a
                      href={t.wa}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full px-4 text-sm font-medium text-ink ring-1 ring-border transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Mandarle su tarjeta
                    </a>
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" /> Ver como ella
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {datos.sinTarjeta.length > 0 && (
          <form
            className="mt-4 flex flex-wrap items-end gap-2"
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
            <Button type="submit" variant="outline" disabled={!contacto || pendiente}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Dar tarjeta
            </Button>
          </form>
        )}
      </section>

      {/* ── Promociones ── */}
      <section>
        <SectionHeading title="Promociones" meta={datos.promos.length || undefined} />
        <p className="-mt-1 mb-4 text-[15px] text-muted">
          Salen en tu página de reservas solo entre las fechas que elijas. Al terminar, desaparecen solas.
        </p>

        {datos.promos.length > 0 && (
          <ul className="mb-4 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {datos.promos.map((p) => {
              const e = estadoPromo(p, hoy);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="text-[15px] font-medium text-ink">{p.title}</p>
                    <p className="text-[13px] text-muted">
                      Del {fechaCorta(p.starts_on)} al {fechaCorta(p.ends_on)}
                      {p.code && (
                        <>
                          {' · Código '}
                          <span className="font-semibold text-ink">{p.code}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[13px] font-semibold ${e.tono}`}>{e.label}</span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pendiente}
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
                    triggerClassName="!h-11 !w-11 !px-0"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Borrar {p.title}</span>
                  </ConfirmForm>
                </li>
              );
            })}
          </ul>
        )}

        <details className="group rounded-2xl bg-surface px-4 py-2 ring-1 ring-border sm:px-5" open={datos.promos.length === 0}>
          <summary className={PLEGABLE}>
            <Tag className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            Nueva promoción
            <ChevronRight className="ml-auto h-4 w-4 text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <form
            className="grid gap-4 pb-4 pt-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              correr(
                () => guardarPromo(slug, promo),
                'Promoción agregada',
                () => setPromo({ title: '', details: '', code: '', starts_on: hoy, ends_on: hoy })
              );
            }}
          >
            <FormField label="¿Qué promoción?" className="sm:col-span-2">
              <Input
                placeholder="Ej. Martes 20% en pedicure"
                maxLength={80}
                required
                value={promo.title}
                onChange={(e) => setPromo({ ...promo, title: e.target.value })}
                className="w-full"
                disabled={soloLectura}
              />
            </FormField>
            <FormField label="Detalle" optional className="sm:col-span-2">
              <Input
                placeholder="Ej. Menciónala al llegar"
                maxLength={240}
                value={promo.details}
                onChange={(e) => setPromo({ ...promo, details: e.target.value })}
                className="w-full"
                disabled={soloLectura}
              />
            </FormField>
            <FormField label="Empieza">
              <Input
                type="date"
                required
                value={promo.starts_on}
                onChange={(e) => setPromo({ ...promo, starts_on: e.target.value })}
                className="w-full"
                disabled={soloLectura}
              />
            </FormField>
            <FormField label="Termina">
              <Input
                type="date"
                required
                min={promo.starts_on}
                value={promo.ends_on}
                onChange={(e) => setPromo({ ...promo, ends_on: e.target.value })}
                className="w-full"
                disabled={soloLectura}
              />
            </FormField>
            <FormField label="Código" optional hint="Una palabra que tu clienta dice al llegar. Ej. MARTES20">
              <Input
                maxLength={30}
                value={promo.code}
                onChange={(e) => setPromo({ ...promo, code: e.target.value.toUpperCase() })}
                className="w-full"
                disabled={soloLectura}
              />
            </FormField>
            <div className="flex items-end">
              <Button type="submit" isLoading={pendiente} disabled={soloLectura} className="max-sm:w-full">
                Agregar promoción
              </Button>
            </div>
          </form>
        </details>
      </section>

      {/* ── La regla (se toca una vez) ── */}
      <section>
        <SectionHeading title="Tu tarjeta" />
        <details className="group rounded-2xl bg-surface px-4 py-2 ring-1 ring-border sm:px-5">
          <summary className={PLEGABLE}>
            <Stamp className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 font-medium">
              {datos.regla.requeridos} sellos = {datos.regla.premio.toLowerCase()}
              <span className="block text-sm font-normal text-muted">Toca para cambiar cuántos sellos o el premio</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <form
            className="flex flex-col gap-4 pb-4 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              correr(() => guardarRegla(slug, Number(requeridos), premio), 'Tarjeta guardada');
            }}
          >
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <FormField label="Sellos para ganar" hint="Entre 2 y 30.">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={30}
                  required
                  value={requeridos}
                  onChange={(e) => setRequeridos(e.target.value)}
                  className="w-full"
                  disabled={soloLectura}
                />
              </FormField>
              <FormField label="Premio">
                <Input
                  maxLength={120}
                  required
                  value={premio}
                  onChange={(e) => setPremio(e.target.value)}
                  className="w-full"
                  disabled={soloLectura}
                />
              </FormField>
            </div>
            <div className="flex flex-wrap gap-2">
              {PREMIOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={soloLectura}
                  onClick={() => setPremio(p)}
                  className="min-h-[2.75rem] rounded-full px-4 text-[13px] text-muted ring-1 ring-border transition-colors hover:bg-ink/[0.04] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-[13px] leading-relaxed text-muted">
              Así se lee en la tarjeta: con {requeridos || '…'} sellos ganas {premio.toLowerCase() || '…'}.
            </p>
            <div>
              <Button type="submit" isLoading={pendiente} disabled={soloLectura} className="max-sm:w-full">
                Guardar tarjeta
              </Button>
            </div>
          </form>
        </details>
      </section>

      {/* ── Historial ── */}
      <section>
        <SectionHeading title="Premios entregados" meta={datos.canjes.length ? 'Los últimos 20' : undefined} />
        {datos.canjes.length === 0 ? (
          <p className="text-[15px] text-muted">Todavía nadie ha cobrado su premio. Cuando lo entregues, queda anotado aquí.</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {datos.canjes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
                <span className="text-[15px] text-ink">{c.nombre}</span>
                <span className="text-[13px] text-muted">
                  {c.premio} · {new Date(c.cuando).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
