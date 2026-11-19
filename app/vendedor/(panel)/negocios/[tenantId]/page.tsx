import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireReseller } from '@/lib/auth/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/Card';
import { tenantBookingPageUrl } from '@/lib/urls';
import { BILLABLE_STATUS, type Reseller } from '@/lib/resellers';
import { BusinessHeader, BusinessSection } from '@/components/reseller/BusinessHeader';
import { CORREO_CONTACTO } from '@/lib/seo/sitio';
import { RetailPriceCard } from '@/components/reseller/RetailPriceCard';
import { WhatsappToggle } from '@/components/tenant-setup/WhatsappToggle';
import { ProductToggles } from '@/components/tenant-setup/ProductToggles';
import { planDe } from '@/lib/billing/planes';
import { getWhatsappAddon } from '@/lib/whatsapp/addonStatus';
import { createDefaultBlock, type Block } from '@/lib/templates/blocks';
import {
  createTenantOwner,
  setTenantWhatsapp,
  setTenantProduct,
  updateTenantBranding,
  updateTenantPage,
  type TenantBranding,
} from '@/app/admin/(panel)/tenants/[tenantId]/actions';
import { BrandEditor } from '@/app/admin/(panel)/tenants/[tenantId]/BrandEditor';
import { OwnerCreator } from '@/app/admin/(panel)/tenants/[tenantId]/OwnerCreator';
import { TemplateBuilder } from '@/app/admin/(panel)/templates/[templateId]/TemplateBuilder';

export const metadata: Metadata = { title: 'Negocio', robots: { index: false, follow: false } };
// Same reason as the admin's tenant detail: without this, an edit made
// here could be answered by a cached render on the way back.
export const dynamic = 'force-dynamic';

