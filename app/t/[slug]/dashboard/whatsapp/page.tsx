import Link from 'next/link';
import { Lock } from 'lucide-react';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { planPermiteAgente } from '@/lib/whatsapp/agente/ruteo';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ADDON_COTIZA_WHATSAPP } from '@/lib/billing/planes';
import { computeTotals } from '@/lib/quotes/totals';
import { cotizacionesConIva } from '@/lib/quotes/preciosIva';
import { Conversaciones, type ConversacionVista } from './Conversaciones';
import { CotizacionesWhatsapp, type CotizacionWA } from './CotizacionesWhatsapp';
import { aprobarFactura, cambiarAgente, cambiarConfirmarFacturas, cambiarCotiza, cambiarEstado, responder } from './actions';

export const dynamic = 'force-dynamic';

const TITULO = 'Recepcionista de WhatsApp';
const DESCRIPCION = 'Contesta a tus clientes por WhatsApp y agenda directo en tu agenda. Si una plática se complica, la tomas tú.';

export default async function WhatsappPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone, role } = await requireTenantStaff(slug);

  // `*`: sin db/056 corrida, las columnas nuevas simplemente no vienen.
  const { data: tenant } = await createAdminClient().from('tenants').select('*').eq('id', tenantId).single();

  if (!planPermiteAgente(tenant?.plan)) {
    return (
      <>
        <PageHeader title={TITULO} description={DESCRIPCION} />
        <Card className="mt-6 flex flex-col items-start gap-3">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <Lock className="h-4 w-4" aria-hidden="true" /> Incluido en el plan Pro
          </span>
          <p className="text-sm text-muted">Sube a Pro para prender la recepcionista y que agende por ti las 24 horas.</p>
          <Link href="/dashboard/plan" className="text-sm font-medium text-primary hover:underline">
            Ver planes
          </Link>
        </Card>
      </>
    );
  }

  const prendido = tenant?.agente_whatsapp_enabled === true;
  const migrada = tenant != null && 'agente_whatsapp_enabled' in tenant;
  const puedeCambiar = role === 'owner' || role === 'admin';

  // Lectura con la sesión del usuario: la RLS de db/056 ya limita a sus negocios; el filtro por tenant elige ESTE.
  const supabase = await createClient();
  const { data } = await supabase
    .from('whatsapp_conversaciones')
    .select('id, telefono, estado, last_message_at, historial')
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false })
    .limit(30);

  // Cotiza por WhatsApp. `quotes` no tiene policies (db/027): se lee con
  // service_role después de requireTenantStaff, filtrando por este negocio.
  const cotizaMigrada = tenant != null && 'cotiza_whatsapp_enabled' in tenant;
  const cotizaPrendida = tenant?.cotiza_whatsapp_enabled === true;
  const confirmar = tenant?.cotiza_confirmar_facturas !== false;
  const requisitos = [
    { ok: tenant?.quotes_enabled === true, texto: 'Cotizaciones prendidas' },
    { ok: !!tenant?.whatsapp_phone_number_id, texto: 'Tu propio número de WhatsApp conectado (lo configura bicho)' },
    { ok: tenant?.facturacion_enabled === true, texto: 'Facturación conectada (opcional: sin ella cotiza, pero no factura)' },
  ];
  let cotizaciones: CotizacionWA[] = [];
  if (cotizaMigrada) {
    const admin = createAdminClient();
    const { data: qs } = await admin
      .from('quotes')
      .select('id, folio, customer_name, whatsapp_telefono, status, seguimiento_enviado_at, factura_estado, created_at, tax_rate, discount_cents, receptor_rfc, receptor_razon_social, receptor_regimen, receptor_codigo_postal, receptor_uso_cfdi')
      .eq('tenant_id', tenantId)
      .eq('origen', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(30);
    const lista = (qs ?? []) as (Omit<CotizacionWA, 'total_cents'> & { tax_rate: number; discount_cents: number })[];
    const { data: items } = lista.length
      ? await admin.from('quote_items').select('quote_id, quantity, unit_price_cents').in('quote_id', lista.map((q) => q.id))
      : { data: [] };
    type I = { quote_id: string; quantity: number; unit_price_cents: number };
    const conIva = await cotizacionesConIva(admin, lista.map((q) => q.id));
    cotizaciones = lista.map((q) => ({
      ...q,
      total_cents: computeTotals(
        ((items ?? []) as I[]).filter((i) => i.quote_id === q.id).map((i) => ({ description: '', quantity: Number(i.quantity), unitPriceCents: i.unit_price_cents })),
        { discountCents: q.discount_cents, taxRate: Number(q.tax_rate), pricesIncludeTax: conIva.has(q.id) }
      ).totalCents,
    }));
  }

  return (
    <>
      <PageHeader
        title={TITULO}
        description={DESCRIPCION}
        action={
          puedeCambiar && migrada ? (
            <form action={cambiarAgente.bind(null, slug, !prendido)}>
              <Button type="submit" variant={prendido ? 'outline' : 'primary'}>
                {prendido ? 'Apagar recepcionista' : 'Prender recepcionista'}
              </Button>
            </form>
          ) : undefined
        }
      />
      <p className="mb-6 mt-3 text-sm text-muted">
        {!migrada
          ? 'Falta correr db/056_whatsapp_agente.sql en Supabase.'
          : prendido
            ? 'Encendida: contesta los mensajes nuevos al instante.'
            : 'Apagada: nadie contesta en automático.'}
      </p>
      <Conversaciones
        conversaciones={(data ?? []) as ConversacionVista[]}
        timezone={timezone}
        acciones={{
          tomar: (id) => cambiarEstado.bind(null, slug, id, 'humano'),
          devolver: (id) => cambiarEstado.bind(null, slug, id, 'ia'),
          responder: (id) => responder.bind(null, slug, id),
        }}
      />

      <section className="mt-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold text-ink">{ADDON_COTIZA_WHATSAPP.nombre}</h2>
            <p className="mt-1 text-sm text-muted">
              Add-on premium. Tus clientes piden precio por WhatsApp, reciben la cotización en PDF con tu catálogo, la aceptan y piden su factura ahí mismo.
            </p>
          </div>
          {puedeCambiar && cotizaMigrada && (
            <form action={cambiarCotiza.bind(null, slug, !cotizaPrendida)}>
              <Button type="submit" variant={cotizaPrendida ? 'outline' : 'primary'}>
                {cotizaPrendida ? 'Apagar Cotiza' : 'Prender Cotiza'}
              </Button>
            </form>
          )}
        </div>
        {!cotizaMigrada ? (
          <p className="mt-3 text-sm text-muted">Falta correr db/057_cotiza_whatsapp.sql en Supabase.</p>
        ) : (
          <>
            <ul className="mt-4 space-y-1 text-sm">
              {requisitos.map((r) => (
                <li key={r.texto} className={r.ok ? 'text-ink' : 'text-muted'}>
                  {r.ok ? '✓' : '○'} {r.texto}
                </li>
              ))}
            </ul>
            <Card className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="max-w-lg text-sm">
                <span className="block font-medium text-ink">Confirmar facturas antes de timbrar</span>
                <span className="block text-muted">
                  {confirmar
                    ? 'Prendido: cuando el cliente confirma sus datos, la factura espera tu aprobación aquí abajo.'
                    : 'Apagado: en cuanto el cliente confirma sus datos, se timbra sola.'}
                </span>
              </span>
              {puedeCambiar && (
                <form action={cambiarConfirmarFacturas.bind(null, slug, !confirmar)}>
                  <Button type="submit" variant="outline">
                    {confirmar ? 'Apagar' : 'Prender'}
                  </Button>
                </form>
              )}
            </Card>
            <div className="mt-6">
              <CotizacionesWhatsapp cotizaciones={cotizaciones} timezone={timezone} aprobar={(id) => aprobarFactura.bind(null, slug, id)} />
            </div>
          </>
        )}
      </section>
    </>
  );
}
