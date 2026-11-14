import { ArrowDown, ArrowUpRight, Clock3, MapPin, Plus, Tag } from 'lucide-react';
import type { FaqProps, HeroProps, HoursProps, LocationProps, SplitProps, TeamProps } from '@/lib/templates/blocks';
import type { Promo } from '@/lib/lealtad/datos';
import { darkenHex, withAlpha } from '@/lib/branding/colors';
import { safeHref } from '@/lib/branding/safeHref';
import { lineForDay, type OpenStatus } from '@/lib/schedule/openNow';
import motion from '@/components/booking/motion.module.css';
import type { SectionBranding } from './Sections';

// La PORTADA de la página pública de reservas: lo que se ve antes de
// empezar a reservar, y nada más. Se lee como la pantalla de inicio de
// una app —foto, logo, nombre, si está abierto, dónde, quién atiende—
// no como una página web con secciones apiladas. En cuanto la persona
// elige servicio y avanza, todo esto se pliega (components/booking/
// stage.tsx) y queda solo el flujo.
//
// Ningún color fijo: todo sale del negocio (branding) o de los tokens
// semánticos que el negocio retiñe, así que se ve igual de suyo en claro
// y en oscuro.

const heading: React.CSSProperties = {
  fontFamily: 'var(--tpl-heading-font, var(--font-heading))',
  letterSpacing: 'var(--tpl-heading-tracking)',
  textTransform: 'var(--tpl-heading-transform)' as React.CSSProperties['textTransform'],
};

// Sombra en capas: un filo cercano y una caída larga y suave. Es lo que
// separa una superficie del papel sin el gris plano de una tarjeta
// genérica.
const LIFT = 'shadow-[0_1px_1px_rgb(16_24_40/0.04),0_8px_24px_-12px_rgb(16_24_40/0.18)]';

