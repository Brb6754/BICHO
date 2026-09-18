import { ArrowRight, MapPin, Plus } from 'lucide-react';
import type {
  HeroProps,
  ServicesProps,
  SplitProps,
  TeamProps,
  FaqProps,
  CtaProps,
  HoursProps,
  LocationProps,
} from '@/lib/templates/blocks';
import { tenantCtaStyle, withAlpha, legibleBrandText, readableFgRgb } from '@/lib/branding/colors';
import { safeHref } from '@/lib/branding/safeHref';

// The section library. Everything here is variant-driven: one block
// type renders several genuinely different compositions, which is the
// mechanism that lets six templates share a codebase without looking
// like six colour swaps of one page.
//
// Every section reads the template's design language through CSS vars
// (--tpl-h1, --tpl-space, --tpl-radius, --tpl-image-radius,
// --tpl-heading-font, --tpl-heading-transform) rather than hard-coded
// Tailwind sizes, so changing a template's `design` re-proportions the
// whole page instead of just recolouring it.

export type SectionBranding = {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string | null;
  isDark?: boolean;
  darkBase?: string;
};

// Shared heading style. Pulled from the template design language so a
// "condensed uppercase" template and an "editorial sentence-case" one
// diverge without either section knowing which template it's in.
const h1Style: React.CSSProperties = {
  fontFamily: 'var(--tpl-heading-font, var(--font-heading))',
  fontSize: 'var(--tpl-h1)',
  letterSpacing: 'var(--tpl-heading-tracking)',
  textTransform: 'var(--tpl-heading-transform)' as React.CSSProperties['textTransform'],
  lineHeight: 1.02,
};

const h2Style: React.CSSProperties = {
  fontFamily: 'var(--tpl-heading-font, var(--font-heading))',
  fontSize: 'var(--tpl-h2)',
  letterSpacing: 'var(--tpl-heading-tracking)',
  textTransform: 'var(--tpl-heading-transform)' as React.CSSProperties['textTransform'],
  lineHeight: 1.1,
};

const imageStyle: React.CSSProperties = { borderRadius: 'var(--tpl-image-radius, 16px)' };

// Brand color as text, checked against the page it sits on. The light
// ground is the booking page's default paper; the dark one is the same
// anchored dark the cards use.
function brandText(branding: SectionBranding): string {
  const ground = branding.isDark && branding.darkBase ? branding.darkBase : '#F7F6F3';
  return legibleBrandText(branding.primaryColor, branding.accentColor, ground);
}

function Cta({
  text,
  link,
  branding,
}: {
  text: string;
  link: string;
  branding: SectionBranding;
}) {
  if (!text) return null;
  return (
    <a
      href={safeHref(link)}
      className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ ...tenantCtaStyle(branding.primaryColor, branding.accentColor), borderRadius: 'var(--tpl-radius, 14px)' }}
    >
      {text}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

// `editKey` names the prop this text comes from. The template editor
// looks for [data-edit] inside the selected section and turns exactly
// those nodes into contentEditable, so inline editing needs no parallel
// list of "which text is where" — the renderer declares it.
function Eyebrow({
  children,
  color,
  editKey,
}: {
  children: React.ReactNode;
  color: string;
  editKey?: string;
}) {
  if (!children) return null;
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color }} data-edit={editKey}>
      {children}
    </p>
  );
}

