// ============================================================
// TEMPLATE BLOCK SCHEMA
//
// Phase 2 of the template-system rebuild. The audit found four
// architectural reasons every template looked the same; three of them
// are fixed here, in the schema, because they could not be fixed in CSS:
//
//  1. THE PAGE HAD NO LAYOUT. Every block rendered mx-auto inside a
//     max-w-md box — a 448px centered column on a 1440px screen
//     (measured, not guessed). Full-bleed, split-screen, asymmetric and
//     grid compositions were physically impossible. The MaxWidth KEYS
//     are unchanged so existing saved blocks keep working, but what they
//     RESOLVE to is now a real page-width scale (see MAX_WIDTH_CLASS in
//     BlockRenderer).
//
//  2. BLOCKS HAD NO VARIANTS. One type meant exactly one rendering; the
//     whole visual vocabulary was hero.align and features.layout. Every
//     block now carries a `variant`, which is what lets a hero be
//     editorial in one template and full-bleed in another without
//     forking the renderer.
//
//  3. THE BLOCK VOCABULARY WAS INDUSTRY-BLIND. eleven generic types
//     (hero/text/features/...) meant a padel club and a dental clinic
//     could only be assembled from the same boxes. `features` in
//     particular was a list of plain strings, so no template could
//     express the one thing all six industries actually sell: a service
//     with a price and a duration. Hence the new `services`, `team`,
//     `split`, `faq` and `cta` types.
//
// The fourth cause — a template carrying no design language of its own —
// is handled by TemplateDesign at the bottom of this file.
//
// IMPORTANT: differentiation between templates must live in COMPOSITION,
// not colour. Colour is the one thing every tenant overrides the moment
// they configure their brand (BlockRenderer receives `branding` from the
// tenants row, not from the template), so a template whose identity is
// "the pink one" has no identity left after five minutes of setup.
// ============================================================

export type BlockType =
  | 'hero'
  | 'text'
  | 'features'
  | 'services'
  | 'team'
  | 'split'
  | 'faq'
  | 'cta'
  | 'testimonial'
  | 'booking'
  | 'gallery'
  | 'location'
  | 'hours'
  | 'social'
  | 'contact_button'
  | 'spacer';

// Names a salesperson can read. These used to be the designer's words
// for the same things — "Llamada a la acción", "Lista de
// características", "Separador" — and a rep setting up a barbershop had
// no way to guess which one held the prices. The rule: say what the
// section IS to the business, not what it is to a layout system.
export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Portada',
  text: 'Un texto suelto',
  features: 'Por qué elegirnos',
  services: 'Servicios y precios',
  team: 'Quién atiende',
  split: 'Foto con texto al lado',
  faq: 'Preguntas frecuentes',
  cta: 'Invitación a reservar',
  testimonial: 'Lo que dicen los clientes',
  booking: 'Las citas',
  gallery: 'Fotos del lugar',
  location: 'Dónde estamos',
  hours: 'Horarios',
  social: 'Redes sociales',
  contact_button: 'Botón de WhatsApp o llamada',
  spacer: 'Espacio en blanco',
};

// One line under each name, so you know what a section does BEFORE
// adding it instead of adding it to find out. Shown in the palette and
// at the top of the inspector.
export const BLOCK_HINTS: Record<BlockType, string> = {
  hero: 'El nombre del negocio y una frase, hasta arriba de todo.',
  text: 'Un párrafo libre, para lo que no cabe en las otras secciones.',
  features: 'Tres o cuatro razones cortas para venir aquí y no con la competencia.',
  services: 'La lista de lo que hace el negocio, con cuánto cuesta y cuánto dura.',
  team: 'Las personas que atienden, con foto si tienes.',
  split: 'Una foto grande de un lado y un texto del otro.',
  faq: 'Las dudas que siempre le preguntan al negocio, ya contestadas.',
  cta: 'Un empujón para que reserven, a media página.',
  testimonial: 'Una reseña de un cliente real. No inventes una.',
  booking: 'Donde el cliente elige día y hora. Esta no se puede quitar.',
  gallery: 'Fotos del local, de trabajos, del equipo.',
  location: 'La dirección y un enlace al mapa.',
  hours: 'A qué hora abren y cierran cada día.',
  social: 'Enlaces a Instagram, Facebook, TikTok.',
  contact_button: 'Un botón que abre WhatsApp o marca el teléfono.',
  spacer: 'Un respiro entre dos secciones. No se ve, solo separa.',
};

