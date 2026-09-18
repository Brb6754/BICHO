import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight, Plus } from 'lucide-react';
import { requireReseller } from '@/lib/auth/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { tenantBookingPageUrl } from '@/lib/urls';
import {
  billingDayLabel,
  countBillable,
  formatMxn,
  monthlyDue,
  monthlyMargin,
  monthlyRetail,
  STATUS_LABELS,
  type Reseller,
  type ResellerTenant,
} from '@/lib/resellers';

export const metadata: Metadata = { title: 'Mis negocios', robots: { index: false, follow: false } };

// Reading the tenant rows happens through service_role, but only ever
// filtered by THIS rep's id — a rep never sees another rep's businesses.
export const dynamic = 'force-dynamic';

const STATUS_DOT: Record<string, string> = {
  active: 'bg-success',
  trial: 'bg-warning',
  suspended: 'bg-error',
  cancelled: 'bg-muted',
};

export default async function ResellerOverviewPage() {
  const actor = await requireReseller();
  const admin = createAdminClient();

  const [{ data: resellerRow }, { data: tenantRows }] = await Promise.all([
    admin.from('resellers').select('*').eq('id', actor.resellerId).maybeSingle(),
    admin
      .from('tenants')
      .select('id, name, slug, status, vertical, retail_price_mxn, created_at')
      .eq('reseller_id', actor.resellerId)
      .order('created_at', { ascending: false }),
  ]);

  const reseller = resellerRow as Reseller | null;
  const tenants = (tenantRows ?? []) as ResellerTenant[];

  const wholesale = reseller?.wholesale_price_mxn ?? 0;
  const activeCount = countBillable(tenants);
  const due = monthlyDue(tenants, wholesale);
  const retail = monthlyRetail(tenants);
  const margin = monthlyMargin(tenants, wholesale);
  const missingPrice = tenants.filter((t) => t.status === 'active' && !t.retail_price_mxn).length;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border pb-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{reseller?.zone || 'Vendedor bicho'}</p>
          <h1 className="mt-1 text-[1.75rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2rem]">
            {actor.name}
          </h1>
        </div>
        <Link
          href="/negocios/nuevo"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] shadow-sm transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Dar de alta un negocio
        </Link>
      </header>

      {/* The rep's month in three numbers, in the order they think about
          them: what they collect, what they owe bicho, what they keep.
          Only ACTIVE businesses count on both sides — a business in trial
          costs them nothing and (by their own choice) usually pays them
          nothing yet either. */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Cobras a tus negocios</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{formatMxn(retail)}</p>
          <p className="mt-1 text-xs text-muted">
            {activeCount} {activeCount === 1 ? 'negocio activo' : 'negocios activos'}
            {missingPrice > 0 && ` · ${missingPrice} sin precio puesto`}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Le pagas a bicho</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{formatMxn(due)}</p>
          <p className="mt-1 text-xs text-muted">
            {formatMxn(wholesale)} por negocio activo, {billingDayLabel(reseller?.billing_day ?? 1)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm text-muted">Te queda</p>
          <p
            className={`mt-1.5 text-3xl font-semibold tabular-nums ${margin < 0 ? 'text-error' : 'text-ink'}`}
          >
            {formatMxn(margin)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {margin < 0 ? 'Estás vendiendo por debajo de tu costo.' : 'Al mes, con los precios de hoy.'}
          </p>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">Tus negocios</h2>
          <span className="text-sm tabular-nums text-muted">{tenants.length}</span>
        </div>

        {tenants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">Todavía no has dado de alta ningún negocio</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
              Cuando visites un negocio y quiera arrancar, créalo aquí: eliges plantilla, le pones tu precio,
              dejas lista su página de reservas y le creas su acceso.
            </p>
            <Link
              href="/negocios/nuevo"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/[0.04]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Dar de alta el primero
            </Link>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {tenants.map((tenant, i) => (
              <li
                key={tenant.id}
                className={
                  'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-5 ' +
                  (i > 0 ? 'border-t border-border' : '')
                }
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/negocios/${tenant.id}`}
                    className="font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {tenant.name}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {tenant.slug} · alta el{' '}
                    {new Date(tenant.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      timeZone: 'America/Mexico_City',
                    })}
                  </p>
                </div>

                <span className="text-sm tabular-nums text-ink">
                  {tenant.retail_price_mxn ? (
                    `${formatMxn(tenant.retail_price_mxn)} / mes`
                  ) : (
                    <span className="text-warning">Sin precio</span>
                  )}
                </span>

                <span className="inline-flex items-center gap-2 text-sm text-muted">
                  <span
                    className={'h-2 w-2 rounded-full ' + (STATUS_DOT[tenant.status] ?? 'bg-muted')}
                    aria-hidden="true"
                  />
                  {STATUS_LABELS[tenant.status] ?? tenant.status}
                </span>

                <a
                  href={tenantBookingPageUrl(tenant.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Ver su página
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
