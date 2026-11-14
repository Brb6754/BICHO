'use client';

import { useState } from 'react';
import { Check, Clock, Moon, Plus, Sparkles, Sun, Sunrise, Users, Zap, type LucideIcon } from 'lucide-react';
import motion from './motion.module.css';
import { formatDuration, publicPrice, priceHidden, type Service } from './types';

// Selection is never carried by colour alone. Every selected control here
// changes three things at once: it gains a check mark, its border goes to
// `primary` at double width, and its label goes semibold. That way it
// still reads as chosen in greyscale, at a glance, and for anyone who
// doesn't separate the tenant's palette from its own background.
//
// Las tarjetas sin elegir ya no van rellenas del acento: superficie con
// filo fino y sombra en capas, como una ficha de carta, y el color del
// negocio se gasta en lo que se toca (el botón redondo de agregar, la
// palomita, el anillo de seleccionado). Así el color significa algo.
const CARD_SELECTED = `${motion.pop} bg-accent/[0.07] ring-2 ring-primary shadow-[0_12px_28px_-16px_rgb(var(--color-primary)/0.55)]`;
const CARD_IDLE =
  'bg-surface ring-1 ring-border shadow-[0_1px_1px_rgb(16_24_40/0.03),0_6px_18px_-12px_rgb(16_24_40/0.16)] hover:-translate-y-px hover:ring-ink/20 hover:shadow-[0_1px_1px_rgb(16_24_40/0.04),0_14px_28px_-14px_rgb(16_24_40/0.22)]';

export function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  onSelect: () => void;
}) {
  const price = priceHidden(service) ? '' : publicPrice(service) || 'Sin costo';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      // La tarjeta entera es el control. Se lee como una ficha de carta:
      // nombre en la tipografía del negocio, la descripción que escribió
      // en su carta, y abajo los dos datos que se comparan — cuánto dura
      // y cuánto cuesta. El botón redondo dice "agrégalo" sin palabras y
      // se vuelve una palomita al elegir; la selección nunca depende
      // solo del color (palomita + borde + peso).
      className={`group relative flex w-full flex-col rounded-[22px] p-[18px] text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.985] motion-reduce:transform-none ${
        selected ? CARD_SELECTED : CARD_IDLE
      }`}
    >
      <span className="flex items-start gap-4">
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[19px] leading-[1.2] text-ink ${selected ? 'font-semibold' : 'font-medium'}`}
            style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))', letterSpacing: 'var(--tpl-heading-tracking)' }}
          >
            {service.name}
          </span>
          {service.description && (
            <span className="mt-1.5 line-clamp-2 block text-[13.5px] leading-relaxed text-muted">{service.description}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition duration-200 ${
            selected
              ? 'bg-primary text-[rgb(var(--color-cta-fg))]'
              : 'bg-accent/[0.14] text-ink group-hover:bg-accent/25'
          }`}
        >
          {selected ? (
            <Check className={`${motion.pop} h-4 w-4`} strokeWidth={3} />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2.25} />
          )}
        </span>
      </span>

      <span className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3.5">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDuration(service.duration_minutes)}
        </span>
        {price && (
          <span
            className="text-[18px] font-semibold tabular-nums text-ink"
            style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))' }}
          >
            {price}
          </span>
        )}
      </span>
    </button>
  );
}

// Mismo lenguaje que la tarjeta de servicio: superficie con filo fino y
// sombra en capas, y la palomita a la derecha. A la izquierda, la cara de
// quien atiende (sus iniciales; el esquema no guarda fotos) o, para
// "cualquiera", el ícono de grupo.
function initialsOf(name: string): string {
  return name
    .replace(/^(dra?\.|lic\.)\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
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
      className={`group flex w-full items-center gap-4 rounded-[22px] p-4 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.985] motion-reduce:transform-none ${
        selected ? CARD_SELECTED : CARD_IDLE
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-ink ${
          recommended ? 'bg-accent/[0.18]' : 'bg-primary/[0.1]'
        }`}
      >
        {recommended ? <Users className="h-5 w-5" /> : initialsOf(name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-[16px] leading-snug text-ink ${selected ? 'font-semibold' : 'font-medium'}`}>
            {name}
          </span>
          {recommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/[0.16] px-2 py-0.5 text-[11px] font-semibold text-ink">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Más horarios
            </span>
          )}
        </span>
        {meta && <span className="mt-1 block text-[13px] text-muted">{meta}</span>}
      </span>
      <CheckBubble selected={selected} />
    </button>
  );
}

function CheckBubble({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition duration-200 ${
        selected ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : 'ring-[1.5px] ring-inset ring-ink/20'
      }`}
    >
      {selected && <Check className={`${motion.pop} h-3.5 w-3.5`} strokeWidth={3} />}
    </span>
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
