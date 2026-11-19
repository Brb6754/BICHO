import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { planPermiteAgente } from '@/lib/whatsapp/agente/ruteo';
import { PageHeader, SectionHeading } from '@/components/tenant-dash/PageHeader';
import { ActionForm } from '@/components/tenant-dash/ui/ActionForm';
import { Interruptor } from '@/components/tenant-dash/crecer/ui';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { Card } from '@/components/ui/Card';
import { PLANES } from '@/lib/billing/planes';
import { computeTotals } from '@/lib/quotes/totals';
import { cotizacionesConIva } from '@/lib/quotes/preciosIva';
import { Bloqueado } from '../plan/Bloqueado';
import { Conversaciones, type ConversacionVista } from './Conversaciones';
import { CotizacionesWhatsapp, type CotizacionWA } from './CotizacionesWhatsapp';
import { AnticiposAqui, Intro, ParaQue, Pestanas, Proximamente, Requisitos, vistaDe } from './Secciones';
import { aprobarFactura, cambiarAgente, cambiarConfirmarFacturas, cambiarCotiza, cambiarEstado, responder } from './actions';

export const dynamic = 'force-dynamic';

// El nombre es el mismo del menú. Adentro, dos pestañas: la recepcionista
// (Pro) y Cotiza (un extra encima de Pro, precio por decidir: no se publica).
const TITULO = 'WhatsApp';
const DESCRIPCION = 'Que tus clientas agenden y pidan precio por WhatsApp aunque tú estés ocupada.';

