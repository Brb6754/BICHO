import {
  Check,
  Star,
  MapPin,
  Clock3,
  Phone,
  MessageCircle,
  Camera,
  Users,
  Music2,
  type LucideIcon,
} from 'lucide-react';
import type { Block, BlockStyle, Padding, MaxWidth } from '@/lib/templates/blocks';
import { normalizeBlock } from '@/lib/templates/blocks';
import {
  PLATFORM_PRIMARY,
  PLATFORM_ACCENT,
  tenantGlassBackground,
  tenantCtaStyle,
  contrastRatio,
  readableFgRgb,
} from '@/lib/branding/colors';
import { safeHref } from '@/lib/branding/safeHref';
import BookingFlow from '@/components/booking/BookingFlow';
import {
  HeroSection,
  ServicesSection,
  SplitSection,
  TeamSection,
  FaqSection,
  CtaSection,
  HoursSection,
  LocationSection,
} from './Sections';

type BookingData = {
  slug: string;
  businessName?: string;
  services: { id: string; name: string; duration_minutes: number; price_cents: number }[];
  resources: { id: string; name: string }[];
  timezone?: string | null;
};

// isDark/darkBase are optional so every existing caller (template
// editor preview, anything not yet dark-aware) keeps working exactly
// as before — only reservar/page.tsx passes them, when the tenant's
// theme_mode is 'dark'.
type Branding = {
  primaryColor: string;
  accentColor: string;
  logoUrl?: string | null;
  isDark?: boolean;
  darkBase?: string;
};

// Every glass surface below should go through this instead of calling
// tenantGlassBackground directly — keeps the isDark/darkBase branch in
// one place instead of repeating `branding.isDark ? branding.darkBase
// : undefined` at each of the 7 call sites.
function glassBg(branding: Branding, level: 1 | 2 | 3): string {
  return tenantGlassBackground(branding.primaryColor, branding.accentColor, level, branding.isDark ? branding.darkBase : undefined);
}

// A small icon on a primary-filled badge. The accent is the on-brand
// choice, but two light (or two dark) brand colors made the icon vanish;
// icons need 3:1, so below that it switches to black or white.
function iconBadgeStyle(branding: Branding): React.CSSProperties {
  const fg =
    contrastRatio(branding.accentColor, branding.primaryColor) >= 3
      ? branding.accentColor
      : 'rgb(' + readableFgRgb(branding.primaryColor) + ')';
  return { backgroundColor: branding.primaryColor, color: fg };
}

// The platform's own light-mode palette, not a tenant-specific default —
// the public booking page shares the same indigo/violet/cyan
// glassmorphism as the admin/tenant dashboards (see reservar/page.tsx).
const DEFAULT_BRANDING: Branding = { primaryColor: PLATFORM_PRIMARY, accentColor: PLATFORM_ACCENT, logoUrl: null };

// Vertical rhythm comes from the template's own design language
// (--tpl-space, set by templateDesignCssVars) rather than three fixed
// Tailwind values, so a "cinematic" template actually breathes
// differently from a "compact" one instead of just recolouring.
// The multipliers keep the three editor options meaningful within that.
const PADDING_STYLE: Record<Padding, React.CSSProperties> = {
  sm: { paddingTop: 'calc(var(--tpl-space, 5rem) * 0.4)', paddingBottom: 'calc(var(--tpl-space, 5rem) * 0.4)' },
  md: { paddingTop: 'calc(var(--tpl-space, 5rem) * 0.7)', paddingBottom: 'calc(var(--tpl-space, 5rem) * 0.7)' },
  lg: { paddingTop: 'var(--tpl-space, 5rem)', paddingBottom: 'var(--tpl-space, 5rem)' },
};

// THE single biggest cause of every template looking identical: these
// four keys used to resolve to max-w-sm / max-w-md / max-w-2xl — so the
// DEFAULT block rendered 448px wide on a 1440px screen (measured), and
// the widest option available was 672px. A page built from those can
// only ever be a narrow centred column of stacked boxes, no matter what
// colours or fonts it uses. Full-bleed and split compositions weren't
// styled badly, they were unreachable.
//
// The keys are unchanged so every block already saved in the DB keeps
// working and simply gets wider; only what they mean changed.
const MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  // px-5 on phones matches the header and the booking sheet, so every
  // block on the page starts at the same 20px edge. It was px-6, which
  // put the blocks 4px in from the header above them.
  sm: 'max-w-2xl px-5 sm:px-6', // reading measure — long-form text
  md: 'max-w-4xl px-5 sm:px-6', // default content column
  lg: 'max-w-6xl px-5 sm:px-6', // wide — grids, galleries, service menus
  full: 'max-w-none px-0', // edge to edge; the block owns its own insets
};

