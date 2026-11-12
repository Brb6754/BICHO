import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { requireReseller } from '@/lib/auth/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/Card';
import { tenantBookingPageUrl } from '@/lib/urls';
import { BILLABLE_STATUS, STATUS_LABELS, formatMxn, type Reseller } from '@/lib/resellers';
import { RetailPriceCard } from '@/components/reseller/RetailPriceCard';
import { WhatsappToggle } from '@/components/tenant-setup/WhatsappToggle';
import { ProductToggles } from '@/components/tenant-setup/ProductToggles';
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
      <Link href="/" className="text-sm text-muted hover:underline">
        ← Mis negocios
      </Link>

      <header className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border pb-6">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink">{tenant.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {tenant.slug} · {STATUS_LABELS[tenant.status] ?? tenant.status}
            {tenant.retail_price_mxn ? ` · ${formatMxn(tenant.retail_price_mxn)} / mes` : ''}
          </p>
        </div>
        <a
          href={tenantBookingPageUrl(tenant.slug)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Ver su página de reservas
          <ArrowUpRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
        </a>
      </header>

      <section className="mt-10">
        <p className="mb-3 text-sm font-semibold text-ink">Tu precio para este negocio</p>
        <RetailPriceCard
          tenantId={tenant.id}
          currentPrice={(tenant.retail_price_mxn as number | null) ?? null}
          wholesalePrice={reseller?.wholesale_price_mxn ?? 0}
          billable={tenant.status === BILLABLE_STATUS}
        />
      </section>

      {/* Qué productos le vendiste. Va ANTES de los extras: un extra
          modifica un producto, así que primero se decide cuál tiene. */}
      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Productos</p>
          <p className="text-xs text-muted">Reservas, cotizaciones o las dos.</p>
        </div>
        <ProductToggles
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
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Extras</p>
          <p className="text-xs text-muted">Se activan y se apagan por negocio.</p>
        </div>
        {whatsapp.available ? (
          <WhatsappToggle
            enabled={whatsapp.enabled}
            sentThisMonth={whatsapp.sentThisMonth}
            onToggle={setTenantWhatsapp.bind(null, tenant.id)}
            audience="reseller"
          />
        ) : (
          <Card className="max-w-xl">
            <p className="text-sm font-medium text-ink">Falta correr la migración</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              El extra de WhatsApp necesita{' '}
              <code className="font-mono text-xs">db/021_whatsapp_addon.sql</code> en el SQL Editor
              de Supabase.
            </p>
          </Card>
        )}
      </section>

      <section className="mt-10">
        <p className="mb-1 text-sm font-semibold text-ink">Acceso del dueño</p>
        <p className="mb-3 max-w-xl text-xs leading-relaxed text-muted">
          Crea su usuario con el correo del negocio. La contraseña la escribes junto a él en su teléfono o
          computadora: puede cambiarla después desde su propio panel.
        </p>
        <OwnerCreator currentOwnerEmail={ownerEmail} onCreate={createTenantOwner.bind(null, tenant.id)} />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Su página de reservas</p>
          <p className="text-xs text-muted">
            {tenant.page_blocks
              ? 'Tiene su propia copia: lo que edites aquí solo afecta a este negocio.'
              : 'Todavía muestra la plantilla de su giro. Al guardar aquí pasa a tener la suya.'}
          </p>
        </div>
        <TemplateBuilder
          accentColor={tenant.accent_color ?? undefined}
          initialBlocks={pageBlocks}
          onSave={updateTenantPage.bind(null, tenant.id)}
        />
      </section>

      <section className="mt-10">
        <p className="mb-3 text-sm font-semibold text-ink">Colores, logo y tipografía</p>
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
      </section>

      <p className="mt-10 rounded-2xl border border-border bg-surface px-5 py-4 text-sm leading-relaxed text-muted">
        ¿Hay que suspender, reactivar o cambiar el plan de este negocio? Eso lo hace el equipo de bicho:
        escríbenos y lo movemos.
      </p>
    </div>
  );
}
