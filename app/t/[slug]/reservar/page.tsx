import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { productosDe } from '@/lib/products';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { isFontKey, type FontKey } from '@/lib/branding/fonts';
import {
  PLATFORM_PRIMARY,
  PLATFORM_SECONDARY,
  PLATFORM_ACCENT,
  tenantDarkModeCssVars,
  tenantDarkBase,
  mixToPaper,
} from '@/lib/branding/colors';
import type { Block, TemplateDesign } from '@/lib/templates/blocks';
import { createDefaultBlock, normalizeDesign } from '@/lib/templates/blocks';
import { esServicio } from '@/lib/meetings/kinds';
import { PublicShell } from '@/components/tenant-public/PublicShell';
import { BookingPausedNotice, bookingPause } from '@/components/tenant-public/BookingPausedNotice';
import { promosVigentes } from '@/components/tenant-public/PromosVigentes';

function resolveFontKey(value: unknown): FontKey {
  return typeof value === 'string' && isFontKey(value) ? value : 'inter';
}

// The tab and the link preview a customer sees when the page is shared
// on WhatsApp. Was the platform's own "Reservas SaaS" for every business.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('name').eq('slug', slug).maybeSingle();
  if (!tenant?.name) return { title: 'Reservar cita' };
  return {
    title: `${tenant.name} · Reserva tu cita`,
    description: `Elige servicio, día y hora para tu cita en ${tenant.name}.`,
  };
}

// The color a phone paints its own browser bar and status area with.
// Without it Safari and Chrome show a default grey or white strip above a
// page that's cream or dark brown, and the page looks framed by someone
// else's chrome. With it the page runs to the top edge of the phone.
export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
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
  return { themeColor: colors?.background_color ?? '#F7F6F3', colorScheme: 'light' };
}

// El gris de la columna `background_color` (db/009) es un default, no
// una decision: ningun negocio lo eligio, lo trae puesto desde que se
// creo. Tratarlo como "sin configurar" es lo que permite que CADA
// negocio tenga su propio papel sin pedirle a nadie que abra el panel
// — y quien si eligio un color sigue mandando.
const PAPEL_POR_DEFECTO = '#F7F6F3';

function paperFor(guardado: string | null | undefined, primary: string, accent: string): string {
  if (!guardado || guardado.toUpperCase() === PAPEL_POR_DEFECTO) return mixToPaper(primary, accent);
  return guardado;
}