// lucide-react doesn't ship brand logos (dropped for licensing reasons) —
// generic outline metaphors instead, consistent with the rest of the set.
const SOCIAL_ICON: Record<string, LucideIcon> = {
  instagram: Camera,
  facebook: Users,
  whatsapp: MessageCircle,
  tiktok: Music2,
};

const SOCIAL_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
};

// The single source of truth for how a block renders — used by the real
// public /reservar page AND (without bookingData) as the preview inside
// the template editor. What you see in the editor is what actually ships.
// branding is per-tenant (colors come from the tenants table, see
// db/009) — inline style, not a Tailwind class, since a runtime color
// value has no corresponding build-time-generated CSS class.
export function BlockRenderer({
  blocks,
  bookingData,
  branding = DEFAULT_BRANDING,
}: {
  blocks: Block[];
  bookingData?: BookingData;
  branding?: Branding;
}) {
  // The booking block's editor preview needs example services. Taking
  // them from THIS page's own "Servicios y precios" section is what
  // keeps a padel template from advertising "Corte de cabello $300" —
  // which is what a single hardcoded list did in all six templates.
  const servicesBlock = blocks.find((b) => b.type === 'services');
  const sampleServices =
    servicesBlock && servicesBlock.type === 'services'
      ? servicesBlock.props.items.slice(0, 3).map((i) => ({
          name: i.name,
          price: i.price,
          duration: i.duration,
        }))
      : [];

  return (
    <>
      {blocks.filter((b) => !b.hidden).map((rawBlock) => {
        const block = normalizeBlock(rawBlock);
        return (
          <BlockItem
            key={block.id}
            block={block}
            bookingData={bookingData}
            branding={branding}
            sampleServices={sampleServices}
          />
        );
      })}
    </>
  );
}