// The palette used to be fifteen options in one column, sorted by
// nothing in particular. Grouped by what the rep is trying to do, the
// same fifteen become three short lists you can scan.
export const BLOCK_GROUPS: { label: string; hint: string; types: BlockType[] }[] = [
  {
    label: 'Lo importante',
    hint: 'Lo que casi toda página necesita.',
    types: ['hero', 'services', 'cta'],
  },
  {
    label: 'Para convencer',
    hint: 'Razones para elegir este negocio.',
    types: ['features', 'gallery', 'testimonial', 'team', 'split', 'faq'],
  },
  {
    label: 'Datos prácticos',
    hint: 'Dónde, cuándo y cómo contactarlos.',
    types: ['location', 'hours', 'contact_button', 'social'],
  },
  {
    label: 'Formato',
    hint: 'Para acomodar lo demás.',
    types: ['text', 'spacer'],
  },
];

// Every block type except "booking" can be added freely. "booking" is
// created once by the DB seed and must stay exactly one — enforced in
// TemplateBuilder.tsx (the "+" menu excludes it, delete is disabled for it).
export const ADDABLE_BLOCK_TYPES: BlockType[] = [
  'hero',
  'split',
  'services',
  'features',
  'team',
  'gallery',
  'testimonial',
  'faq',
  'cta',
  'text',
  'location',
  'hours',
  'social',
  'contact_button',
  'spacer',
];

// ============================================================
// Block-level box style — independent of the block's own content
// (props). Applied uniformly by BlockRenderer regardless of type, so
// every block (including future ones) gets the same box controls for
// free. backgroundColor is a hex value or null (= transparent/inherit
// the page background) — always applied via inline style, never a
// Tailwind class, since a runtime color has no build-time-generated
// class (see the cascade gotcha notes elsewhere in this codebase).
// ============================================================
export type Padding = 'sm' | 'md' | 'lg';
export type MaxWidth = 'sm' | 'md' | 'lg' | 'full';

export type BlockStyle = {
  backgroundColor: string | null;
  padding: Padding;
  maxWidth: MaxWidth;
  rounded: boolean;
  shadow: boolean;
};

export const DEFAULT_STYLE: BlockStyle = {
  backgroundColor: null,
  padding: 'md',
  // Was 'md' when 'md' meant 448px. The key is the same so nothing
  // saved in the DB breaks; it now resolves to a real content width.
  maxWidth: 'md',
  rounded: false,
  shadow: false,
};

export const PADDING_LABELS: Record<Padding, string> = { sm: 'Chico', md: 'Medio', lg: 'Grande' };
export const MAX_WIDTH_LABELS: Record<MaxWidth, string> = {
  sm: 'Angosto (lectura)',
  md: 'Contenido',
  lg: 'Ancho',
  full: 'A sangre',
};

// ============================================================
// Variants. This is the axis the old schema was missing entirely.
// A variant changes COMPOSITION (where the image sits, whether the
// type is stacked or split, whether items are a menu or a grid) —
// never just colour, which the tenant overrides anyway.
// ============================================================
export type HeroVariant =
  | 'header' // compact identity band — the booking-page default
  | 'editorial' // oversized type, image offset to one side, asymmetric
  | 'fullscreen' // edge-to-edge image, type overlaid low-left
  | 'split' // 50/50 type | image, hard vertical seam
  | 'minimal' // type only, generous air, no image
  | 'overlay'; // image with a centred type block floating over it

