import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { tenantBookingPageUrl } from '@/lib/urls';
import {
  billingDayLabel,
  countBillable,
  formatMxn,
  isMissingResellersTable,
  monthlyDue,
  monthlyMargin,
  monthlyRetail,
  type Reseller,
  type ResellerTenant,
} from '@/lib/resellers';
import { setResellerActive } from '../actions';
import { ResellerForm } from '../ResellerForm';
import { ResellerAccess } from './ResellerAccess';

export const dynamic = 'force-dynamic';

export default async function ResellerDetailPage({ params }: { params: Promise<{ resellerId: string }> }) {
  const { resellerId } = await params;
  const admin = createAdminClient();

  const { data: resellerRow, error } = await admin
    .from('resellers')
    .select('*')
    .eq('id', resellerId)
    .maybeSingle();

  if (isMissingResellersTable(error)) {
    return (
      <Card className="max-w-xl">
        <p className="text-sm font-medium text-ink">Falta correr db/016_resellers.sql en Supabase.</p>
      </Card>
    );
  }
  if (!resellerRow) {
    notFound();
  }

  const reseller = resellerRow as Reseller;

  const { data: tenantRows } = await admin
    .from('tenants')
    .select('id, name, slug, status, vertical, retail_price_mxn, created_at')
    .eq('reseller_id', reseller.id)
    .order('created_at', { ascending: false });
  const tenants = (tenantRows ?? []) as ResellerTenant[];

  // The rep's login email comes from Auth, not from the contact email
  // on their record — those can legitimately differ, and what matters
  // here is whether they can actually get in.
  let loginEmail: string | null = null;
  if (reseller.user_id) {
    const { data: user } = await admin.auth.admin.getUserById(reseller.user_id);
    loginEmail = user?.user?.email ?? null;
  }

  return (
    <div>
      <Link href="/vendedores" className="text-sm text-muted hover:underline">
        ← Vendedores
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Text variant="h1">{reseller.name}</Text>
        <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
          <span
            className={'h-2 w-2 rounded-full ' + (reseller.active ? 'bg-success' : 'bg-muted')}
            aria-hidden="true"
          />
          {reseller.active ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      <Text variant="body" className="mt-1 text-muted">
        {reseller.email}
        {reseller.zone ? ` · ${reseller.zone}` : ''}
        {reseller.phone ? ` · ${reseller.phone}` : ''}
      </Text>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Negocios traídos</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{tenants.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Activos</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{countBillable(tenants)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Te paga al mes</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">
            {formatMxn(monthlyDue(tenants, reseller.wholesale_price_mxn))}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatMxn(reseller.wholesale_price_mxn)} por negocio activo, {billingDayLabel(reseller.billing_day)}
          </p>
        </Card>
      </div>

      <section className="mt-10">
        <p className="mb-3 text-sm font-semibold text-ink">Acceso al panel de vendedores</p>
        <ResellerAccess resellerId={reseller.id} currentEmail={loginEmail} />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Sus negocios</p>
          <p className="text-xs text-muted">
            Él les cobra {formatMxn(monthlyRetail(tenants))} al mes y se queda con{' '}
            {formatMxn(monthlyMargin(tenants, reseller.wholesale_price_mxn))}. Ese precio lo fija él.
          </p>
        </div>
        {tenants.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Todavía no ha dado de alta ningún negocio.</p>
          </Card>
        ) : (
          <Card padded={false}>
            <ul>
              {tenants.map((t, i) => (
                <li
                  key={t.id}
                  className={
                    'flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ' +
                    (i > 0 ? 'border-t border-border' : '')
                  }
                >
                  <div className="min-w-0 flex-1">
                    <Link href={`/tenants/${t.id}`} className="font-medium text-ink hover:underline">
                      {t.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {t.slug} · alta el {new Date(t.created_at).toLocaleDateString('es-MX')} ·{' '}
                      {t.retail_price_mxn ? `${formatMxn(t.retail_price_mxn)} / mes` : 'sin precio puesto'}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                  <a
                    href={tenantBookingPageUrl(t.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
                  >
                    Su página
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="mt-10">
        <p className="mb-3 text-sm font-semibold text-ink">Datos y precios</p>
        <ResellerForm
          resellerId={reseller.id}
          initial={{
            name: reseller.name,
            email: reseller.email,
            phone: reseller.phone ?? '',
            zone: reseller.zone ?? '',
            wholesalePriceMxn: reseller.wholesale_price_mxn,
            defaultRetailPriceMxn: reseller.default_retail_price_mxn,
            billingDay: reseller.billing_day,
            notes: reseller.notes ?? '',
          }}
        />
      </section>

      <section className="mt-10">
        <p className="mb-3 text-sm font-semibold text-ink">
          {reseller.active ? 'Dar de baja' : 'Reactivar'}
        </p>
        <Card className="flex max-w-md flex-col gap-3">
          <p className="text-sm leading-relaxed text-muted">
            {reseller.active
              ? 'Deja de poder entrar al panel y de dar de alta negocios. Los que ya trajo siguen funcionando y te los sigue pagando.'
              : 'Vuelve a tener acceso al panel de vendedores con el mismo correo.'}
          </p>
          <ConfirmForm
            action={setResellerActive.bind(null, reseller.id, !reseller.active)}
            confirmTitle={reseller.active ? '¿Dar de baja a este vendedor?' : '¿Reactivar a este vendedor?'}
            confirmMessage={
              reseller.active
                ? 'No podrá entrar al panel ni crear negocios nuevos. Se puede reactivar cuando quieras.'
                : 'Podrá volver a entrar y dar de alta negocios.'
            }
            confirmLabel={reseller.active ? 'Sí, dar de baja' : 'Sí, reactivar'}
            dismissLabel="No, dejarlo así"
            triggerVariant={reseller.active ? 'danger' : 'outline'}
            triggerClassName="self-start"
          >
            {reseller.active ? 'Dar de baja' : 'Reactivar'}
          </ConfirmForm>
        </Card>
      </section>
    </div>
  );
}