// Box wrapper shared by every block type — background/padding/max-width/
// rounded/shadow all come from the block's own `style`, independent of
// its content type. defaultBackground is what a block falls back to when
// the editor hasn't set an explicit background color (e.g. hero defaults
// to a gradient built from the tenant's brand color). Uses the CSS
// `background` shorthand rather than `backgroundColor` so a default can
// be either a solid color or a gradient string — an explicit
// `style.backgroundColor` from the editor always wins and is always a
// flat color, matching what the color picker in the editor sets.
function BlockBox({
  style,
  defaultBackground,
  className = '',
  children,
}: {
  style: BlockStyle;
  defaultBackground?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const bg = style.backgroundColor ?? defaultBackground;
  return (
    <div
      className={`mx-auto ${MAX_WIDTH_CLASS[style.maxWidth]} ${style.shadow ? 'shadow-card' : ''} ${className}`}
      style={{
        ...PADDING_STYLE[style.padding],
        // Radius follows the template's shape language rather than a
        // hard-coded rounded-3xl, so "sharp" templates are actually
        // sharp. Still gated on the per-block toggle.
        ...(style.rounded ? { borderRadius: 'var(--tpl-radius, 28px)' } : null),
        ...(bg ? { background: bg } : null),
      }}
    >
      {children}
    </div>
  );
}

function BlockItem({
  block,
  bookingData,
  branding,
  sampleServices = [],
}: {
  block: Block;
  bookingData?: BookingData;
  branding: Branding;
  sampleServices?: { name: string; price: string; duration: string }[];
}) {
  switch (block.type) {
    // Hero is no longer one rendering with an `align` toggle — it
    // dispatches to five real compositions (see HeroSection). It also
    // opts out of BlockBox entirely: a fullscreen or split hero has to
    // own its own edges, and BlockBox's centred max-width column is
    // exactly what made every hero look the same.
    case 'hero':
      return <HeroSection variant={block.variant} props={block.props} branding={branding} />;

    case 'text':
      return (
        <BlockBox
          style={block.style}
          className={
            block.props.align === 'left' ? 'text-left' : block.props.align === 'right' ? 'text-right' : 'text-center'
          }
        >
          <h2
            className={`font-bold tracking-tight text-ink ${block.props.size === 'lg' ? 'text-3xl' : block.props.size === 'sm' ? 'text-lg' : 'text-2xl'}`}
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {block.props.heading}
          </h2>
          <p className="mt-3 leading-relaxed text-muted">{block.props.body}</p>
        </BlockBox>
      );

    case 'features':
      return (
        <BlockBox style={block.style}>
          <h2 className="mb-5 text-center text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
            {block.props.heading}
          </h2>
          {block.props.layout === 'grid' ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {block.props.items.map((item) => (
                <li
                  key={item}
                  className={`flex flex-col items-center gap-2 rounded-2xl border border-border p-4 text-center text-sm font-medium text-ink shadow-sm transition duration-200 hover:-translate-y-0.5`}
                  style={{ background: glassBg(branding, 1) }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={iconBadgeStyle(branding)}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {block.props.items.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-ink">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={iconBadgeStyle(branding)}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </BlockBox>
      );

    case 'testimonial':
      return (
        <BlockBox style={block.style}>
          <div
            className={`mx-auto max-w-lg rounded-[28px] border border-border px-6 py-8 text-center shadow-card`}
            style={{ background: glassBg(branding, 2) }}
          >
            {block.props.avatarUrl && (
              <img
                src={block.props.avatarUrl}
                alt={block.props.author}
                className="mx-auto mb-3 h-14 w-14 rounded-full object-cover shadow-sm"
              />
            )}
            {block.props.rating > 0 && (
              <p className="mb-3 flex justify-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) =>
                  i < block.props.rating ? (
                    <Star
                      key={i}
                      className="h-4 w-4"
                      style={{ color: branding.accentColor }}
                      fill={branding.accentColor}
                    />
                  ) : (
                    <Star key={i} className="h-4 w-4 text-ink/10" fill="none" />
                  )
                )}
              </p>
            )}
            <p className="text-lg italic leading-relaxed text-ink">&quot;{block.props.quote}&quot;</p>
            <p className="mt-4 text-sm font-medium text-muted">— {block.props.author}</p>
          </div>
        </BlockBox>
      );

    case 'gallery':
      return (
        <BlockBox style={block.style}>
          {block.props.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {block.props.images.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="aspect-square w-full rounded-2xl object-cover shadow-sm transition duration-200 hover:scale-[1.02] hover:shadow-md"
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted">Agrega imágenes en el editor.</p>
          )}
        </BlockBox>
      );

    case 'location':
      return (
        <BlockBox style={block.style}>
          <LocationSection props={block.props} mapHref={block.props.mapUrl ? safeHref(block.props.mapUrl) : null} />
        </BlockBox>
      );

    case 'hours':
      return (
        <BlockBox style={block.style}>
          <HoursSection props={block.props} />
        </BlockBox>
      );

    case 'social':
      return (
        <BlockBox style={block.style} className="flex flex-wrap justify-center gap-3">
          {block.props.links.map((link) => {
            const Icon = SOCIAL_ICON[link.platform];
            return (
              <a
                key={link.platform}
                href={safeHref(link.url)}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-ink shadow-sm transition duration-200 hover:-translate-y-0.5`}
                style={{ background: glassBg(branding, 1) }}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {SOCIAL_LABEL[link.platform]}
              </a>
            );
          })}
        </BlockBox>
      );

    case 'contact_button': {
      const href = block.props.kind === 'whatsapp'
        ? `https://wa.me/${block.props.phone.replace(/\D/g, '')}`
        : `tel:${block.props.phone}`;
      return (
        <BlockBox style={block.style} className="text-center">
          <a
            href={href}
            target={block.props.kind === 'whatsapp' ? '_blank' : undefined}
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5"
            style={tenantCtaStyle(branding.primaryColor, branding.accentColor)}
          >
            {block.props.kind === 'whatsapp' ? <MessageCircle className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            {block.props.label}
          </a>
        </BlockBox>
      );
    }

    case 'spacer': {
      const height = { sm: '1rem', md: '2.5rem', lg: '5rem' }[block.props.height];
      return <div style={{ height, backgroundColor: block.style.backgroundColor ?? undefined }} />;
    }

    case 'services':
      return (
        <BlockBox style={block.style}>
          <ServicesSection variant={block.variant} props={block.props} branding={branding} />
        </BlockBox>
      );

    case 'split':
      return (
        <BlockBox style={block.style}>
          <SplitSection variant={block.variant} props={block.props} branding={branding} />
        </BlockBox>
      );

    case 'team':
      return (
        <BlockBox style={block.style}>
          <TeamSection variant={block.variant} props={block.props} branding={branding} />
        </BlockBox>
      );

    case 'faq':
      return (
        <BlockBox style={block.style}>
          <FaqSection props={block.props} branding={branding} />
        </BlockBox>
      );

    case 'cta':
      return (
        <BlockBox style={block.style}>
          <CtaSection props={block.props} branding={branding} />
        </BlockBox>
      );

    case 'booking':
      if (!bookingData) {
        // Template editor context — no real tenant, so no real services
        // to fetch. Show what BookingFlow actually looks like (same
        // step pills, same card styling) with sample data instead of a
        // blank placeholder, so the preview isn't misleading about
        // whether the new design is actually wired in.
        return <BookingFlowMockPreview branding={branding} sample={sampleServices} />;
      }
      return (
        // On a phone the card is a full-width sheet, not a floating box:
        // 20px of page margin plus 20px of card padding on each side left
        // the calendar ~295px on a 375px screen (and 240px on a 320px
        // one). Edge to edge, its content lines up with the header text
        // and gets that width back. From sm up it floats again.
        //
        // The one element on the page that gets real elevation. A
        // booking page has exactly one job, so exactly one surface
        // should look raised — everything else sits flat on the
        // ground. Wider measure (max-w-2xl) because the flow holds a
        // calendar and a grid of times, and cramming those into 512px
        // was making the page feel like a phone screenshot on desktop.
        // Wider from lg because the flow now lays out in two columns
        // there (step on the left, summary and action on the right), and
        // 672px squeezed both into gutters.
        //
        // No card treatment here any more: BookingFlow renders its own
        // surface, border and elevation, so wrapping it in a second one
        // was drawing two cards inside each other. This is now only a
        // measure and some page padding.
        <div className="mx-auto max-w-2xl sm:px-6 sm:py-14 lg:max-w-4xl">
          <div>
            <BookingFlow
              slug={bookingData.slug}
              businessName={bookingData.businessName}
              services={bookingData.services}
              resources={bookingData.resources}
              accentColor={branding.accentColor}
              primaryColor={branding.primaryColor}
              timezone={bookingData.timezone}
            />
          </div>
        </div>
      );
  }
}

// Used only when the page has no "Servicios y precios" section to borrow
// from. Deliberately nameless: inventing "Corte de cabello" here is what
// put a barbershop price list inside the padel template.
const FALLBACK_SERVICES = [
  { name: 'Tu primer servicio', duration: '30 min', price: '$—' },
  { name: 'Tu segundo servicio', duration: '45 min', price: '$—' },
];

// What the booking block looks like in the editor, where there is no
// tenant and so no real services. It mirrors the live first step of
// BookingFlow exactly: same card, same template-typed prompt, same
// full-width rows. It used to show a numbered step rail and one card
// per service with a "Seleccionar" button, a design the real flow
// dropped, so the editor was promising a page that no longer exists.
function BookingFlowMockPreview({
  branding,
  sample = [],
}: {
  branding: Branding;
  sample?: { name: string; price: string; duration: string }[];
}) {
  const services = sample.length > 0 ? sample : FALLBACK_SERVICES;
  return (
    <div className="mx-auto max-w-2xl sm:px-6 sm:py-14">
      <div
        className="-mt-px border-y border-ink/[0.08] px-5 pb-8 pt-7 sm:mt-0 sm:rounded-3xl sm:border sm:p-8 sm:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.14)]"
        style={{ background: glassBg(branding, 3) }}
      >
        <div className="flex flex-col gap-5">
          <h2
            className="text-xl font-semibold text-ink"
            style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))', letterSpacing: 'var(--tpl-heading-tracking)' }}
          >
            Elige un servicio
          </h2>
          <ul className="-mx-2 flex flex-col">
            {services.map((s, i) => (
              <li
                key={s.name + i}
                className={'flex items-baseline gap-4 px-2 py-4 ' + (i > 0 ? 'border-t border-ink/[0.07]' : '')}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{s.name}</span>
                  <span className="mt-0.5 block text-sm text-muted">{s.duration}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold tabular-nums text-ink">{s.price}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Vista previa. En la página publicada aparecen los servicios reales del negocio, con sus
            horarios libres.
          </p>
        </div>
      </div>
    </div>
  );
}