export type ServicesVariant =
  | 'menu' // priced list with leader rules — reads like a printed menu
  | 'cards' // conventional card grid
  | 'editorial' // large numbered entries, one per row
  | 'compact'; // dense two-column list

export type GalleryVariant =
  | 'grid' // even grid
  | 'mosaic' // mixed sizes, editorial
  | 'strip'; // horizontal scroll

export type TestimonialVariant =
  | 'quote' // one large pull quote, typographic
  | 'card' // bordered card
  | 'wall'; // several short reviews

export type TeamVariant =
  | 'portraits' // large photos, name below
  | 'roster'; // compact list with role

export type SplitVariant =
  | 'image-left'
  | 'image-right'
  | 'offset'; // image bleeds past the text column

export type BlockVariant =
  | HeroVariant
  | ServicesVariant
  | GalleryVariant
  | TestimonialVariant
  | TeamVariant
  | SplitVariant
  | 'default';

// Which variants the editor should offer per type, and what to call
// them. Types absent from this map have a single rendering.
// Variant names now describe what you will SEE, not the art-direction
// term for it. "Editorial", "Minimal" and "Overlay" told a rep nothing;
// "Foto de fondo con el texto encima" tells them exactly what changes.
export const BLOCK_VARIANTS: Partial<Record<BlockType, { value: string; label: string }[]>> = {
  hero: [
    { value: 'header', label: 'Solo el nombre, compacto' },
    { value: 'editorial', label: 'Título enorme a la izquierda' },
    { value: 'fullscreen', label: 'Ocupa toda la pantalla' },
    { value: 'split', label: 'Texto y foto, mitad y mitad' },
    { value: 'minimal', label: 'Solo el título, centrado' },
    { value: 'overlay', label: 'Foto de fondo con el texto encima' },
  ],
  services: [
    { value: 'menu', label: 'Lista con el precio a la derecha' },
    { value: 'cards', label: 'Una tarjeta por servicio' },
    { value: 'editorial', label: 'Lista numerada, grande' },
    { value: 'compact', label: 'Lista apretada, sin descripción' },
  ],
  gallery: [
    { value: 'grid', label: 'Cuadrícula pareja' },
    { value: 'mosaic', label: 'Fotos de distintos tamaños' },
    { value: 'strip', label: 'Una fila que se desliza' },
  ],
  testimonial: [
    { value: 'quote', label: 'La frase en grande' },
    { value: 'card', label: 'En una tarjeta' },
    { value: 'wall', label: 'Varias reseñas juntas' },
  ],
  team: [
    { value: 'portraits', label: 'Con foto de cada quien' },
    { value: 'roster', label: 'Solo los nombres' },
  ],
  split: [
    { value: 'image-left', label: 'Foto a la izquierda' },
    { value: 'image-right', label: 'Foto a la derecha' },
    { value: 'offset', label: 'Foto que se sale del margen' },
  ],
};

export const DEFAULT_VARIANT: Record<BlockType, string> = {
  // 'header', not a poster: this is a booking page, and a full-height
  // hero pushes the one thing the visitor came for below the fold.
  hero: 'header',
  text: 'default',
  features: 'default',
  services: 'menu',
  team: 'portraits',
  split: 'image-right',
  faq: 'default',
  cta: 'default',
  testimonial: 'quote',
  booking: 'default',
  gallery: 'grid',
  location: 'default',
  hours: 'default',
  social: 'default',
  contact_button: 'default',
  spacer: 'default',
};

// ============================================================
// Per-type content props.
// ============================================================
export type HeroProps = {
  title: string;
  subtitle: string;
  backgroundImageUrl: string;
  align: 'left' | 'center';
  ctaText: string;
  ctaLink: string;
  // Short line above the title (a category, a location, a promise).
  // Editorial and split heroes lean on it; minimal ignores it.
  eyebrow: string;
};

export type TextProps = {
  heading: string;
  body: string;
  align: 'left' | 'center' | 'right';
  size: 'sm' | 'md' | 'lg';
};