function initials(name: string): string {
  return name
    .replace(/^(dra?\.|lic\.|mtr[ao]\.)\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function firstName(name: string): string {
  const clean = name.replace(/^(dra?\.|lic\.)\s*/i, '');
  const titled = name !== clean ? name.slice(0, name.length - clean.length) : '';
  return titled + (clean.split(/\s+/)[0] ?? clean);
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export function mapHrefFor(location?: LocationProps | null, fallbackAddress?: string | null): string | null {
  if (location?.mapUrl) return safeHref(location.mapUrl);
  const address = location?.address || fallbackAddress;
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** "Blvd. Domingo Arrieta 1204, Los Ángeles, Durango" → "Los Ángeles, Durango". */
function zoneOf(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join(', ') : address;
}

export function Cover({
  businessName,
  hero,
  branding,
  promos,
  team,
  status,
  address,
  mapHref,
}: {
  businessName: string;
  hero: HeroProps | null;
  branding: SectionBranding;
  promos: Promo[];
  team: TeamProps | null;
  status: OpenStatus | null;
  address: string | null;
  mapHref: string | null;
}) {
  const image = hero?.backgroundImageUrl?.trim();
  const primary = branding.primaryColor;
  const members = (team?.members ?? []).filter((m) => m.name.trim()).slice(0, 5);
  const meta = [hero?.eyebrow?.trim(), address ? zoneOf(address) : null].filter(Boolean).join(' · ');
  // La frase del negocio ("Aparta tus uñas", "Agenda tu consulta") es un
  // imperativo escrito por ellos: es el mejor texto posible para el botón.
  const cta = hero?.title?.trim() || 'Reservar cita';

  return (
    <header className="relative pb-8 sm:pb-12">
      {/* La foto es la protagonista y el nombre va ENCIMA, enorme, como
          la portada de una revista: a sangre en el teléfono, un marco
          redondeado en pantallas grandes. Sin foto, el color del negocio
          con una luz del acento — nunca un hueco gris. El velo de abajo
          es oscuro y largo a propósito: garantiza contraste AA para el
          texto blanco sea cual sea la foto. */}
      <div className="relative flex h-[clamp(380px,112vw,460px)] flex-col justify-end overflow-hidden sm:mx-6 sm:mt-6 sm:h-[420px] sm:rounded-[32px] lg:mx-auto lg:h-[440px] lg:max-w-6xl">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className={`${motion.coverIn} absolute inset-0 h-full w-full object-cover`}
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: image
              ? `linear-gradient(180deg, rgb(0 0 0 / 0.18) 0%, transparent 28%, ${withAlpha(darkenHex(primary, 40), 0.55)} 58%, ${withAlpha(darkenHex(primary, 55), 0.92)} 100%)`
              : `radial-gradient(70% 70% at 88% 8%, ${withAlpha(branding.accentColor, 0.5)}, transparent 62%), linear-gradient(160deg, ${primary}, ${darkenHex(primary, 45)})`,
          }}
        />
        <div className="relative mx-auto w-full max-w-2xl px-5 pb-7 text-white sm:px-10 sm:pb-9 lg:max-w-6xl lg:px-12 lg:pb-11">
          {/* El logo como el ícono de una app: placa blanca para que
              cualquier logo se lea sobre la foto. Sin logo, monograma. */}
          <div
            className={`${motion.coverRise} flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] ring-1 ring-white/30 shadow-[0_10px_30px_-10px_rgb(0_0_0/0.55)] sm:h-[72px] sm:w-[72px]`}
            style={{ background: branding.logoUrl ? '#fff' : withAlpha('#ffffff', 0.14) }}
          >
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" aria-hidden="true" className="h-full w-full object-contain p-2" />
            ) : (
              <span className="text-[1.4rem] font-semibold" style={heading}>
                {initials(businessName)}
              </span>
            )}
          </div>
          <h1
            className={`${motion.coverRise} mt-5 text-balance text-[clamp(2.9rem,13.5vw,5.25rem)] font-semibold leading-[0.92] [text-shadow:0_2px_24px_rgb(0_0_0/0.25)]`}
            style={{ ...heading, animationDelay: '60ms' }}
          >
            {businessName}
          </h1>
          {meta && (
            <p className={`${motion.coverRise} mt-3 text-[15px] font-medium text-white/85`} style={{ animationDelay: '120ms' }}>
              {meta}
            </p>
          )}
        </div>
      </div>

      <div className="relative mx-auto max-w-2xl px-5 sm:px-12 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:px-12">
        <div className="min-w-0">
          {(status || mapHref) && (
            <ul className="-mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              {status && (
                <li className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink ring-1 ring-border`}>
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    {status.open && (
                      <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
                    )}
                    <span className={`relative h-2 w-2 rounded-full ${status.open ? 'bg-success' : 'bg-ink/30'}`} />
                  </span>
                  {status.label}
                </li>
              )}
              {mapHref && (
                <li className="shrink-0">
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink ring-1 ring-border transition hover:ring-ink/25 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transform-none"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                    Cómo llegar
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="min-w-0">
          {promos.map((p) => (
            <PromoTicket key={p.id} promo={p} branding={branding} />
          ))}

          {members.length > 0 && (
            <div className="mt-6 flex items-center gap-3.5 lg:mt-5">
              <div className="flex shrink-0 -space-x-2.5">
                {members.map((m, i) =>
                  m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={m.name}
                      src={m.photoUrl}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover ring-[3px] ring-[rgb(var(--color-paper))]"
                    />
                  ) : (
                    <span
                      key={m.name}
                      aria-hidden="true"
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold ring-[3px] ring-[rgb(var(--color-paper))]"
                      style={{
                        backgroundColor: withAlpha(i % 2 ? branding.accentColor : primary, 0.16 + i * 0.05),
                        color: 'rgb(var(--color-ink))',
                      }}
                    >
                      {initials(m.name)}
                    </span>
                  )
                )}
              </div>
              <p className="min-w-0 text-[13px] leading-snug text-muted">
                <span className="block font-semibold text-ink">{listJoin(members.map((m) => firstName(m.name)))}</span>
                {team?.intro || listJoin(members.map((m) => m.role).filter(Boolean))}
              </p>
            </div>
          )}
        </div>

        <a
          href="#reservar"
          className="group mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-[rgb(var(--color-cta-fg))] shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_10px_24px_-10px_rgb(var(--color-primary)/0.7)] transition duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 motion-reduce:transform-none lg:hidden"
        >
          {cta}
          <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}

function PromoTicket({ promo, branding }: { promo: Promo; branding: SectionBranding }) {
  return (
    <div
      className="mt-6 flex items-stretch overflow-hidden rounded-[20px] ring-1 first:mt-6 lg:first:mt-6 [&+&]:mt-2"
      style={{
        background: `linear-gradient(120deg, ${withAlpha(branding.accentColor, 0.16)}, ${withAlpha(branding.accentColor, 0.06)})`,
        // ring color from the accent, not grey: the ticket belongs to the brand
        ['--tw-ring-color' as string]: withAlpha(branding.accentColor, 0.32),
      }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 p-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: withAlpha(branding.accentColor, 0.22) }}
          aria-hidden="true"
        >
          <Tag className="h-4 w-4 text-ink" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-snug text-ink">{promo.title}</span>
          {promo.details && <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{promo.details}</span>}
        </span>
      </div>
      {promo.code && (
        <div
          className="flex shrink-0 flex-col items-center justify-center border-l border-dashed px-4"
          style={{ borderColor: withAlpha(branding.accentColor, 0.45) }}
        >
          <span className="text-[11px] text-muted">Código</span>
          <span className="mt-0.5 font-mono text-[13px] font-semibold tracking-wider text-ink">{promo.code}</span>
        </div>
      )}
    </div>
  );
}

// ── Información de inicio ────────────────────────────────────────────
// Tres piezas que se deslizan de lado en el teléfono (una se asoma para
// que se entienda que hay más) y se apilan en la columna lateral en
// escritorio. Cada una es distinta a propósito: una foto, una tabla
// corta, una dirección — no tres cajas iguales.

export function InfoRail({
  split,
  hours,
  location,
  branding,
  status,
  todayIndex,
  mapHref,
}: {
  split: SplitProps | null;
  hours: HoursProps | null;
  location: LocationProps | null;
  branding: SectionBranding;
  status: OpenStatus | null;
  todayIndex: number;
  mapHref: string | null;
}) {
  const cards: React.ReactNode[] = [];
  if (split && (split.heading || split.body)) {
    cards.push(
      <article
        key="split"
        className={`relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[24px] p-5 text-white lg:min-h-[260px] ${LIFT}`}
        style={{ background: `linear-gradient(140deg, ${branding.primaryColor}, ${darkenHex(branding.primaryColor, 28)})` }}
      >
        {split.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={split.imageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgb(0 0 0 / 0) 30%, rgb(0 0 0 / 0.72) 100%)' }}
        />
        <div className="relative">
          <h3 className="text-[1.6rem] font-semibold leading-[1.05]" style={heading}>
            {split.heading}
          </h3>
          {split.body && <p className="mt-2 text-[14px] leading-relaxed text-white/85">{split.body}</p>}
        </div>
      </article>
    );
  }
  if (hours && hours.lines.length > 0) {
    cards.push(
      <article key="hours" className={`flex flex-col rounded-[24px] bg-surface p-5 ring-1 ring-border ${LIFT}`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[1.35rem] font-semibold leading-tight text-ink" style={heading}>
            {hours.heading || 'Horario'}
          </h3>
          <Clock3 className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
        </div>
        {status && (
          <p className={`mt-1 text-[13px] font-medium ${status.open ? 'text-success' : 'text-muted'}`}>{status.label}</p>
        )}
        <dl className="mt-4 flex flex-1 flex-col">
          {hours.lines.map((line, i) => {
            const cut = line.indexOf(':');
            const day = cut === -1 ? line : line.slice(0, cut);
            const time = cut === -1 ? '' : line.slice(cut + 1).trim();
            const today = i === todayIndex;
            return (
              <div
                key={line}
                className={`flex items-baseline justify-between gap-4 border-t border-border py-2.5 text-[14px] first:border-t-0 ${
                  today ? 'font-semibold text-ink' : 'text-muted'
                }`}
              >
                <dt className="flex items-center gap-2">
                  {day}
                  {today && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-ink">Hoy</span>
                  )}
                </dt>
                <dd className="shrink-0 text-right tabular-nums first-letter:uppercase">{time}</dd>
              </div>
            );
          })}
        </dl>
      </article>
    );
  }
  if (location && location.address) {
    cards.push(
      <article
        key="location"
        className={`relative flex flex-col overflow-hidden rounded-[24px] bg-surface p-5 ring-1 ring-border ${LIFT}`}
      >
        {/* Una retícula de calles en el color del negocio: dice "mapa" sin
            cargar un mapa ni inventar dónde queda el lugar. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage: `linear-gradient(${withAlpha(branding.primaryColor, 0.07)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(branding.primaryColor, 0.07)} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(120% 80% at 100% 0%, #000 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(120% 80% at 100% 0%, #000 0%, transparent 70%)',
          }}
        />
        <div className="relative flex flex-1 flex-col">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: branding.primaryColor }}
            aria-hidden="true"
          >
            <MapPin className="h-5 w-5 text-[rgb(var(--color-cta-fg))]" />
          </span>
          <h3 className="mt-5 text-[1.35rem] font-semibold leading-tight text-ink" style={heading}>
            {location.heading || 'Dónde estamos'}
          </h3>
          <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{location.address}</p>
          {mapHref && (
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex h-11 w-fit items-center gap-1.5 rounded-full bg-ink/[0.06] px-4 text-[14px] font-semibold text-ink transition hover:bg-ink/10 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transform-none"
            >
              Abrir en el mapa
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </article>
    );
  }
  if (cards.length === 0) return null;
  return (
    <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible lg:pb-0">
      {cards.map((c, i) => (
        <div key={i} className="flex w-[82%] max-w-[340px] shrink-0 snap-start flex-col sm:w-[300px] lg:w-auto lg:max-w-none [&>*]:flex-1">
          {c}
        </div>
      ))}
    </div>
  );
}

export function FaqList({ props }: { props: FaqProps }) {
  const items = props.items.filter((i) => i.question.trim());
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="px-1 text-[1.5rem] font-semibold leading-tight text-ink" style={heading}>
        {props.heading || 'Antes de venir'}
      </h2>
      <div className={`mt-4 rounded-[24px] bg-surface px-5 ring-1 ring-border ${LIFT}`}>
        {items.map((item) => (
          <details key={item.question} className="group border-t border-border first:border-t-0">
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[15px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
              {item.question}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] transition duration-300 group-open:rotate-45 group-open:bg-primary group-open:text-[rgb(var(--color-cta-fg))] motion-reduce:transition-none">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </summary>
            <p className="-mt-1 pb-4 pr-10 text-[14px] leading-relaxed text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export { lineForDay };
