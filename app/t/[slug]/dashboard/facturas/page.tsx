import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReceiptText } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
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

  const timbradas = (facturas ?? []).filter((f) => f.status === 'stamped').length;

  return (
    <div>
      <PageHeader
        title="Facturas"
        description="Los CFDI emitidos desde bicho. El SAT es la copia buena; esto es tu rastro."
        action={
          enlace?.organization_id ? (
            <Link
              href="/dashboard/facturas/nueva"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))]"
            >
              Nueva factura
            </Link>
          ) : undefined
        }
      />

      {/* Antes que la lista: si el negocio no está conectado, no hay nada
          que listar y lo único útil es decirle qué le falta. */}
      {!enlace?.organization_id ? (
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Todavía no puedes emitir</p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            Para facturar hace falta tu RFC, tu Certificado de Sello Digital y firmar la Carta
            Manifiesto. Es un trámite que se hace una vez.
          </p>
        </div>
      ) : !enlace.live ? (
        <div className="mt-8 rounded-2xl bg-warning-soft p-4 text-sm text-ink ring-1 ring-border">
          <strong className="font-semibold">Modo de pruebas.</strong> Lo que emitas aquí no tiene
          efectos fiscales: sirve para probar, no para entregarle a un cliente.
        </div>
      ) : null}

      {facturas && facturas.length > 0 ? (
        <>
          <p className="mt-8 mb-3 px-1 text-sm text-muted">
            {timbradas} {timbradas === 1 ? 'timbrada' : 'timbradas'} de {facturas.length}
          </p>
          <ul className="flex flex-col gap-2">
            {facturas.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-surface px-5 py-4 ring-1 ring-border"
              >
                <span className="tabular-nums text-[13px] text-muted">
                  {f.serie ?? ''}
                  {f.folio ?? ''}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-ink">
                    {f.receptor_nombre ?? 'Sin receptor'}
                  </span>
                  <span className="block truncate text-[13px] text-muted">
                    {f.receptor_rfc ?? ''}
                    {f.stamped_at ? ` · ${longDate(f.stamped_at, timezone)}` : ''}
                  </span>
                </span>
                <span className="tabular-nums text-[15px] font-semibold text-ink">
                  {formatMoney(f.total_cents)}
                </span>
                <EstadoFactura status={f.status} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <ReceiptText className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-ink">Todavía no has emitido ninguna factura</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
            Se factura una cotización que el cliente ya aceptó.
          </p>
          {enlace?.organization_id && (
            <Link
              href="/dashboard/facturas/nueva"
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-primary to-secondary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))]"
            >
              Hacer la primera
            </Link>
          )}
        </div>
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
      ? 'Timbrada'
      : status === 'cancelled'
        ? 'Cancelada'
        : status === 'error'
          ? 'Falló'
          : 'Borrador';
  return <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${tono}`}>{texto}</span>;
}
