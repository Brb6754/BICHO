import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, ReceiptText } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney } from '@/lib/quotes/totals';
import { longDate } from '@/lib/dates/tenantTime';

export const dynamic = 'force-dynamic';

// Las facturas emitidas.
//
// Lee con service_role por el mismo motivo que cotizaciones: `invoices`
// tiene RLS encendido y CERO policies —guarda RFC y montos— así que con
// la sesión esta pantalla enseñaría cero filas sin dar un solo error.
// La membresía se comprueba antes, en requireTenantStaff.
export default async function FacturasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const productos = await productosDe(slug);
  if (!productos.facturacion) redirect('/dashboard');

  const { tenantId, timezone } = await requireTenantStaff(slug);
  const db = createAdminClient();

  const { data: facturas, error } = await db
    .from('invoices')
    .select('id, uuid_fiscal, serie, folio, receptor_nombre, receptor_rfc, total_cents, status, stamped_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div>
        <PageHeader title="Facturas" />
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/034_facturapi.sql</code> en
            Supabase para activar la facturación.
          </p>
        </div>
      </div>
    );
  }

  const { data: enlace } = await db
    .from('tenant_billing_credentials')
    .select('organization_id, live')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const hechas = (facturas ?? []).filter((f) => f.status === 'stamped').length;
  const conectado = Boolean(enlace?.organization_id);
  const botonNueva = (texto: string) => (
    <Link
      href="/dashboard/facturas/nueva"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {texto}
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Facturas"
        description="Las facturas del SAT que le haces a tus clientes, sin entrar al portal del SAT."
        help={
          <HelpTip title="¿Qué es una factura del SAT?">
            Es el comprobante oficial de una venta (también le dicen CFDI). Tu cliente la pide para deducir el gasto.
            Aquí la haces con sus datos y el SAT la registra al momento; tú no tienes que entrar a su portal.
          </HelpTip>
        }
        action={conectado ? botonNueva('Hacer una factura') : undefined}
      />

      {/* Antes que la lista: si el negocio no está conectado, no hay nada
          que listar y lo único útil es decirle, paso a paso, qué le falta. */}
      {!conectado ? (
        <section className="mt-8 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7" aria-labelledby="conectar-titulo">
          <h2 id="conectar-titulo" className="text-[17px] font-semibold tracking-tight text-ink">
            Para hacer facturas te faltan 3 cosas (se hace una sola vez)
          </h2>
          <ol className="mt-4 flex flex-col gap-4">
            {[
              ['Tu RFC', 'La clave con la que el SAT te tiene registrada. Viene en tu constancia de situación fiscal.'],
              [
                'Tu sello digital (CSD)',
                'Es lo que te deja hacer facturas. Se pide gratis en el portal del SAT con tu e.firma. Si no sabes cómo, en Impuestos (RESICO) está el paso a paso.',
              ],
              ['Firmar la carta manifiesto', 'Un permiso para que bicho le mande tus facturas al SAT. Se firma en línea.'],
            ].map(([titulo, texto], i) => (
              <li key={titulo} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-[13px] font-semibold tabular-nums text-ink"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-medium text-ink">{titulo}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-2xl bg-paper px-4 py-3 text-sm leading-relaxed text-ink ring-1 ring-border">
            Tú no configuras nada: cuando tengas tu sello digital, mándanoslo y nosotros conectamos tu negocio.
          </p>
        </section>
      ) : !enlace?.live ? (
        <p className="mt-8 rounded-2xl bg-warning-soft p-4 text-sm leading-relaxed text-ink ring-1 ring-border">
          <strong className="font-semibold">Estás en modo de prueba.</strong> Las facturas que hagas aquí no valen ante el
          SAT: sirven para practicar, no para dárselas a un cliente.
        </p>
      ) : null}

      {facturas && facturas.length > 0 ? (
        <>
          <p className="mb-3 mt-8 px-1 text-sm text-muted">
            {hechas} {hechas === 1 ? 'factura hecha' : 'facturas hechas'}
            {hechas !== facturas.length && ` de ${facturas.length}`}
          </p>
          <ul className="flex flex-col gap-2">
            {facturas.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-surface px-5 py-4 ring-1 ring-border"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-ink">{f.receptor_nombre ?? 'Sin cliente'}</span>
                  <span className="block truncate text-[13px] text-muted">
                    {[
                      f.serie || f.folio ? `Folio ${f.serie ?? ''}${f.folio ?? ''}` : null,
                      f.receptor_rfc,
                      f.stamped_at ? longDate(f.stamped_at, timezone) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="tabular-nums text-[15px] font-semibold text-ink">{formatMoney(f.total_cents)}</span>
                <EstadoFactura status={f.status} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        conectado && (
          <div className="mt-8 rounded-3xl bg-surface ring-1 ring-border">
            <EmptyState
              icon={ReceiptText}
              title="Todavía no has hecho ninguna factura"
              description="Se factura una cotización que tu cliente ya aceptó: eliges cuál, pones sus datos del SAT y listo."
              why="Tu cliente la recibe al momento y tú no tienes que entrar al portal del SAT."
              action={botonNueva('Hacer mi primera factura')}
            />
          </div>
        )
      )}
    </div>
  );
}

function EstadoFactura({ status }: { status: string }) {
  const tono =
    status === 'stamped'
      ? 'bg-success-soft text-success'
      : status === 'cancelled'
        ? 'bg-ink/[0.06] text-muted'
        : status === 'error'
          ? 'bg-error-soft text-error'
          : 'bg-ink/[0.06] text-muted';
  const texto =
    status === 'stamped'
      ? 'Hecha'
      : status === 'cancelled'
        ? 'Cancelada'
        : status === 'error'
          ? 'No se pudo hacer'
          : 'Pendiente';
  return <span className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${tono}`}>{texto}</span>;
}