// A rep's view of ONE business they brought in. Deliberately the same
// three tools the internal team uses (page editor, brand, owner access)
// — that's what "alta completa" means — and deliberately NOT the
// platform's own levers: status, plan, bookings and customers stay
// internal. Those belong to bicho's relationship with the business, not
// to the sale.
export default async function ResellerBusinessPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const actor = await requireReseller();
  const admin = createAdminClient();

  const { data: tenant } = await admin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .eq('reseller_id', actor.resellerId) // a rep can only open their own
    .maybeSingle();

  if (!tenant) {
    notFound();
  }

  const [{ data: owner }, { data: verticalTemplate }, { data: resellerRow }] = await Promise.all([
    admin.from('business_users').select('user_id').eq('tenant_id', tenant.id).eq('role', 'owner').maybeSingle(),
    admin.from('templates').select('blocks').eq('vertical', tenant.vertical ?? 'general').maybeSingle(),
    admin.from('resellers').select('*').eq('id', actor.resellerId).maybeSingle(),
  ]);
  const reseller = resellerRow as Reseller | null;

  let ownerEmail: string | null = null;
  if (owner?.user_id) {
    const { data: ownerUser } = await admin.auth.admin.getUserById(owner.user_id as string);
    ownerEmail = ownerUser?.user?.email ?? null;
  }

  const ownPage = tenant.page_blocks as Block[] | null;
  const fromTemplate = (verticalTemplate?.blocks ?? null) as Block[] | null;
  const pageBlocks: Block[] =
    ownPage && ownPage.length > 0
      ? ownPage
      : fromTemplate && fromTemplate.length > 0
        ? fromTemplate
        : [createDefaultBlock('hero'), createDefaultBlock('booking')];


  // Read in its own call so a database without db/021 renders the
  // section as "falta la migración" instead of taking the page down.
  // Los dos flags de producto, leídos aparte y tolerantes: si db/027 o
  // db/028 no están corridas, el panel enseña "reservas sí, cotizaciones
  // no" —el estado de hoy— en vez de romperse.
  const { data: flags } = await admin
    .from('tenants')
    .select('*')
    .eq('id', tenant.id)
    .maybeSingle();
  const productos = {
    reservas: flags?.reservas_enabled !== false,
    cotizaciones: flags?.quotes_enabled === true,
    facturacion: flags?.facturacion_enabled === true,
    caja: flags?.caja_enabled === true,
    lealtad: flags?.lealtad_enabled === true,
    regresan: flags?.regresan_enabled === true,
    posts: flags?.posts_enabled === true,
    resico: flags?.resico_enabled === true,
    comisiones: flags?.comisiones_enabled === true,
    inventario: flags?.inventario_enabled === true,
  };

  const whatsapp = await getWhatsappAddon(tenant.id);

  return (
    <div>
      <BusinessHeader
        name={tenant.name}
        status={tenant.status}
        retailPrice={(tenant.retail_price_mxn as number | null) ?? null}
        pageUrl={tenantBookingPageUrl(tenant.slug)}
        slug={tenant.slug}
      />

      <BusinessSection id="precio" title="Lo que le cobras">
        <RetailPriceCard
          tenantId={tenant.id}
          currentPrice={(tenant.retail_price_mxn as number | null) ?? null}
          wholesalePrice={reseller?.wholesale_price_mxn ?? 0}
          billable={tenant.status === BILLABLE_STATUS}
        />
      </BusinessSection>

      <BusinessSection
        id="acceso"
        title="Acceso del dueño"
        note="Crea su usuario con su correo. La contraseña la escribe él mismo en tu teléfono o el suyo; la puede cambiar después desde su panel."
      >
        <OwnerCreator currentOwnerEmail={ownerEmail} onCreate={createTenantOwner.bind(null, tenant.id)} />
      </BusinessSection>

      {/* Qué productos le vendiste. Va ANTES de los extras: un extra
          modifica un producto, así que primero se decide cuál tiene. */}
      <BusinessSection id="productos" title="Productos" note="Lo que le vendiste. Se prende y se apaga al momento.">
        <ProductToggles
          plan={planDe(tenant.plan)}
          reservas={productos.reservas}
          cotizaciones={productos.cotizaciones}
          facturacion={productos.facturacion}
          caja={productos.caja}
          lealtad={productos.lealtad}
          regresan={productos.regresan}
          posts={productos.posts}
          resico={productos.resico}
          comisiones={productos.comisiones}
          inventario={productos.inventario}
          onToggle={async (producto, activo) => {
            'use server';
            await setTenantProduct(tenant.id, producto, activo);
          }}
        />
      </BusinessSection>

      <BusinessSection id="extras" title="Extras" note="Se activan y se apagan por negocio.">
        {whatsapp.available ? (
          <WhatsappToggle
            enabled={whatsapp.enabled}
            sentThisMonth={whatsapp.sentThisMonth}
            onToggle={setTenantWhatsapp.bind(null, tenant.id)}
            audience="reseller"
          />
        ) : (
          <Card className="max-w-xl">
            <p className="text-sm font-medium text-ink">WhatsApp todavía no está disponible</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              El equipo de bicho lo está terminando de preparar. Mientras, las confirmaciones salen por correo.
            </p>
          </Card>
        )}
      </BusinessSection>

      <BusinessSection
        id="pagina"
        title="Su página de reservas"
        note={
          tenant.page_blocks
            ? 'Tiene su propia copia: lo que edites aquí solo cambia la página de este negocio.'
            : 'Todavía usa el diseño de su giro. Al guardar aquí pasa a tener el suyo.'
        }
      >
        {/* The editor is a three-panel canvas: usable on a phone, but
            far easier with room. Say so instead of letting it surprise. */}
        <p className="mb-3 rounded-xl bg-ink/[0.04] px-4 py-3 text-[13px] leading-relaxed text-muted lg:hidden">
          Este editor se usa mejor en una computadora o tableta. Desde el teléfono puedes revisar y hacer cambios
          chicos.
        </p>
        <TemplateBuilder
          accentColor={tenant.accent_color ?? undefined}
          initialBlocks={pageBlocks}
          onSave={updateTenantPage.bind(null, tenant.id)}
        />
      </BusinessSection>

      <BusinessSection id="marca" title="Colores, logo y letra">
        <Card>
          <BrandEditor
            initial={{
              description: tenant.description,
              theme: tenant.theme,
              theme_mode: tenant.theme_mode,
              primary_color: tenant.primary_color,
              secondary_color: tenant.secondary_color,
              accent_color: tenant.accent_color,
              background_color: tenant.background_color,
              text_color: tenant.text_color,
              font_heading: tenant.font_heading,
              font_body: tenant.font_body,
              logo_url: tenant.logo_url,
              logo_mobile_url: tenant.logo_mobile_url,
              favicon_url: tenant.favicon_url,
              cover_image_url: tenant.cover_image_url,
              profile_image_url: tenant.profile_image_url,
              // ?? null and not just the value: before db/024 runs these
              // columns don't come back from select('*') at all, and an
              // undefined would make the inputs uncontrolled.
              resource_label: tenant.resource_label ?? null,
              resource_question: tenant.resource_question ?? null,
              location: tenant.location ?? null,
            }}
            onSave={updateTenantBranding.bind(null, tenant.id) as (b: TenantBranding) => Promise<void>}
          />
        </Card>
      </BusinessSection>

      <p className="mt-10 rounded-2xl border border-border bg-surface px-5 py-4 text-sm leading-relaxed text-muted">
        ¿Hay que suspender, reactivar o cambiarle el plan a este negocio? Eso lo hace el equipo de bicho:{' '}
        <a
          href={`mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent(`Negocio: ${tenant.name}`)}`}
          className="font-medium text-ink underline underline-offset-4"
        >
          escríbenos
        </a>{' '}
        y lo movemos.
      </p>
    </div>
  );
}