export default async function ReservarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Kept separate from the branding query on purpose: id/name/vertical
  // are core columns that have existed since 001; branding columns are
  // new (009) and might not be applied in every environment yet. If they
  // errored together, a missing branding column would take the whole
  // tenant lookup down with it.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, vertical, timezone')
    .eq('slug', slug)
    .maybeSingle();

  // A subdomain that belongs to no business is a 404, not a crash. It
  // used to be the latter: the query returned null, `tenant.id` below
  // asserted it wasn't, and the page threw into the error boundary —
  // so a typo in the subdomain ("test_salon" instead of "test-salon")
  // read as "Algo salió mal" to a customer, which says the business is
  // broken rather than that the address is wrong.
  if (!tenant) notFound();

  // Sin el producto de citas no hay nada que reservar aquí. 404 y no
  // una página vacía: una página de reservas que no reserva le hace
  // perder el tiempo a un cliente del negocio.
  const productos = await productosDe(slug);
  if (!productos.reservas) notFound();

  // Prueba vencida y sin pagar (lib/billing/trial.ts): aviso amable, nunca 404.
  const pausa = await bookingPause(slug);
  if (pausa) return <BookingPausedNotice {...pausa} />;

  const { data: branding_raw } = await supabase
    .from('tenants')
    .select(
      'primary_color, secondary_color, accent_color, background_color, text_color, font_heading, font_body, logo_url'
    )
    .eq('slug', slug)
    .maybeSingle();

  // Queried separately from branding_raw above, same defensive reason:
  // theme_mode (db/012) is newer than every other branding column and
  // might not be applied in every environment yet — if a missing column
  // errored the query, it should only cost us theme_mode (falls back to
  // 'light', today's only behavior), not every other branding field too.
  const { data: theme_mode_raw } = await supabase
    .from('tenants')
    .select('theme_mode')
    .eq('slug', slug)
    .maybeSingle();
  const isDark = theme_mode_raw?.theme_mode === 'dark';

  // db/024, queried on its own for the reason every new column on this
  // page is: if it doesn't exist yet, the cost is the two words it
  // carries — "Profesional" and no address — not the whole page.
  const { data: labels_raw } = await supabase
    .from('tenants')
    .select('resource_label, location')
    .eq('slug', slug)
    .maybeSingle();

  // db/030, en su propia consulta por el mismo motivo que la de
  // arriba: si la pego a la de db/024 y la columna todavía no existe,
  // el 42703 se lleva también el sustantivo y la dirección, que sí
  // existen. Una columna nueva solo puede costar lo suyo.
  const { data: question_raw } = await supabase
    .from('tenants')
    .select('resource_question')
    .eq('slug', slug)
    .maybeSingle();

  const { data: services_raw } = await supabase
    .from('service_types')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name');

  // Los tipos de reunión viven en la misma tabla (db/039) y NO son
  // cosas que se vendan: ofrecerle "Visita técnica gratis" a alguien
  // en el catálogo de servicios es ofrecerle algo que no existe. Se
  // filtra en memoria y no en la consulta a propósito — sin la
  // migración corrida, `kind` no existe y todo sigue siendo servicio.
  const services = (services_raw ?? []).filter(esServicio);

  const { data: resources } = await supabase
    .from('resources')
    .select('id, name')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .order('name');

  // db/032, en su propia consulta por el mismo motivo que las de arriba:
  // si la tabla todavía no existe, el costo es la restricción —que nadie
  // tenía— y no la lista de quién atiende, que sí.
  const { data: resourceServices } = await supabase
    .from('resource_services')
    .select('resource_id, service_type_id')
    .eq('tenant_id', tenant.id);

  const resourcesConServicios = (resources ?? []).map((r) => ({
    ...r,
    service_ids: (resourceServices ?? [])
      .filter((l) => l.resource_id === r.id)
      .map((l) => l.service_type_id),
  }));

  const { data: template } = await supabase
    .from('templates')
    .select('blocks')
    .eq('vertical', tenant.vertical ?? 'general')
    .maybeSingle();

  // `design` is queried separately from `blocks` for the same reason
  // theme_mode is: a column that may not exist yet in a given
  // environment must never be able to take down the query that fetches
  // the actual page content. If db/014 hasn't been applied, this comes
  // back null and normalizeDesign() falls through to the defaults.
  const { data: templateDesignRow } = await supabase
    .from('templates')
    .select('design')
    .eq('vertical', tenant.vertical ?? 'general')
    .maybeSingle();

  // The tenant's OWN page, snapshotted from its template when the
  // tenant was created (db/015). Separate select for the usual
  // defensive reason: on an environment without db/015 this errors and
  // comes back null, and the page falls back to the shared template —
  // which is exactly the pre-015 behaviour.
  const { data: tenantPage } = await supabase
    .from('tenants')
    .select('page_blocks, page_design')
    .eq('slug', slug)
    .maybeSingle();

  // A template is a starting point, not a live dependency: once a
  // tenant has its own copy, editing the template must not touch this
  // page. Only tenants created before db/015 (or on a vertical with no
  // template) still read the shared row.
  const ownBlocks = (tenantPage?.page_blocks ?? null) as Block[] | null;
  const templateBlocks = (template?.blocks ?? null) as Block[] | null;

  // No page of its own and no template for its vertical (a "General (sin
  // plantilla)" tenant). This used to be a separate hand-built layout:
  // a 512px column with a big rounded header card and a second card for
  // the flow, so these tenants got an older, different-looking page than
  // everyone else. Now they get the same two blocks any new page starts
  // from, drawn by the same renderer: identity header, then booking.
  const minimalPage = (): Block[] => {
    const hero = createDefaultBlock('hero');
    const booking = createDefaultBlock('booking');
    if (hero.type === 'hero') {
      hero.props = { ...hero.props, title: tenant.name, subtitle: 'Elige tu servicio y horario.' };
    }
    return [hero, booking];
  };

  const pageBlocks =
    ownBlocks && ownBlocks.length > 0
      ? ownBlocks
      : templateBlocks && templateBlocks.length > 0
        ? templateBlocks
        : minimalPage();

  const design = normalizeDesign(
    (tenantPage?.page_design as Partial<TemplateDesign> | null) ??
      (templateDesignRow?.design as Partial<TemplateDesign> | null)
  );

  const headingKey = resolveFontKey(branding_raw?.font_heading);
  const bodyKey = resolveFontKey(branding_raw?.font_body);

  const bookingData = {
    slug,
    businessName: tenant.name,
    services: services ?? [],
    resources: resourcesConServicios,
    timezone: tenant.timezone ?? null,
    // `|| undefined` and not `?? undefined`: an empty string saved from
    // the panel has to fall through to BookingFlow's default too, not
    // ask "¿Con qué ?".
    resourceLabel: labels_raw?.resource_label || undefined,
    resourceQuestion: question_raw?.resource_question || undefined,
    location: labels_raw?.location || null,
  };

  // Back to reading the tenant's own primary_color/accent_color: a fixed
  // platform palette looked wrong next to a tenant's actual logo (e.g. an
  // olive/gold spa logo against blue/violet glass). Every glass surface,
  // button, and the ambient background all derive from these two colors
  // now, so the whole page reads as THIS business's brand, not a
  // one-size-fits-all platform skin. Falls back to the platform's own
  // indigo/cyan only for a tenant that hasn't set custom colors yet.
  const secondaryColor = branding_raw?.secondary_color ?? PLATFORM_SECONDARY;
  const primaryColor = branding_raw?.primary_color ?? PLATFORM_PRIMARY;
  const accentColor = branding_raw?.accent_color ?? PLATFORM_ACCENT;
  const branding = {
    primaryColor,
    accentColor,
    logoUrl: branding_raw?.logo_url ?? null,
    // Every glass card (BlockRenderer) needs to know the page is dark
    // too, not just <main> — otherwise a block's own card keeps forcing
    // a white base and reads as a pale, off-brand card floating on the
    // dark page instead of belonging to it (that's the exact bug this
    // fixes). darkBase is only computed when actually needed.
    isDark,
    darkBase: isDark ? tenantDarkBase(primaryColor, secondaryColor, accentColor) : undefined,
  };

  // La promo ya no es una franja de aviso arriba de todo: la portada la
  // pinta como un boleto dentro de la presentación del negocio.
  const promos = await promosVigentes({
    slug,
    tenantId: tenant.id,
    timezone: tenant.timezone ?? null,
    enabled: productos.lealtad,
  });

  return (
    <PublicShell
      headingKey={headingKey}
      bodyKey={bodyKey}
      design={design}
      isDark={isDark}
      primaryColor={branding.primaryColor}
      secondaryColor={secondaryColor}
      accentColor={branding.accentColor}
      backgroundColor={paperFor(
        branding_raw?.background_color,
        branding.primaryColor,
        branding.accentColor
      )}
      textColor={branding_raw?.text_color ?? '#1A1A1A'}
    >
      <BlockRenderer blocks={pageBlocks} bookingData={bookingData} branding={branding} promos={promos} />
    </PublicShell>
  );
}
