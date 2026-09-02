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
import { PLATFORM_PRIMARY, PLATFORM_ACCENT, tenantGlassBackground, tenantCtaStyle } from '@/lib/branding/colors';
import { safeHref } from '@/lib/branding/safeHref';
import BookingFlow from '@/components/booking/BookingFlow';

type BookingData = {
  slug: string;
  businessName?: string;
  services: { id: string; name: string; duration_minutes: number; price_cents: number }[];
  resources: { id: string; name: string }[];
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

// The platform's own light-mode palette, not a tenant-specific default —
// the public booking page shares the same indigo/violet/cyan
// glassmorphism as the admin/tenant dashboards (see reservar/page.tsx).
const DEFAULT_BRANDING: Branding = { primaryColor: PLATFORM_PRIMARY, accentColor: PLATFORM_ACCENT, logoUrl: null };

const PADDING_CLASS: Record<Padding, string> = { sm: 'py-6 px-6', md: 'py-10 px-6', lg: 'py-16 px-6' };
const MAX_WIDTH_CLASS: Record<MaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  full: 'max-w-none',
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
  return (
    <>
      {blocks.map((rawBlock) => {
        const block = normalizeBlock(rawBlock);
        return <BlockItem key={block.id} block={block} bookingData={bookingData} branding={branding} />;
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
      className={`mx-auto ${MAX_WIDTH_CLASS[style.maxWidth]} ${PADDING_CLASS[style.padding]} ${
        style.rounded ? 'rounded-3xl' : ''
      } ${style.shadow ? 'shadow-card' : ''} ${className}`}
      style={bg ? { background: bg } : undefined}
    >
      {children}
    </div>
  );
}

function BlockItem({
  block,
  bookingData,
  branding,
}: {
  block: Block;
  bookingData?: BookingData;
  branding: Branding;
}) {
  switch (block.type) {
    case 'hero': {
      const hasImage = block.props.backgroundImageUrl.trim().length > 0;
      const hasCustomColor = Boolean(block.style.backgroundColor);
      // Default look is a soft-tinted opaque card (matches every other
      // surface on the page) instead of a solid dark gradient block — a
      // saturated color slab was the one thing on the page that didn't
      // match. An explicit style.backgroundColor from the editor, or a
      // background image, still gets dark-overlay + white text like
      // before — those are deliberate choices, not the default. (Named
      // isGlass from when this really was a glass panel — pre-2026
      // redesign — kept as-is since it still marks "the default tinted-
      // card look" accurately enough.)
      const isGlass = !hasImage && !hasCustomColor;
      // BlockBox only adds rounded-3xl when style.rounded is true (a
      // per-block editor toggle, off by default) — but the tinted-card
      // look reads as broken with square corners, so force it on
      // regardless of that toggle.
      const heroStyle = isGlass ? { ...block.style, rounded: true } : block.style;
      return (
        <BlockBox
          style={heroStyle}
          defaultBackground={isGlass ? glassBg(branding, 3) : undefined}
          className={`relative overflow-hidden border ${
            isGlass ? `border-border shadow-card` : 'text-white'
          } ${block.props.align === 'center' ? 'text-center' : 'text-left'}`}
        >
          <div
            className="relative"
            style={
              hasImage
                ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${block.props.backgroundImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    margin: '-2.5rem -1.5rem',
                    padding: '2.5rem 1.5rem',
                  }
                : undefined
            }
          >
            {/* Soft ambient glow in the accent color — decorative, purely
                visual depth, doesn't affect layout or content flow. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
              style={{ backgroundColor: branding.accentColor }}
            />
            <div className="relative">
              {branding.logoUrl && (
                // object-contain (not cover) — a real logo file is
                // usually a wide wordmark or an irregular shape, not a
                // square icon, and cropping it to fill a square box cuts
                // off part of the actual logo. inline-block + the
                // ancestor's own text-center/text-left already handles
                // alignment, so no fixed width is needed here.
                <span
                  className={`mb-4 inline-block max-w-[240px] ${
                    isGlass ? '' : 'rounded-xl bg-white/95 px-3 py-2 shadow-md ring-1 ring-white/50'
                  }`}
                >
                  <img
                    src={branding.logoUrl}
                    alt={block.props.title}
                    className="h-16 w-auto max-w-full object-contain"
                  />
                </span>
              )}
              <h1
                className={`text-4xl font-bold tracking-tight sm:text-5xl ${isGlass ? 'text-ink' : ''}`}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {block.props.title}
              </h1>
              <p className={`mt-3 text-lg ${isGlass ? 'text-muted' : 'text-white/75'}`}>{block.props.subtitle}</p>
              {block.props.ctaText && block.props.ctaLink && (
                <a
                  href={safeHref(block.props.ctaLink)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5"
                  style={tenantCtaStyle(branding.primaryColor, branding.accentColor)}
                >
                  {block.props.ctaText}
                </a>
              )}
            </div>
          </div>
        </BlockBox>
      );
    }

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
                    style={{ backgroundColor: branding.primaryColor, color: branding.accentColor }}
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
                    style={{ backgroundColor: branding.primaryColor, color: branding.accentColor }}
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
        <BlockBox style={block.style} className="text-center">
          <div
            className={`mx-auto max-w-sm rounded-[28px] border border-border px-6 py-7 shadow-sm`}
            style={{ background: glassBg(branding, 2) }}
          >
            <span
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: branding.primaryColor, color: branding.accentColor }}
            >
              <MapPin className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
              {block.props.heading}
            </h2>
            {block.props.address && <p className="mt-2 text-muted">{block.props.address}</p>}
            {block.props.mapUrl && (
              <a
                href={safeHref(block.props.mapUrl)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-full border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-primary/30"
              >
                Ver en el mapa
              </a>
            )}
          </div>
        </BlockBox>
      );

    case 'hours':
      return (
        <BlockBox style={block.style} className="text-center">
          <div
            className={`mx-auto max-w-sm rounded-[28px] border border-border px-6 py-7 shadow-sm`}
            style={{ background: glassBg(branding, 2) }}
          >
            <span
              className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: branding.primaryColor, color: branding.accentColor }}
            >
              <Clock3 className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
              {block.props.heading}
            </h2>
            <ul className="mx-auto mt-2 flex flex-col gap-1 text-sm text-muted">
              {block.props.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
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

    case 'booking':
      if (!bookingData) {
        // Template editor context — no real tenant, so no real services
        // to fetch. Show what BookingFlow actually looks like (same
        // step pills, same card styling) with sample data instead of a
        // blank placeholder, so the preview isn't misleading about
        // whether the new design is actually wired in.
        return <BookingFlowMockPreview branding={branding} />;
      }
      return (
        <div className="mx-auto max-w-lg px-6 py-10">
          <div
            className={`rounded-[32px] border border-border p-6 shadow-card sm:p-8`}
            style={{ background: glassBg(branding, 3) }}
          >
            <BookingFlow
              slug={bookingData.slug}
              businessName={bookingData.businessName}
              services={bookingData.services}
              resources={bookingData.resources}
              accentColor={branding.accentColor}
              primaryColor={branding.primaryColor}
            />
          </div>
        </div>
      );
  }
}

const MOCK_STEPS = ['Servicio', 'Fecha', 'Hora', 'Datos', 'Confirmación'];
const MOCK_SERVICES = [
  { name: 'Corte de cabello', duration: 30, price: 300 },
  { name: 'Barba', duration: 20, price: 150 },
];

function BookingFlowMockPreview({ branding }: { branding: Branding }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <div
        className="rounded-[32px] border border-border p-6 shadow-card sm:p-8"
        style={{ background: tenantGlassBackground(branding.primaryColor, branding.accentColor, 3) }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
          {MOCK_STEPS.map((label, i) => (
            <span
              key={label}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={
                i === 0
                  ? { backgroundColor: branding.accentColor, color: branding.primaryColor }
                  : { backgroundColor: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.4)' }
              }
            >
              {label}
            </span>
          ))}
        </div>
        <p className="mb-3 text-center text-xs text-muted">
          Vista previa del flujo de reserva real — con datos de ejemplo, no interactivo aquí
        </p>
        <div className="flex flex-col gap-3">
          {MOCK_SERVICES.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-3xl border border-black/5 bg-white px-5 py-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div>
                <p className="font-medium text-ink">{s.name}</p>
                <p className="text-sm text-muted">{s.duration} min</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-ink">${s.price.toFixed(2)} MXN</p>
                <span
                  className="rounded-full px-4 py-1.5 text-xs font-medium"
                  style={tenantCtaStyle(branding.primaryColor, branding.accentColor)}
                >
                  Seleccionar
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
