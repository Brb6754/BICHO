import Link from 'next/link';
import { ArrowUpRight, ChevronRight, Plus, Store } from 'lucide-react';
import { tenantBookingPageUrl } from '@/lib/urls';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  billingDayLabel,
  countBillable,
  formatMxn,
  monthlyDue,
  monthlyMargin,
  monthlyRetail,
  type ResellerTenant,
} from '@/lib/resellers';
import { StatusDot } from '@/components/reseller/StatusDot';
import { PRIMARY_LINK } from '@/components/reseller/styles';

// La vista, separada de la consulta para poder revisarla con datos de
// prueba sin pasar el login (mismo patrón que DemoRequestList).
export function ResellerOverview({
  name,
  zone,
  wholesale,
  billingDay,
  tenants,
}: {
  name: string;
  zone: string | null;
  wholesale: number;
  billingDay: number;
  tenants: ResellerTenant[];
}) {
  const activeCount = countBillable(tenants);
  const due = monthlyDue(tenants, wholesale);
  const retail = monthlyRetail(tenants);
  const margin = monthlyMargin(tenants, wholesale);
  const missingPrice = tenants.filter((t) => t.status === 'active' && !t.retail_price_mxn).length;
  const firstName = name.trim().split(/\s+/)[0] || name;

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink sm:text-[2rem]">
            Hola, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {zone ? `${zone} · ` : ''}
            {tenants.length} {tenants.length === 1 ? 'negocio a tu nombre' : 'negocios a tu nombre'}
          </p>
        </div>
        <Link href="/negocios/nuevo" className={`${PRIMARY_LINK} w-full sm:w-auto`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Dar de alta un negocio
        </Link>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        {/* The rep's month as a receipt, in the order they think about it:
            what they collect, minus what they owe bicho, equals what they
            keep. Only ACTIVE businesses count on both sides — one in trial
            costs them nothing and usually pays them nothing yet either. */}
        <section
          aria-labelledby="mes-titulo"
          className="rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-10"
        >
          <h2 id="mes-titulo" className="text-base font-semibold text-ink">
            Lo que ganas al mes
          </h2>
          <dl className="mt-4 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted">Cobras a tus negocios</dt>
              <dd className="font-medium tabular-nums text-ink">{formatMxn(retail)}</dd>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {activeCount} {activeCount === 1 ? 'negocio activo' : 'negocios activos'}
            </p>

            <div className="mt-3 flex items-baseline justify-between gap-4">
              <dt className="text-muted">Le pagas a bicho</dt>
              <dd className="font-medium tabular-nums text-ink">{formatMxn(-due)}</dd>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {formatMxn(wholesale)} por negocio activo, {billingDayLabel(billingDay)}
            </p>

            <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <dt className="font-semibold text-ink">Te queda</dt>
              <dd
                className={`text-[2rem] font-semibold leading-none tabular-nums ${margin < 0 ? 'text-error' : 'text-ink'}`}
              >
                {formatMxn(margin)}
              </dd>
            </div>
            <p className={`mt-2 text-xs leading-relaxed ${margin < 0 ? 'font-medium text-error' : 'text-muted'}`}>
              {margin < 0
                ? 'Estás cobrando menos de lo que le pagas a bicho. Revisa el precio de tus negocios.'
                : activeCount === 0
                  ? 'Cuando tus negocios estén activos, aquí ves cuánto te queda.'
                  : 'Con los precios de hoy.'}
            </p>
          </dl>

          {missingPrice > 0 && (
            <p className="mt-4 rounded-xl bg-warning-soft px-3.5 py-3 text-sm leading-relaxed text-warning">
              {missingPrice === 1
                ? '1 negocio activo no tiene precio.'
                : `${missingPrice} negocios activos no tienen precio.`}{' '}
              No suman a lo que cobras hasta que se lo pongas.
            </p>
          )}
        </section>

        <section aria-labelledby="negocios-titulo">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="negocios-titulo" className="text-base font-semibold text-ink">
              Tus negocios
            </h2>
            {tenants.length > 0 && <span className="text-sm tabular-nums text-muted">{tenants.length}</span>}
          </div>

          {tenants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-5">
              <EmptyState
                icon={Store}
                title="Todavía no das de alta ningún negocio"
                description="Cuando un negocio quiera arrancar, lo creas aquí mismo frente al dueño: nombre, giro y tu precio."
                why="Cada negocio que das de alta queda a tu nombre y suma a lo que ganas."
                action={
                  <Link href="/negocios/nuevo" className={PRIMARY_LINK}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Dar de alta el primero
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
              {tenants.map((tenant, i) => (
                <li key={tenant.id} className={'flex items-stretch ' + (i > 0 ? 'border-t border-border' : '')}>
                  <Link
                    href={`/negocios/${tenant.id}`}
                    className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 transition-colors hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:pl-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{tenant.name}</p>
                      <p className="mt-0.5 flex min-w-0 items-center gap-1 text-sm text-muted">
                        <StatusDot status={tenant.status} />
                        <span className="truncate">
                          {'· alta el '}
                          {new Date(tenant.created_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'America/Mexico_City',
                          })}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {tenant.retail_price_mxn ? (
                        <>
                          <p className="text-sm font-medium tabular-nums text-ink">
                            {formatMxn(tenant.retail_price_mxn)}
                          </p>
                          <p className="text-xs text-muted">al mes</p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-warning">Sin precio</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                  <a
                    href={tenantBookingPageUrl(tenant.slug)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir la página de reservas de ${tenant.name}`}
                    title="Abrir su página de reservas"
                    className="flex w-12 shrink-0 items-center justify-center border-l border-border text-muted transition-colors hover:bg-ink/[0.03] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                  >
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
