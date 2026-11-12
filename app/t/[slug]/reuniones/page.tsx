import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { productosDe } from '@/lib/products';
import { PublicShell } from '@/components/tenant-public/PublicShell';
import { BookingPausedNotice, bookingPause } from '@/components/tenant-public/BookingPausedNotice';
import { MeetingFlow, type MeetingType } from '@/components/meetings/MeetingFlow';
import { HeroSection } from '@/components/blocks/Sections';
import { isFontKey, type FontKey } from '@/lib/branding/fonts';
import {
  tenantDarkBase,
  PLATFORM_PRIMARY,
  PLATFORM_SECONDARY,
  PLATFORM_ACCENT,
  tenantDarkModeCssVars,
  mixToPaper,
} from '@/lib/branding/colors';
import { normalizeDesign, type TemplateDesign } from '@/lib/templates/blocks';
import { esReunion, type Modalidad } from '@/lib/meetings/kinds';

// La página donde un prospecto agenda una reunión.
//
// Es la hermana de `/reservar` y comparte su piel literal
// (`PublicShell`), no una copia parecida: lo que hace que las dos se
// vean del mismo negocio es que sean el mismo componente.
//
// Lo que NO comparte es el contenido. Una página de reservas vende un
// catálogo; esta abre una conversación, así que no hay precios, ni
// bloques de marketing, ni nada entre el encabezado y la pregunta.

function resolveFontKey(value: unknown): FontKey {
  return typeof value === 'string' && isFontKey(value) ? value : 'inter';
}

const PAPEL_POR_DEFECTO = '#F7F6F3';

function paperFor(guardado: string | null | undefined, primary: string, accent: string): string {
  if (!guardado || guardado.toUpperCase() === PAPEL_POR_DEFECTO) return mixToPaper(primary, accent);
  return guardado;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('slug', slug)
    .maybeSingle();
  if (!tenant?.name) return { title: 'Agendar una reunión' };
  return {
    title: `${tenant.name} · Agenda una reunión`,
    description: `Elige el día y la hora para hablar con ${tenant.name}.`,
  };
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const supabase = await createClient();
  const [{ data: colors }, { data: mode }] = await Promise.all([
    supabase
      .from('tenants')
      .select('primary_color, secondary_color, accent_color, background_color')
      .eq('slug', slug)
      .maybeSingle(),
    supabase.from('tenants').select('theme_mode').eq('slug', slug).maybeSingle(),
  ]);
  if (mode?.theme_mode === 'dark') {
    const paper = tenantDarkModeCssVars(
      colors?.primary_color ?? PLATFORM_PRIMARY,
      colors?.secondary_color ?? PLATFORM_SECONDARY,
      colors?.accent_color ?? PLATFORM_ACCENT
    )['--tenant-dark-paper'];
    return { themeColor: `rgb(${paper.split(' ').join(', ')})`, colorScheme: 'dark' };
  }
  return { themeColor: colors?.background_color ?? PAPEL_POR_DEFECTO, colorScheme: 'light' };
}

export default async function ReunionesPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Columnas core por su cuenta, igual que en `/reservar`: una columna
  // nueva que falte no puede tumbar la búsqueda del negocio.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, timezone')
    .eq('slug', slug)
    .maybeSingle();
  if (!tenant) notFound();

  // Sin el módulo no hay nada que agendar aquí. 404 y no una página
  // vacía, por el mismo motivo que `/reservar`: hacerle perder el
  // tiempo a alguien es peor que decirle que esa dirección no existe.
  const productos = await productosDe(slug);
  if (!productos.reuniones) notFound();

  const pausa = await bookingPause(slug);
  if (pausa) return <BookingPausedNotice {...pausa} />;

  const [{ data: branding_raw }, { data: mode }, { data: paginaRow }] = await Promise.all([
    supabase
      .from('tenants')
      .select(
        'primary_color, secondary_color, accent_color, background_color, text_color, logo_url, font_heading, font_body, description'
      )
      .eq('slug', slug)
      .maybeSingle(),
    supabase.from('tenants').select('theme_mode').eq('slug', slug).maybeSingle(),
    supabase.from('tenants').select('page_design').eq('slug', slug).maybeSingle(),
  ]);

  const [{ data: tipos_raw }, { data: asesores }] = await Promise.all([
    supabase
      .from('service_types')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('name'),
    supabase
      .from('resources')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .eq('active', true)
      .order('name'),
  ]);

  // Se filtra en memoria y no en la consulta: sin db/039 corrida `kind`
  // no existe, y el filtro en SQL dejaría la página en blanco en vez de
  // simplemente sin tipos de reunión.
  const tipos: MeetingType[] = (tipos_raw ?? []).filter(esReunion).map((t) => ({
    id: t.id,
    name: t.name,
    duration_minutes: t.duration_minutes,
    modality: (t.modality ?? null) as Modalidad | null,
  }));

  const isDark = mode?.theme_mode === 'dark';
  const primaryColor = branding_raw?.primary_color ?? PLATFORM_PRIMARY;
  const secondaryColor = branding_raw?.secondary_color ?? PLATFORM_SECONDARY;
  const accentColor = branding_raw?.accent_color ?? PLATFORM_ACCENT;
  const design = normalizeDesign(
    (paginaRow?.page_design as Partial<TemplateDesign> | null) ?? null
  );

  const sinAgenda = tipos.length === 0 || (asesores ?? []).length === 0;

  return (
    <PublicShell
      headingKey={resolveFontKey(branding_raw?.font_heading)}
      bodyKey={resolveFontKey(branding_raw?.font_body)}
      design={design}
      isDark={isDark}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      accentColor={accentColor}
      backgroundColor={paperFor(branding_raw?.background_color, primaryColor, accentColor)}
      textColor={branding_raw?.text_color ?? '#1A1A1A'}
    >
      {/* La misma banda de identidad que la página de reservas, con la
          hoja de agendado entrando en ella: quien llega aquí viene a
          agendar, y la banda solo confirma que está en el lugar correcto. */}
      <HeroSection
        variant="header"
        props={{
          title: `Agenda una reunión con ${tenant.name}`,
          subtitle: branding_raw?.description ?? '',
          eyebrow: '',
          backgroundImageUrl: '',
          align: 'left',
          ctaText: '',
          ctaLink: '',
        }}
        branding={{
          primaryColor,
          accentColor,
          logoUrl: branding_raw?.logo_url ?? null,
          isDark,
          darkBase: isDark ? tenantDarkBase(primaryColor, secondaryColor, accentColor) : undefined,
        }}
        tucked
      />
      <div className="relative mx-auto -mt-7 w-full max-w-2xl px-3 pb-10 sm:-mt-16 sm:px-6 sm:pb-14">
        <div>
          {sinAgenda ? (
            // Una página de agendado que no puede agendar tiene que
            // decirlo y dar una salida, no enseñar un formulario vacío.
            <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center">
              <p className="text-[15px] font-medium text-ink">
                Ahora mismo no tenemos horarios abiertos
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                Escríbenos y buscamos un espacio contigo.
              </p>
            </div>
          ) : (
            <MeetingFlow
              slug={slug}
              businessName={tenant.name}
              tipos={tipos}
              asesores={asesores ?? []}
              timezone={tenant.timezone ?? null}
              accentColor={accentColor}
            />
          )}
        </div>
      </div>
    </PublicShell>
  );
}