export type FeaturesProps = {
  heading: string;
  items: string[];
  layout: 'list' | 'grid';
};

// The type the old schema was missing. Every one of the six industries
// sells a named thing with a price and a duration; `features` (an array
// of plain strings) could not express that, which is why every template
// fell back to a generic bullet list.
export type ServiceItem = {
  name: string;
  description: string;
  price: string;
  duration: string;
};

export type ServicesProps = {
  heading: string;
  intro: string;
  items: ServiceItem[];
};

export type TeamMember = {
  name: string;
  role: string;
  photoUrl: string;
  note: string;
};

export type TeamProps = {
  heading: string;
  intro: string;
  members: TeamMember[];
};

export type SplitProps = {
  eyebrow: string;
  heading: string;
  body: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
};

export type FaqItem = { question: string; answer: string };

export type FaqProps = {
  heading: string;
  items: FaqItem[];
};

export type CtaProps = {
  heading: string;
  body: string;
  ctaText: string;
  ctaLink: string;
};

export type TestimonialProps = {
  quote: string;
  author: string;
  avatarUrl: string;
  rating: number; // 0 = no mostrar estrellas
};

export type BookingProps = Record<string, never>;

export type GalleryProps = {
  images: string[]; // URLs
};

export type LocationProps = {
  heading: string;
  address: string;
  mapUrl: string;
};

export type HoursProps = {
  heading: string;
  lines: string[]; // e.g. "Lunes a viernes: 9:00–18:00"
};

export type SocialLink = { platform: 'instagram' | 'facebook' | 'whatsapp' | 'tiktok'; url: string };

export type SocialProps = {
  links: SocialLink[];
};

export type ContactButtonProps = {
  label: string;
  phone: string;
  kind: 'call' | 'whatsapp';
};

export type SpacerProps = {
  height: 'sm' | 'md' | 'lg';
};

// `hidden` lets the editor take a section out of the published page
// without deleting it — the brief's "ocultar / restaurar sección".
// It's on the base rather than in BlockStyle because it isn't styling:
// BlockRenderer drops these entirely on the public page, while the
// editor still shows them (greyed) so they can be brought back.
type BlockBase = { id: string; style: BlockStyle; variant: string; hidden?: boolean };

export type Block =
  | (BlockBase & { type: 'hero'; props: HeroProps })
  | (BlockBase & { type: 'text'; props: TextProps })
  | (BlockBase & { type: 'features'; props: FeaturesProps })
  | (BlockBase & { type: 'services'; props: ServicesProps })
  | (BlockBase & { type: 'team'; props: TeamProps })
  | (BlockBase & { type: 'split'; props: SplitProps })
  | (BlockBase & { type: 'faq'; props: FaqProps })
  | (BlockBase & { type: 'cta'; props: CtaProps })
  | (BlockBase & { type: 'testimonial'; props: TestimonialProps })
  | (BlockBase & { type: 'booking'; props: BookingProps })
  | (BlockBase & { type: 'gallery'; props: GalleryProps })
  | (BlockBase & { type: 'location'; props: LocationProps })
  | (BlockBase & { type: 'hours'; props: HoursProps })
  | (BlockBase & { type: 'social'; props: SocialProps })
  | (BlockBase & { type: 'contact_button'; props: ContactButtonProps })
  | (BlockBase & { type: 'spacer'; props: SpacerProps });

