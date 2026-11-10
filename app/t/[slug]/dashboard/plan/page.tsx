import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { PLAN_PRICE_MXN, TRIAL_GRACE_DAYS, tenantAccess } from '@/lib/billing/trial';
import { ActivatePlanButton } from './ActivatePlanButton';

export const dynamic = 'force-dynamic';

// "Activa tu plan". Siempre accesible, también con la página pública en
// pausa: es justamente desde aquí que el negocio se reactiva.
export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ vuelta?: string }>;
}) {
  const { slug } = await params;
  const { vuelta } = await searchParams;
  const { tenantId } = await requireTenantStaff(slug);

  const { data: tenant } = await createAdminClient().from('tenants').select('*').eq('id', tenantId).maybeSingle();
  const access = tenantAccess(tenant);
  const isPaying = tenant?.status === 'active' && tenant?.mp_subscription_status === 'authorized' && access.kind === 'active';

  const estado =
    access.kind === 'trial'
      ? `Estás en tu prueba gratis: te ${access.daysLeft === 1 ? 'queda 1 día' : `quedan ${access.daysLeft} días`}.`
      : access.kind === 'grace'
        ? access.reason === 'payment_failed'
          ? `No pudimos cobrar tu plan. Tienes ${access.daysLeft} ${access.daysLeft === 1 ? 'día' : 'días'} antes de que tu página deje de recibir reservas.`
          : `Tu prueba terminó. Tienes ${access.daysLeft} ${access.daysLeft === 1 ? 'día' : 'días'} antes de que tu página deje de recibir reservas.`
        : access.kind === 'suspended'
          ? 'Tu página está en pausa y no recibe reservas nuevas. Tus datos siguen intactos: activa tu plan y vuelve a funcionar al momento.'
          : isPaying
            ? 'Tu plan está activo. ¡Gracias!'
            : 'Tu cuenta está activa.';

  return (
    <div>
      <PageHeader title="Tu plan" description={estado} />

      {vuelta && !isPaying && (
        <p className="mt-6 rounded-2xl bg-info-soft p-4 text-sm text-ink">
          Si ya terminaste el pago en Mercado Pago, tu plan se activa en cuanto ellos nos confirman (normalmente en
          segundos). Recarga esta página en un momento.
        </p>
      )}

      <section className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
        <p className="text-sm font-medium text-muted">Plan bicho</p>
        <p className="mt-1 text-[2rem] font-semibold tracking-tight text-ink">
          ${PLAN_PRICE_MXN} <span className="text-base font-normal text-muted">MXN al mes</span>
        </p>
        <ul className="mt-4 space-y-1.5 text-[15px] text-muted">
          <li>Página de reservas, agenda y clientes sin límite.</li>
          <li>Pago con tarjeta a través de Mercado Pago; cancelas cuando quieras.</li>
          <li>Si un cobro falla tienes {TRIAL_GRACE_DAYS} días para resolverlo antes de pausar tu página.</li>
        </ul>
        {!isPaying && (
          <div className="mt-6">
            <ActivatePlanButton slug={slug} label="Activar mi plan con Mercado Pago" />
          </div>
        )}
      </section>
    </div>
  );
}
