import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { BusinessMark } from '@/components/tenant-dash/BusinessMark';
import { PLATFORM_ACCENT, PLATFORM_PRIMARY, tenantCtaStyle } from '@/lib/branding/colors';
import { appointmentWhen } from '@/lib/dates/tenantTime';
import { formatoPesos, precioAplicable } from '@/lib/boost/reglas';
import { tenantBookingPageUrl } from '@/lib/urls';
import { ApartarBoton } from './ApartarBoton';

// La página del link de Boost (lista VIP u horas flojas). Sin login: el
// uuid de la oferta es el único token. El precio que se enseña sale de la
// fila de la oferta y del reloj del servidor — el mismo cálculo que cobra
// apartarOferta — nunca de la URL.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Se liberó un horario', robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OfertaBoostPage({ params }: { params: Promise<{ slug: string; ofertaId: string }> }) {
  const { slug, ofertaId } = await params;
  if (!UUID.test(ofertaId)) notFound();
  const admin = createAdminClient();

  const { data: tenant } = await admin.from('tenants').select('*').eq('slug', slug).maybeSingle();
  if (!tenant) notFound();
  const { data: oferta } = await admin.from('boost_ofertas').select('*').eq('id', ofertaId).eq('tenant_id', tenant.id).maybeSingle();
  if (!oferta) notFound();

  const [{ data: servicio }, { data: contacto }] = await Promise.all([
    admin.from('service_types').select('name, price_cents').eq('id', oferta.service_type_id).eq('tenant_id', tenant.id).maybeSingle(),
    admin.from('boost_contactos').select('nombre').eq('id', oferta.contacto_id).eq('tenant_id', tenant.id).maybeSingle(),
  ]);

  const ahora = new Date();
  const precio = precioAplicable(oferta, Number(servicio?.price_cents ?? oferta.precio_normal_cents), ahora);
  const pasado = new Date(oferta.starts_at).getTime() <= ahora.getTime();
  const primary = (tenant.primary_color as string | null) ?? PLATFORM_PRIMARY;
  const accent = (tenant.accent_color as string | null) ?? PLATFORM_ACCENT;
  const nombre = ((contacto?.nombre as string | undefined) ?? '').split(' ')[0];

  return (
    <main className="force-light flex min-h-[100svh] items-center justify-center bg-paper px-4 py-10" style={{ backgroundColor: (tenant.background_color as string | null) ?? undefined }}>
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05),0_24px_48px_-20px_rgba(16,24,40,0.28)]">
        <div className="flex items-center gap-3 px-6 pt-6">
          <BusinessMark name={tenant.name} logoUrl={tenant.logo_url} color={primary} size="sm" />
          <p className="truncate text-sm font-semibold text-ink">{tenant.name}</p>
        </div>

        <div className="px-6 pb-6 pt-5">
          <h1 className="text-[1.65rem] font-semibold leading-tight tracking-[-0.02em] text-ink [text-wrap:balance]">
            {nombre ? `${nombre}, se liberó un horario` : 'Se liberó un horario'}
          </h1>
          <dl className="mt-5 space-y-3 border-y border-border py-4 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Servicio</dt>
              <dd className="text-right font-medium text-ink">{servicio?.name ?? 'Cita'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Cuándo</dt>
              <dd className="text-right font-medium text-ink first-letter:uppercase">{appointmentWhen(oferta.starts_at, tenant.timezone)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Precio</dt>
              <dd className="text-right tabular-nums">
                {precio.conDescuento && <s className="mr-2 text-sm text-muted">{formatoPesos(oferta.precio_normal_cents)}</s>}
                <span className="text-lg font-semibold text-ink">{formatoPesos(precio.cents)}</span>
              </dd>
            </div>
          </dl>

          <ApartarBoton
            slug={slug}
            ofertaId={ofertaId}
            estado={oferta.booking_id ? 'tuya' : pasado ? 'pasado' : 'libre'}
            expiraAt={precio.conDescuento ? oferta.expira_at : null}
            ctaStyle={tenantCtaStyle(primary, accent)}
            reservarUrl={tenantBookingPageUrl(slug)}
          />
        </div>
      </div>
    </main>
  );
}