export function createDefaultBlock(type: BlockType): Block {
  const id = `${type}-${Math.random().toString(36).slice(2, 10)}`;
  const style = { ...DEFAULT_STYLE };
  const variant = DEFAULT_VARIANT[type];
  const base = { id, style, variant };

  switch (type) {
    case 'hero':
      return {
        ...base,
        type,
        props: {
          title: 'Título',
          subtitle: 'Subtítulo',
          backgroundImageUrl: '',
          align: 'center',
          ctaText: '',
          ctaLink: '',
          eyebrow: '',
        },
      };
    case 'text':
      return { ...base, type, props: { heading: 'Encabezado', body: 'Escribe aquí...', align: 'center', size: 'md' } };
    case 'features':
      return { ...base, type, props: { heading: 'Por qué elegirnos', items: ['Característica 1'], layout: 'list' } };
    case 'services':
      return {
        ...base,
        type,
        props: {
          heading: 'Servicios',
          intro: '',
          items: [{ name: 'Servicio', description: '', price: '$0', duration: '30 min' }],
        },
      };
    case 'team':
      return {
        ...base,
        type,
        props: { heading: 'El equipo', intro: '', members: [{ name: 'Nombre', role: 'Puesto', photoUrl: '', note: '' }] },
      };
    case 'split':
      return {
        ...base,
        type,
        props: { eyebrow: '', heading: 'Encabezado', body: 'Escribe aquí...', imageUrl: '', ctaText: '', ctaLink: '' },
      };
    case 'faq':
      return {
        ...base,
        type,
        props: { heading: 'Preguntas frecuentes', items: [{ question: '¿Pregunta?', answer: 'Respuesta.' }] },
      };
    case 'cta':
      return { ...base, type, props: { heading: '¿Listo?', body: '', ctaText: 'Reservar', ctaLink: '' } };
    case 'testimonial':
      return { ...base, type, props: { quote: 'Excelente servicio.', author: 'Nombre del cliente', avatarUrl: '', rating: 5 } };
    case 'booking':
      return { ...base, type, props: {} };
    case 'gallery':
      return { ...base, type, props: { images: [] } };
    case 'location':
      return { ...base, type, props: { heading: 'Dónde estamos', address: '', mapUrl: '' } };
    case 'hours':
      return { ...base, type, props: { heading: 'Horario de atención', lines: ['Lunes a viernes: 9:00–18:00'] } };
    case 'social':
      return { ...base, type, props: { links: [] } };
    case 'contact_button':
      return { ...base, type, props: { label: 'Escríbenos', phone: '', kind: 'whatsapp' } };
    case 'spacer':
      return { ...base, type, props: { height: 'md' } };
  }
}

// Blocks saved before any given schema change are missing whatever that
// change added — `style` before the box system, the newer per-type prop
// keys, and now `variant`. Merging onto a freshly created default block
// of the same type fills every gap without clobbering anything the block
// already had, which is why none of these schema extensions has ever
// needed a data migration.
export function normalizeBlock(raw: Block): Block {
  const fallback = createDefaultBlock(raw.type);
  return {
    ...raw,
    style: { ...fallback.style, ...(raw.style ?? {}) },
    variant: raw.variant ?? fallback.variant,
    props: { ...fallback.props, ...(raw.props ?? {}) },
  } as Block;
}

// ============================================================
// TEMPLATE DESIGN LANGUAGE
//
// The fourth cause of sameness: a template row carried {name, vertical,
// accent_color, features, blocks} and nothing else. Two templates with
// the same blocks could only differ by colour — and colour is exactly
// what the tenant overrides. So a template now also carries the things
// that survive rebranding: type, rhythm, shape and image treatment.
//
// Applied as CSS custom properties on the page root by
// templateDesignCssVars(), so every block picks them up without any
// block needing to know which template it belongs to.
// ============================================================
export type TypeScale = 'editorial' | 'grotesque' | 'humanist' | 'condensed';
export type Rhythm = 'compact' | 'balanced' | 'spacious' | 'cinematic';
export type ShapeLanguage = 'sharp' | 'soft' | 'rounded' | 'pill';
export type ImageTreatment = 'square' | 'soft' | 'arch' | 'circle';

export type TemplateDesign = {
  typeScale: TypeScale;
  rhythm: Rhythm;
  shape: ShapeLanguage;
  imageTreatment: ImageTreatment;
  // Heading font stack. Body stays with the tenant's own font choice
  // (font_body in the tenants row) — the heading is where a template's
  // voice lives, the body is where a reader's comfort lives.
  headingFont: string;
  // Uppercase + tracked headings read as fashion/sport; sentence case
  // reads as editorial/medical. One boolean, large effect.
  upperHeadings: boolean;
};

