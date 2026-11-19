import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, ReceiptText } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { EmptyState } from '@/components/ui/EmptyState';
import { FacturasLista } from './FacturasLista';
import { PasosConectar } from './PasosConectar';
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
    // La causa real va al log del servidor; a la dueña nunca se le enseña un nombre de archivo.
    console.error('facturas/page.tsx: falta db/034_facturapi.sql?', error.message);
    return (
      <div>
        <PageHeader title="Facturas" />
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Esta sección todavía no está lista en tu cuenta</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No es nada que hayas hecho tú. Escríbenos y la dejamos lista; mientras, el resto de tu panel funciona igual.
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
        description="Haz facturas del SAT sin entrar a su portal."
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
        <PasosConectar />
      ) : !enlace?.live ? (
        <p className="mt-8 rounded-2xl bg-warning-soft p-4 text-sm leading-relaxed text-ink ring-1 ring-border">
          <strong className="font-semibold">Estás en modo de prueba.</strong> Las facturas que hagas aquí no valen ante el
          SAT: sirven para practicar, no para dárselas a un cliente.
        </p>
      ) : null}

      {facturas && facturas.length > 0 ? (
        <FacturasLista
          facturas={facturas.map((f) => ({
            id: f.id,
            uuid: f.uuid_fiscal,
            folio: f.serie || f.folio ? `${f.serie ?? ''}${f.folio ?? ''}` : null,
            cliente: f.receptor_nombre ?? 'Sin cliente',
            rfc: f.receptor_rfc,
            fecha: f.stamped_at ? longDate(f.stamped_at, timezone) : null,
            totalCents: f.total_cents,
            status: f.status,
          }))}
        />
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
