'use client';

import { useState } from 'react';
import { Check, Clock, Moon, Sparkles, Sun, Sunrise, Users, Zap, type LucideIcon } from 'lucide-react';
import motion from './motion.module.css';
import { formatDuration, publicPrice, priceHidden, type Service } from './types';

// Selection is never carried by colour alone. Every selected control here
// changes three things at once: it gains a check mark, its border goes to
// `primary` at double width, and its label goes semibold. That way it
// still reads as chosen in greyscale, at a glance, and for anyone who
// doesn't separate the tenant's palette from its own background.
//
// Y las tarjetas llevan color SIN estar seleccionadas. Antes eran
// blancas con una línea de 1px: correcto y exactamente lo que Bruno
// describió como "parece un documento". Una lista de opciones en la que
// ninguna tiene color obliga al ojo a leerlas todas; con un relleno
// tenue del acento del negocio se ven como fichas que se pueden tocar,
// que es lo que son.
const SELECTED_RING = `${motion.pop} border-primary ring-1 ring-primary bg-primary/[0.12] shadow-[0_8px_24px_-12px_rgb(var(--color-primary)/0.55)]`;
const UNSELECTED_RING =
  'border-transparent bg-accent/[0.09] hover:-translate-y-px hover:bg-accent/[0.16] active:translate-y-0 motion-reduce:transform-none';

function SelectionDot({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        selected ? 'border-primary bg-primary' : 'border-ink/20 bg-surface'
      }`}
    >
      {selected && (
        <Check className={`${motion.pop} h-3 w-3 text-[rgb(var(--color-cta-fg))]`} strokeWidth={3} />
      )}
    </span>
  );
}

export function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      // The whole card is the control. The old flow put a chevron at the
      // end of a row, which reads as "there is more inside" rather than
      // "pick this", and gave a 24px target on a 375px screen.
      className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        selected ? SELECTED_RING : UNSELECTED_RING
      }`}
    >
      <SelectionDot selected={selected} />

      <span className="min-w-0 flex-1">
        <span
          className={`block text-[17px] leading-snug text-ink ${selected ? 'font-semibold' : 'font-medium'}`}
          style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))', letterSpacing: 'var(--tpl-heading-tracking)' }}
        >
          {service.name}
        </span>
        {service.description && (
          <span className="mt-1 block text-[13px] leading-relaxed text-muted">{service.description}</span>
        )}
        <span className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDuration(service.duration_minutes)}
        </span>
      </span>

      {/* El precio es una ficha, no una columna de texto: es el dato que
          la gente compara, y en una fila de texto plano pesa lo mismo
          que la duración. */}
      {!priceHidden(service) && (
        <span className="shrink-0">
          <span
            className={`block rounded-full px-3 py-1 text-[15px] font-bold tabular-nums transition-colors ${
              selected ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : 'bg-primary/[0.14] text-ink'
            }`}
          >
            {publicPrice(service) || 'Sin costo'}
          </span>
        </span>
      )}
    </button>
  );
}

export function ResourceCard({
  name,
  meta,
  recommended = false,
  selected,
  onSelect,
}: {
  name: string;
  // Real information only: the next time this resource is actually free,
  // computed from availability. Nothing invented — the schema has no
  // role, photo or rating to show.
  meta?: string;
  recommended?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        selected ? SELECTED_RING : UNSELECTED_RING
      }`}
    >
      <SelectionDot selected={selected} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-[15px] leading-snug text-ink ${selected ? 'font-semibold' : 'font-medium'}`}>
            {name}
          </span>
          {recommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-ink">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Más horarios
            </span>
          )}
        </span>
        {meta && <span className="mt-1 block text-[13px] text-muted">{meta}</span>}
      </span>
      {recommended && <Users className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
    </button>
  );
}

export type SlotState = 'available' | 'selected' | 'taken' | 'recommended';

export function TimeSlot({
  label,
  state,
  onSelect,
}: {
  label: string;
  state: SlotState;
  onSelect: () => void;
}) {
  const selected = state === 'selected';
  const taken = state === 'taken';
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={taken}
      aria-pressed={selected}
      // 48px tall on a phone: the old pills were 42 and sat below the
      // 44px minimum once the border was counted.
      className={`relative inline-flex min-h-[50px] items-center justify-center gap-1.5 rounded-2xl border px-2 text-[15px] tabular-nums transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
        selected
          ? `${motion.pop} border-primary bg-primary font-semibold text-[rgb(var(--color-cta-fg))] shadow-[0_8px_20px_-10px_rgb(var(--color-primary)/0.7)]`
          : taken
            ? 'cursor-not-allowed border-border bg-paper font-normal text-muted line-through opacity-60'
            : 'border-border bg-surface font-medium text-ink hover:-translate-y-px hover:border-primary/50 hover:bg-primary/5 active:translate-y-0 motion-reduce:transform-none'
      }`}
    >
      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
      {label}
      {taken && <span className="sr-only">(ya no disponible)</span>}
    </button>
  );
}

// Times are grouped and capped. A flat grid of every slot in a day runs
// past three screens on a phone and makes the visitor scan a wall of
// near-identical buttons; the cap turns it into one decision with a way
// to see more.
const GROUP_ICON: Record<string, LucideIcon> = {
  'Más pronto': Zap,
  Mañana: Sunrise,
  Tarde: Sun,
  Noche: Moon,
};

export function TimeGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const Icon = GROUP_ICON[label];
  return (
    <section className="mt-6 first:mt-0">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          {Icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15" aria-hidden="true">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          {label}
        </h3>
        <span className="text-xs text-muted">{count === 1 ? '1 horario' : `${count} horarios`}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{children}</div>
    </section>
  );
}

export function ShowMore({
  hidden,
  onClick,
}: {
  hidden: number;
  onClick: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  if (hidden <= 0) return null;
  return (
    <button
      type="button"
      onClick={() => {
        setPressed(true);
        onClick();
      }}
      className="mt-4 w-full rounded-2xl border border-dashed border-ink/20 bg-transparent px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-expanded={pressed}
    >
      Ver {hidden} horarios más
    </button>
  );
}