export default async function WhatsappPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ vista?: string }>;
}) {
  const { slug } = await params;
  const vista = vistaDe((await searchParams).vista);
  const { tenantId, timezone, role } = await requireTenantStaff(slug);

  // `*`: sin db/056 corrida, las columnas nuevas simplemente no vienen.
  const { data: tenant } = await createAdminClient().from('tenants').select('*').eq('id', tenantId).single();

  if (!planPermiteAgente(tenant?.plan)) {
    return (
      <>
        <PageHeader title={TITULO} description={DESCRIPCION} />
        <Bloqueado
          modulo="whatsapp"
          plan={tenant?.plan}
          ejemplo="/panel/whatsapp"
          aviso={`La recepcionista de WhatsApp viene en el plan Pro, de $${PLANES.pro.precio} al mes.`}
          ganas={[
            'Que te contesten y te agenden por WhatsApp las 24 horas, aunque estés atendiendo.',
            'Cada cita cae directo en tu agenda, con tus horarios libres de verdad.',
            'Ver cada plática y tomarla tú cuando quieras.',
          ]}
        />
      </>
    );
  }

  const prendido = tenant?.agente_whatsapp_enabled === true;
  const migrada = tenant != null && 'agente_whatsapp_enabled' in tenant;
  const puedeCambiar = role === 'owner' || role === 'admin';
  const numeroPropio = Boolean(tenant?.whatsapp_phone_number_id);
  // Sin token de Meta o sin número (propio o el de bicho) la recepcionista no puede contestar nada.
  const numeroListo = Boolean(process.env.WHATSAPP_ACCESS_TOKEN) && (numeroPropio || Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID));

  const cotizaMigrada = tenant != null && 'cotiza_whatsapp_enabled' in tenant;
  const cotizaPrendida = tenant?.cotiza_whatsapp_enabled === true;
  // Mismas condiciones que deciden "Próximamente" en cada vista.
  const estados = {
    recepcionista: !migrada || (!numeroListo && !prendido) ? { texto: 'Por activar', prendido: null } : { texto: prendido ? 'Prendida' : 'Apagada', prendido },
    cotiza: !cotizaMigrada || (!numeroPropio && !cotizaPrendida) ? { texto: 'Por activar', prendido: null } : { texto: cotizaPrendida ? 'Prendido' : 'Apagado', prendido: cotizaPrendida },
  };

  const encabezado = (
    <>
      <PageHeader title={TITULO} description={DESCRIPCION} />
      <Pestanas actual={vista} estados={estados} />
      <Intro vista={vista} />
    </>
  );

  if (vista === 'recepcionista') {
    // Lectura con la sesión del usuario: la RLS de db/056 ya limita a sus negocios; el filtro por tenant elige ESTE.
    const supabase = await createClient();
    const { data } = await supabase
      .from('whatsapp_conversaciones')
      .select('id, telefono, estado, last_message_at, historial')
      .eq('tenant_id', tenantId)
      .order('last_message_at', { ascending: false })
      .limit(30);
    const conversaciones = (data ?? []) as ConversacionVista[];

    const conConversaciones = conversaciones.length > 0 || (migrada && (numeroListo || prendido));
    return (
      <>
        {encabezado}
        {!migrada ? (
          // Falta db/056_whatsapp_agente.sql.
          <Proximamente vista="recepcionista" />
        ) : !numeroListo && !prendido ? (
          <Proximamente vista="recepcionista" />
        ) : (
          <Card className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1 basis-64">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <span className={`h-2.5 w-2.5 rounded-full ${prendido ? 'bg-success' : 'bg-ink/25'}`} aria-hidden="true" />
                {prendido ? 'Prendida' : 'Apagada'}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {prendido
                  ? 'Contesta al instante cada mensaje nuevo que llega a tu WhatsApp.'
                  : 'Nadie contesta en automático. Los mensajes te llegan a ti como siempre.'}
              </p>
            </div>
            {puedeCambiar ? (
              <ActionForm action={cambiarAgente.bind(null, slug, !prendido)} success={prendido ? 'Recepcionista apagada' : 'Recepcionista prendida'}>
                <Interruptor type="submit" prendido={prendido} etiqueta="Recepcionista" textos={['Prendida', 'Apagada']} />
              </ActionForm>
            ) : (
              <p className="text-sm text-muted">Solo el dueño o un administrador la prende o la apaga.</p>
            )}
          </Card>
        )}

        {conConversaciones && (
          <section id="conversaciones" className="mt-10 scroll-mt-24">
            <h2 className="mb-3 flex min-h-[2.75rem] items-center gap-1 text-[17px] font-semibold tracking-tight text-ink">
              Conversaciones
              <HelpTip title="¿Cuándo conviene contestar yo?">
                Cuando piden algo que la recepcionista no sabe (un precio especial, una queja, un grupo grande). Toca la
                plática y luego «Contestar yo». Cuando termines, regrésasela para que siga agendando.
              </HelpTip>
            </h2>
            <ParaQue>Lo que te escriben por WhatsApp y lo que les contestó la recepcionista.</ParaQue>
            <Conversaciones
              conversaciones={conversaciones}
              timezone={timezone}
              acciones={{
                tomar: (id) => cambiarEstado.bind(null, slug, id, 'humano'),
                devolver: (id) => cambiarEstado.bind(null, slug, id, 'ia'),
                responder: (id) => responder.bind(null, slug, id),
              }}
            />
          </section>
        )}

        <AnticiposAqui href="/dashboard/anticipos" />
      </>
    );
  }

  // ── Cotiza por WhatsApp ──
  // `quotes` no tiene policies (db/027): se lee con service_role después de
  // requireTenantStaff, filtrando por este negocio.
  const confirmar = tenant?.cotiza_confirmar_facturas !== false;
  const requisitos = [
    { ok: tenant?.quotes_enabled === true, texto: 'Cotizaciones prendidas en tu panel' },
    { ok: numeroPropio, texto: 'Tu propio número de WhatsApp conectado (lo hacemos nosotros)' },
    { ok: tenant?.facturacion_enabled === true, texto: 'Facturas prendidas (opcional: sin ellas cotiza, pero no hace facturas)' },
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
      {encabezado}
      {!cotizaMigrada || (!numeroPropio && !cotizaPrendida) ? (
        // Sin db/057_cotiza_whatsapp.sql, o sin el número propio del negocio.
        <>
          <Proximamente vista="cotiza" />
          {cotizaMigrada && (
            <section className="mt-8 max-w-2xl">
              <SectionHeading title="Lo que necesita" />
              <Requisitos items={requisitos} />
            </section>
          )}
        </>
      ) : (
        <>
          <Card className="mt-8 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1 basis-64">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <span className={`h-2.5 w-2.5 rounded-full ${cotizaPrendida ? 'bg-success' : 'bg-ink/25'}`} aria-hidden="true" />
                  {cotizaPrendida ? 'Cotiza está prendido' : 'Cotiza está apagado'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {cotizaPrendida ? 'Cuando alguien pide precio, recibe su cotización en PDF al momento.' : 'Nadie recibe cotizaciones en automático.'}
                </p>
              </div>
              {puedeCambiar && (
                <ActionForm action={cambiarCotiza.bind(null, slug, !cotizaPrendida)} success={cotizaPrendida ? 'Cotiza apagado' : 'Cotiza prendido'}>
                  <Interruptor type="submit" prendido={cotizaPrendida} etiqueta="Cotiza" />
                </ActionForm>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <div className="min-w-0 flex-1 basis-64">
                <p className="text-[15px] font-medium text-ink">Revisar cada factura antes de hacerla</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {confirmar
                    ? 'Sí: cuando el cliente confirma sus datos, la factura te espera aquí abajo para que la apruebes.'
                    : 'No: en cuanto el cliente confirma sus datos, la factura se hace sola.'}
                </p>
              </div>
              {puedeCambiar && (
                <ActionForm action={cambiarConfirmarFacturas.bind(null, slug, !confirmar)} success={confirmar ? 'Las facturas se harán solas' : 'Vas a revisar cada factura'}>
                  <Interruptor type="submit" prendido={confirmar} etiqueta="Revisar cada factura antes de hacerla" textos={['Sí', 'No']} />
                </ActionForm>
              )}
            </div>
          </Card>
          {requisitos.some((r) => !r.ok) && (
            <section className="mt-8 max-w-2xl">
              <SectionHeading title="Lo que necesita" />
              <Requisitos items={requisitos} />
            </section>
          )}
          <section className="mt-10">
            <SectionHeading title="Cotizaciones por WhatsApp" meta={cotizaciones.length || undefined} />
            <CotizacionesWhatsapp cotizaciones={cotizaciones} timezone={timezone} aprobar={(id) => aprobarFactura.bind(null, slug, id)} />
          </section>
        </>
      )}
    </>
  );
}
