export type BlockType =
  | 'hero'
  | 'text'
  | 'features'
  | 'testimonial'
  | 'booking'
  | 'gallery'
  | 'location'
  | 'hours'
  | 'social'
  | 'contact_button'
  | 'spacer';

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: 'Encabezado',
  text: 'Texto',
  features: 'Lista de características',
  testimonial: 'Testimonio',
  booking: 'Formulario de reserva',
  gallery: 'Galería de imágenes',
  location: 'Ubicación',
  hours: 'Horario de atención',
  social: 'Redes sociales',
  contact_button: 'Botón de contacto',
  spacer: 'Separador',
};

// Every block type except "booking" can be added freely. "booking" is
// created once by the DB seed and must stay exactly one — enforced in
// TemplateBuilder.tsx (the "+" menu excludes it, delete is disabled for it).
export const ADDABLE_BLOCK_TYPES: BlockType[] = [
  'hero',
  'text',
  'features',
  'testimonial',
  'gallery',
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
  maxWidth: 'md',
  rounded: false,
  shadow: false,
};

export const PADDING_LABELS: Record<Padding, string> = { sm: 'Chico', md: 'Medio', lg: 'Grande' };
export const MAX_WIDTH_LABELS: Record<MaxWidth, string> = {
  sm: 'Angosto',
  md: 'Medio',
  lg: 'Ancho',
  full: 'Completo',
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

export type Block =
  | { id: string; type: 'hero'; style: BlockStyle; props: HeroProps }
  | { id: string; type: 'text'; style: BlockStyle; props: TextProps }
  | { id: string; type: 'features'; style: BlockStyle; props: FeaturesProps }
  | { id: string; type: 'testimonial'; style: BlockStyle; props: TestimonialProps }
  | { id: string; type: 'booking'; style: BlockStyle; props: BookingProps }
  | { id: string; type: 'gallery'; style: BlockStyle; props: GalleryProps }
  | { id: string; type: 'location'; style: BlockStyle; props: LocationProps }
  | { id: string; type: 'hours'; style: BlockStyle; props: HoursProps }
  | { id: string; type: 'social'; style: BlockStyle; props: SocialProps }
  | { id: string; type: 'contact_button'; style: BlockStyle; props: ContactButtonProps }
  | { id: string; type: 'spacer'; style: BlockStyle; props: SpacerProps };

export function createDefaultBlock(type: BlockType): Block {
  const id = `${type}-${Math.random().toString(36).slice(2, 10)}`;
  const style = { ...DEFAULT_STYLE };

  switch (type) {
    case 'hero':
      return {
        id,
        type,
        style,
        props: { title: 'Título', subtitle: 'Subtítulo', backgroundImageUrl: '', align: 'center', ctaText: '', ctaLink: '' },
      };
    case 'text':
      return { id, type, style, props: { heading: 'Encabezado', body: 'Escribe aquí...', align: 'center', size: 'md' } };
    case 'features':
      return { id, type, style, props: { heading: 'Por qué elegirnos', items: ['Característica 1'], layout: 'list' } };
    case 'testimonial':
      return { id, type, style, props: { quote: 'Excelente servicio.', author: 'Nombre del cliente', avatarUrl: '', rating: 5 } };
    case 'booking':
      return { id, type, style, props: {} };
    case 'gallery':
      return { id, type, style, props: { images: [] } };
    case 'location':
      return { id, type, style, props: { heading: 'Dónde estamos', address: '', mapUrl: '' } };
    case 'hours':
      return { id, type, style, props: { heading: 'Horario de atención', lines: ['Lunes a viernes: 9:00–18:00'] } };
    case 'social':
      return { id, type, style, props: { links: [] } };
    case 'contact_button':
      return { id, type, style, props: { label: 'Escríbenos', phone: '', kind: 'whatsapp' } };
    case 'spacer':
      return { id, type, style, props: { height: 'md' } };
  }
}

// Blocks saved before this style system (and before the deeper per-type
// props added alongside it) are missing `style` entirely, and existing
// hero/text/features/testimonial blocks are missing the newer prop keys
// (backgroundImageUrl, align, rating, etc.). Merging onto a freshly
// created default block of the same type fills every gap without
// clobbering anything the block already had.
export function normalizeBlock(raw: Block): Block {
  const fallback = createDefaultBlock(raw.type);
  return {
    ...raw,
    style: { ...fallback.style, ...(raw.style ?? {}) },
    props: { ...fallback.props, ...(raw.props ?? {}) },
  } as Block;
}