export const DEFAULT_DESIGN: TemplateDesign = {
  typeScale: 'grotesque',
  rhythm: 'balanced',
  shape: 'soft',
  imageTreatment: 'soft',
  headingFont: 'inherit',
  upperHeadings: false,
};

// Multipliers/values consumed as CSS vars. Kept as plain data so the
// editor can offer them as presets without the renderer changing.
// Fluid: the full value on a desktop, about 60% of it on a phone. Fixed
// rem values gave a phone the same 112px gulf between sections as a
// 1440px screen, so the page read as a few islands of content in a lot
// of scrolling.
export const RHYTHM_SPACE: Record<Rhythm, string> = {
  compact: 'clamp(2rem, 6vw, 3rem)',
  balanced: 'clamp(3rem, 9vw, 5rem)',
  spacious: 'clamp(3.75rem, 11vw, 7rem)',
  cinematic: 'clamp(4.5rem, 13vw, 9rem)',
};

export const SHAPE_RADIUS: Record<ShapeLanguage, string> = {
  sharp: '0px',
  soft: '14px',
  rounded: '28px',
  pill: '999px',
};

export const IMAGE_RADIUS: Record<ImageTreatment, string> = {
  square: '0px',
  soft: '16px',
  arch: '9999px 9999px 16px 16px',
  circle: '9999px',
};

// Display-size ramp for h1/h2. `clamp()` so every template is fluid
// between the breakpoints the brief lists, instead of one desktop size
// scaled down.
export const TYPE_SCALE_H1: Record<TypeScale, string> = {
  editorial: 'clamp(2.75rem, 7vw, 5.5rem)',
  grotesque: 'clamp(2.25rem, 5vw, 4rem)',
  humanist: 'clamp(2rem, 4vw, 3.25rem)',
  condensed: 'clamp(2.5rem, 6.5vw, 5rem)',
};

export const TYPE_SCALE_H2: Record<TypeScale, string> = {
  editorial: 'clamp(1.75rem, 3.4vw, 3rem)',
  grotesque: 'clamp(1.5rem, 2.6vw, 2.25rem)',
  humanist: 'clamp(1.375rem, 2.2vw, 1.875rem)',
  condensed: 'clamp(1.625rem, 3vw, 2.5rem)',
};

export const TYPE_SCALE_TRACKING: Record<TypeScale, string> = {
  editorial: '-0.03em',
  grotesque: '-0.02em',
  humanist: '-0.01em',
  condensed: '-0.015em',
};

export function normalizeDesign(raw: Partial<TemplateDesign> | null | undefined): TemplateDesign {
  return { ...DEFAULT_DESIGN, ...(raw ?? {}) };
}

// The bridge between a template's design language and the DOM. Every
// value here is read by BlockRenderer's blocks via var(--tpl-*), so a
// block never needs to know which template it is inside.
export function templateDesignCssVars(design: TemplateDesign): Record<string, string> {
  return {
    '--tpl-h1': TYPE_SCALE_H1[design.typeScale],
    '--tpl-h2': TYPE_SCALE_H2[design.typeScale],
    '--tpl-tracking': TYPE_SCALE_TRACKING[design.typeScale],
    '--tpl-space': RHYTHM_SPACE[design.rhythm],
    '--tpl-radius': SHAPE_RADIUS[design.shape],
    '--tpl-image-radius': IMAGE_RADIUS[design.imageTreatment],
    '--tpl-heading-font': design.headingFont,
    '--tpl-heading-transform': design.upperHeadings ? 'uppercase' : 'none',
    '--tpl-heading-tracking': design.upperHeadings ? '0.01em' : TYPE_SCALE_TRACKING[design.typeScale],
    // Small labels: capitals need air to stay legible; sentence case
    // at 13px reads best untouched (a display face's negative tracking
    // there just crowds the letters).
    '--tpl-label-tracking': design.upperHeadings ? '0.08em' : '0',
  };
}