// ── HERO ────────────────────────────────────────────────────────────
// Five compositions, not five colourways. `editorial` and `split` are
// what make a beauty or spa template feel like a magazine; `fullscreen`
// and `overlay` are what make a gym or padel club feel like a club;
// `minimal` is what a medical template needs so nothing competes with
// the appointment CTA.
export function HeroSection({
  variant,
  props,
  branding,
}: {
  variant: string;
  props: HeroProps;
  branding: SectionBranding;
}) {
  const hasImage = props.backgroundImageUrl.trim().length > 0;
  const accent = branding.accentColor;

  // THE BOOKING-PAGE DEFAULT.
  // This page is not a website about the business — it is the place
  // someone books an appointment. So the opening block's whole job is
  // "am I in the right place?", answered in as little vertical space
  // as possible, and then it gets out of the way so the booking flow
  // is on screen immediately. A poster-sized hero here is actively
  // hostile: it costs the visitor a scroll before they can do the one
  // thing they came to do.
  if (variant === 'header') {
    return (
      <header className="w-full border-b border-ink/[0.07] px-5 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
          {branding.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt=""
              aria-hidden="true"
              className="h-12 w-auto max-w-[160px] shrink-0 object-contain"
            />
          )}
          <div className="min-w-0">
            {/* Eyebrow is muted, not brand-coloured. On a page whose
                only job is a booking, the accent has to mean "this is
                what you press" — spending it on a label above the
                title spends it on nothing. */}
            {props.eyebrow && (
              // Follows the template's own heading case: a condensed,
              // upper-case template (pádel, gimnasio) keeps its shouted
              // label; the others read it in sentence case instead of the
              // tracked-out capitals every generic landing page uses.
              <p
                className="text-[13px] font-medium text-muted"
                style={{
                  textTransform: 'var(--tpl-heading-transform)' as React.CSSProperties['textTransform'],
                  letterSpacing: 'var(--tpl-label-tracking)',
                }}
                data-edit="eyebrow"
              >
                {props.eyebrow}
              </p>
            )}
            <h1
              className="mt-1 text-2xl font-bold leading-tight text-ink sm:text-3xl"
              style={{
                fontFamily: 'var(--tpl-heading-font, var(--font-heading))',
                letterSpacing: 'var(--tpl-heading-tracking)',
                textTransform: 'var(--tpl-heading-transform)' as React.CSSProperties['textTransform'],
              }}
              data-edit="title"
            >
              {props.title}
            </h1>
            {props.subtitle && (
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted" data-edit="subtitle">
                {props.subtitle}
              </p>
            )}
          </div>
        </div>
      </header>
    );
  }

  // `overlay` used to require an image to take this branch, so an
  // overlay hero with no photo yet fell all the way through to the
  // editorial default — a template would silently change composition
  // depending on whether someone had uploaded a picture. Both
  // variants take this branch always; the no-image case paints the
  // brand colour instead of a photograph.
  if (variant === 'fullscreen' || variant === 'overlay') {
    const centred = variant === 'overlay';
    return (
      <section
        className="relative isolate flex min-h-[68vh] w-full items-end overflow-hidden"
        style={hasImage ? undefined : { backgroundColor: branding.primaryColor }}
      >
        {hasImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.backgroundImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {/* Gradient scrim rather than a flat overlay: keeps the top of
            the photograph readable as a photograph while still giving
            the type at the bottom a guaranteed contrast floor. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.05) 100%)' }}
        />
        <div
          className={`relative mx-auto w-full max-w-6xl px-6 pb-16 pt-28 text-white ${centred ? 'text-center' : ''}`}
        >
          <div className={centred ? 'mx-auto max-w-2xl' : 'max-w-3xl'}>
            <Eyebrow color={accent} editKey="eyebrow">{props.eyebrow}</Eyebrow>
            <h1 className="font-bold text-white" style={h1Style} data-edit="title">
              {props.title}
            </h1>
            <p data-edit="subtitle" className="mt-5 max-w-xl text-lg text-white/80" style={centred ? { marginInline: 'auto' } : undefined}>
              {props.subtitle}
            </p>
            <Cta text={props.ctaText} link={props.ctaLink} branding={branding} />
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'split') {
    return (
      <section className="w-full">
        <div className="grid lg:grid-cols-2">
          <div className="flex items-center px-6 py-20 sm:px-12 lg:py-28">
            <div className="mx-auto w-full max-w-lg">
              <Eyebrow color={brandText(branding)} editKey="eyebrow">{props.eyebrow}</Eyebrow>
              <h1 className="font-bold text-ink" style={h1Style} data-edit="title">
                {props.title}
              </h1>
              <p data-edit="subtitle" className="mt-5 text-lg leading-relaxed text-muted">{props.subtitle}</p>
              <Cta text={props.ctaText} link={props.ctaLink} branding={branding} />
            </div>
          </div>
          <div className="relative min-h-[320px] lg:min-h-full" style={{ backgroundColor: withAlpha(branding.primaryColor, 0.1) }}>
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.backgroundImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <ImagePlaceholder label="Imagen del hero" />
            )}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'minimal') {
    return (
      <section className="w-full px-6" style={{ paddingTop: 'var(--tpl-space)', paddingBottom: 'var(--tpl-space)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow color={brandText(branding)} editKey="eyebrow">{props.eyebrow}</Eyebrow>
          <h1 className="font-bold text-ink" style={h1Style} data-edit="title">
            {props.title}
          </h1>
          <p data-edit="subtitle" className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">{props.subtitle}</p>
          <Cta text={props.ctaText} link={props.ctaLink} branding={branding} />
        </div>
      </section>
    );
  }

  // editorial (default) — oversized type on the left, image offset and
  // overlapping the type column's baseline. The asymmetry is the point:
  // it's what a centred stack can never produce.
  return (
    <section className="w-full px-6" style={{ paddingTop: 'calc(var(--tpl-space) * 0.8)', paddingBottom: 'var(--tpl-space)' }}>
      <div className="mx-auto grid max-w-6xl items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
        <div>
          <Eyebrow color={brandText(branding)} editKey="eyebrow">{props.eyebrow}</Eyebrow>
          <h1 className="font-bold text-ink" style={h1Style} data-edit="title">
            {props.title}
          </h1>
          <p data-edit="subtitle" className="mt-6 max-w-lg text-lg leading-relaxed text-muted">{props.subtitle}</p>
          <Cta text={props.ctaText} link={props.ctaLink} branding={branding} />
        </div>
        <div className="relative aspect-[4/5] w-full overflow-hidden lg:-mb-16" style={imageStyle}>
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.backgroundImageUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
          ) : (
            <ImagePlaceholder label="Imagen del hero" tint={branding.primaryColor} />
          )}
        </div>
      </div>
    </section>
  );
}

// Empty state for any image slot. The brief asks every component to
// survive imperfect data — a template must look deliberate before
// anyone has uploaded a single photograph.
function ImagePlaceholder({ label, tint }: { label: string; tint?: string }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 text-center"
      style={{ backgroundColor: tint ? withAlpha(tint, 0.08) : 'rgb(var(--color-ink) / 0.05)', ...imageStyle }}
    >
      <Plus className="h-5 w-5 text-muted" aria-hidden="true" />
      <span className="px-4 text-xs font-medium text-muted">{label}</span>
    </div>
  );
}

// ── SERVICES ────────────────────────────────────────────────────────
// The block the old schema could not express at all: a named thing with
// a price and a duration. `menu` is the treatment a salon or spa price
// list actually wants; `cards` is the conventional one; `editorial`
// numbers each entry and gives it a full row.
export function ServicesSection({
  variant,
  props,
  branding,
}: {
  variant: string;
  props: ServicesProps;
  branding: SectionBranding;
}) {
  const { heading, intro, items } = props;

  const header = (
    <div className="mb-8 max-w-2xl sm:mb-12">
      <h2 className="font-bold text-ink" style={h2Style} data-edit="heading">
        {heading}
      </h2>
      {intro && (
        <p className="mt-4 text-base leading-relaxed text-muted" data-edit="intro">
          {intro}
        </p>
      )}
    </div>
  );

  if (!items.length) {
    return (
      <div className="mx-auto max-w-2xl px-6 text-center text-sm text-muted">
        {header}
        <p>Todavía no hay servicios en esta sección.</p>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div>
        {header}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <article
              key={s.name}
              className="flex flex-col border p-6 transition-transform duration-200 hover:-translate-y-1"
              style={{ borderRadius: 'var(--tpl-radius, 14px)', borderColor: withAlpha(branding.primaryColor, 0.18) }}
            >
              <h3 className="text-lg font-semibold text-ink">{s.name}</h3>
              {s.description && <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.description}</p>}
              <div className="mt-5 flex items-baseline justify-between border-t pt-4" style={{ borderColor: withAlpha(branding.primaryColor, 0.12) }}>
                <span className="text-xl font-bold" style={{ color: brandText(branding) }}>
                  {s.price}
                </span>
                <span className="text-xs text-muted">{s.duration}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'editorial') {
    return (
      <div>
        {header}
        <ol>
          {items.map((s, i) => (
            <li
              key={s.name}
              className="grid gap-4 border-t py-8 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-baseline sm:gap-8"
              style={{ borderColor: withAlpha(branding.primaryColor, 0.15) }}
            >
              <span className="text-sm font-semibold tabular-nums" style={{ color: brandText(branding) }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-xl font-semibold text-ink sm:text-2xl">{s.name}</h3>
                {s.description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{s.description}</p>}
              </div>
              <div className="text-left sm:text-right">
                <p className="text-lg font-bold text-ink">{s.price}</p>
                <p className="text-xs text-muted">{s.duration}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div>
        {header}
        <div className="grid gap-x-12 gap-y-1 sm:grid-cols-2">
          {items.map((s) => (
            <div key={s.name} className="flex items-baseline gap-3 py-3">
              <span className="text-sm font-medium text-ink">{s.name}</span>
              <span className="min-w-4 flex-1 border-b border-dotted" style={{ borderColor: withAlpha(branding.primaryColor, 0.3) }} />
              <span className="text-sm font-semibold text-ink">{s.price}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // menu (default) — a printed price list: name and duration on the
  // left, a leader rule, price on the right. Reads as a real menu, not
  // as three cards in a row.
  return (
    <div>
      {header}
      <div className="grid gap-x-16 gap-y-2 lg:grid-cols-2">
        {items.map((s) => (
          <div key={s.name} className="py-4">
            <div className="flex items-baseline gap-4">
              <h3 className="text-base font-semibold text-ink">{s.name}</h3>
              <span className="min-w-6 flex-1 border-b border-dotted" style={{ borderColor: withAlpha(branding.primaryColor, 0.35) }} />
              <span className="text-base font-bold" style={{ color: brandText(branding) }}>
                {s.price}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3">
              {s.description && <p className="max-w-md text-sm leading-relaxed text-muted">{s.description}</p>}
              {s.duration && <span className="text-xs uppercase tracking-wide text-muted">{s.duration}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SPLIT (image + text) ────────────────────────────────────────────
// The workhorse of every editorial layout, and the thing a stack of
// centred boxes fundamentally cannot do.
export function SplitSection({
  variant,
  props,
  branding,
}: {
  variant: string;
  props: SplitProps;
  branding: SectionBranding;
}) {
  const imageFirst = variant === 'image-left';
  const offset = variant === 'offset';

  const image = (
    <div
      className={`relative w-full overflow-hidden ${offset ? 'aspect-[5/6] lg:-my-12' : 'aspect-[4/3]'}`}
      style={imageStyle}
    >
      {props.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.imageUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      ) : (
        <ImagePlaceholder label="Imagen de la sección" tint={branding.primaryColor} />
      )}
    </div>
  );

  const text = (
    <div className={offset ? 'lg:py-8' : ''}>
      <Eyebrow color={branding.accentColor} editKey="eyebrow">{props.eyebrow}</Eyebrow>
      <h2 className="font-bold text-ink" style={h2Style} data-edit="heading">
        {props.heading}
      </h2>
      <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-muted" data-edit="body">
        {props.body}
      </p>
      <Cta text={props.ctaText} link={props.ctaLink} branding={branding} />
    </div>
  );

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {imageFirst ? (
        <>
          {image}
          {text}
        </>
      ) : (
        <>
          {text}
          {image}
        </>
      )}
    </div>
  );
}

// ── TEAM ────────────────────────────────────────────────────────────
export function TeamSection({
  variant,
  props,
  branding,
}: {
  variant: string;
  props: TeamProps;
  branding: SectionBranding;
}) {
  const { heading, intro, members } = props;

  const header = (
    <div className="mb-8 max-w-2xl sm:mb-12">
      <h2 className="font-bold text-ink" style={h2Style} data-edit="heading">
        {heading}
      </h2>
      {intro && (
        <p className="mt-4 text-base leading-relaxed text-muted" data-edit="intro">
          {intro}
        </p>
      )}
    </div>
  );

  if (!members.length) {
    return (
      <div>
        {header}
        <p className="text-sm text-muted">Todavía no hay personas en esta sección.</p>
      </div>
    );
  }

  if (variant === 'roster') {
    return (
      <div>
        {header}
        <ul>
          {members.map((m) => (
            <li
              key={m.name}
              className="flex items-center gap-5 border-t py-5"
              style={{ borderColor: withAlpha(branding.primaryColor, 0.15) }}
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: withAlpha(branding.primaryColor, 0.1) }}>
                {m.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photoUrl} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{m.name}</p>
                <p className="text-sm text-muted">{m.role}</p>
              </div>
              {m.note && <p className="hidden max-w-xs text-sm text-muted sm:block">{m.note}</p>}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <figure key={m.name}>
            <div className="aspect-[3/4] w-full overflow-hidden" style={imageStyle}>
              {m.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photoUrl} alt={m.name} className="h-full w-full object-cover" />
              ) : (
                <ImagePlaceholder label={m.name} tint={branding.primaryColor} />
              )}
            </div>
            <figcaption className="mt-4">
              <p className="font-semibold text-ink">{m.name}</p>
              <p className="text-sm" style={{ color: brandText(branding) }}>
                {m.role}
              </p>
              {m.note && <p className="mt-1.5 text-sm leading-relaxed text-muted">{m.note}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────
// Native <details>: keyboard accessible and open-by-search-in-page for
// free, with no client JS and no state to get wrong.
export function FaqSection({ props, branding }: { props: FaqProps; branding: SectionBranding }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 font-bold text-ink sm:mb-10" style={h2Style} data-edit="heading">
        {props.heading}
      </h2>
      {props.items.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay preguntas en esta sección.</p>
      ) : (
        <div>
          {props.items.map((item) => (
            <details
              key={item.question}
              className="group border-t py-5"
              style={{ borderColor: withAlpha(branding.primaryColor, 0.15) }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                {item.question}
                <Plus
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-45"
                  style={{ color: brandText(branding) }}
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CTA ─────────────────────────────────────────────────────────────
export function CtaSection({ props, branding }: { props: CtaProps; branding: SectionBranding }) {
  return (
    <div
      className="px-8 py-14 text-center sm:px-14"
      style={{ backgroundColor: branding.primaryColor, borderRadius: 'var(--tpl-radius, 14px)' }}
    >
      <h2
        className="mx-auto max-w-2xl font-bold"
        style={{ ...h2Style, color: 'rgb(' + readableFgRgb(branding.primaryColor) + ')' }}
        data-edit="heading"
      >
        {props.heading}
      </h2>
      {props.body && (
        <p
          className="mx-auto mt-4 max-w-xl text-base leading-relaxed"
          style={{ color: 'rgb(' + readableFgRgb(branding.primaryColor) + ' / 0.78)' }}
          data-edit="body"
        >
          {props.body}
        </p>
      )}
      {props.ctaText && (
        <a
          href={safeHref(props.ctaLink)}
          className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5"
          style={{
            backgroundColor: branding.accentColor,
            color: 'rgb(' + readableFgRgb(branding.accentColor) + ')',
            borderRadius: 'var(--tpl-radius, 14px)',
          }}
        >
          {props.ctaText}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

// ── THE PRACTICAL BLOCKS: HOURS AND LOCATION ────────────────────────
// These were centred cards with a 28px radius, an icon medallion and a
// drop shadow: the one place on the page still speaking the old
// glass-card language, and on a phone a centred paragraph of hours is
// hard to scan. They now read like the price list above them: a heading
// in the template's type, then plain rows on hairlines, left-aligned to
// the same edge as everything else.

// "Martes a viernes: 10:00–20:00" → day on the left, hours on the right.
// A line without a colon is shown whole.
function splitHoursLine(line: string): [string, string | null] {
  const i = line.indexOf(':');
  // A colon followed by a digit right before it is part of a time
  // ("9:00"), not the label separator.
  if (i <= 0 || /\d/.test(line[i - 1] ?? '')) return [line, null];
  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
}

export function HoursSection({ props }: { props: HoursProps }) {
  return (
    <div>
      <h2 className="mb-5 font-bold text-ink" style={h2Style} data-edit="heading">
        {props.heading}
      </h2>
      <dl className="divide-y divide-ink/[0.08] border-y border-ink/[0.08]">
        {props.lines.map((line) => {
          const [label, value] = splitHoursLine(line);
          const closed = value !== null && /cerrado/i.test(value);
          return value === null ? (
            <div key={line} className="py-3.5 text-[15px] text-ink">
              {label}
            </div>
          ) : (
            <div key={line} className="flex items-baseline justify-between gap-6 py-3.5 text-[15px]">
              <dt className="text-ink">{label}</dt>
              <dd className={`text-right tabular-nums ${closed ? 'text-muted' : 'font-medium text-ink'}`}>
                {closed ? 'Cerrado' : value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export function LocationSection({ props, mapHref }: { props: LocationProps; mapHref: string | null }) {
  // With no map link, one is built from the address: every phone opens
  // a Google Maps search URL in its maps app, which is the whole point of
  // this block for someone standing on the street.
  const href =
    mapHref ?? (props.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.address)}` : null);
  return (
    <div>
      <h2 className="mb-4 font-bold text-ink" style={h2Style} data-edit="heading">
        {props.heading}
      </h2>
      {props.address && (
        <p className="max-w-md text-[17px] leading-relaxed text-ink" data-edit="address">
          {props.address}
        </p>
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-ink/[0.12] px-5 py-3 text-sm font-medium text-ink transition-[transform,border-color] duration-150 hover:border-ink/30 active:scale-[0.98] sm:inline-flex sm:w-auto"
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          Cómo llegar
        </a>
      )}
    </div>
  );
}
