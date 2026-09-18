import Link from 'next/link';
import { Search, Plus } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { PortfolioBand } from '@/components/admin/PortfolioBand';
import { Table, Thead, Th, Tr, Td } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TenantRowActions } from './TenantRowActions';

const STATUSES = ['trial', 'active', 'suspended', 'cancelled'];
const PAGE_SIZE = 20;

function buildHref(searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set('q', searchParams.q);
  if (searchParams.status) params.set('status', searchParams.status);
  if (searchParams.vertical) params.set('vertical', searchParams.vertical);
  if (searchParams.from) params.set('from', searchParams.from);
  if (searchParams.to) params.set('to', searchParams.to);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/tenants?${qs}` : '/tenants';
}

// MRR is derived from real numbers (active tenant count × the $499 MXN
// plan price from CLAUDE.md's business model) and is labelled as an
// estimate wherever it appears. Churn used to sit beside it as a flat
// hard-coded 4.2% — that number was invented, and giving an invented
// figure a card of its own in a redesign is worse than not showing it,
// so it's now an explicit "pending" line instead (same precedent as
// the disabled "resetear onboarding" button on the tenant detail page:
// show the gap, don't fill it with fiction). It becomes real when
// billing history exists — step 7, Stripe, currently paused.
const MONTHLY_PLAN_PRICE_MXN = 499;

export default async function TenantsPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ q?: string; status?: string; vertical?: string; from?: string; to?: string; page?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const admin = createAdminClient();

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  let query = admin
    .from('tenants')
    .select('id, slug, name, vertical, status, plan, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (searchParams.q) {
    query = query.ilike('name', `%${searchParams.q}%`);
  }
  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }
  if (searchParams.vertical) {
    query = query.eq('vertical', searchParams.vertical);
  }
  if (searchParams.from) {
    query = query.gte('created_at', searchParams.from);
  }
  if (searchParams.to) {
    query = query.lte('created_at', searchParams.to);
  }

  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  // Metrics describe the whole platform (not the filtered result set),
  // so they're separate exact counts instead of one query that pulls
  // every tenant row into memory just to .filter() them in JS — with a
  // few tenants the difference is invisible, with thousands the old
  // version moved thousands of rows on every single admin page load.
  // head: true means "give me the count, not the rows".
  // Verticals come from the templates table rather than a hard-coded
  // array. The array had already drifted — it listed four verticals
  // while six templates existed, so two of them were unfilterable.
  const { data: verticalRows } = await admin.from('templates').select('vertical').order('vertical');
  const VERTICALS = ['general', ...(verticalRows ?? []).map((r) => r.vertical as string)];

  const countByStatus = (status: string) =>
    admin.from('tenants').select('id', { count: 'exact', head: true }).eq('status', status);

  const [
    { data: tenants, count: filteredCount },
    { count: total },
    { count: activeCount },
    { count: trialCount },
    { count: suspendedCount },
    { count: cancelledCount },
  ] = await Promise.all([
    query,
    admin.from('tenants').select('id', { count: 'exact', head: true }),
    countByStatus('active'),
    countByStatus('trial'),
    countByStatus('suspended'),
    countByStatus('cancelled'),
  ]);

  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));
  const mrr = (activeCount ?? 0) * MONTHLY_PLAN_PRICE_MXN;
  const hasFilters = Boolean(
    searchParams.q || searchParams.status || searchParams.vertical || searchParams.from || searchParams.to
  );

  // Which rep brought each business on this page. Two small extra
  // queries instead of adding reseller_id to the main select: on an
  // environment without db/016 that column would make the ENTIRE list
  // query fail, and the tenants table is the panel's home screen.
  const pageTenantIds = (tenants ?? []).map((t) => t.id);
  const { data: attributionRows, error: attributionError } = pageTenantIds.length
    ? await admin.from('tenants').select('id, reseller_id').in('id', pageTenantIds)
    : { data: [], error: null };
  const { data: resellerRows } = await admin.from('resellers').select('id, name');
  // Any error here means the attribution data isn't available (db/016
  // not applied is the common one: reseller_id missing is 42703, not the
  // 42P01 the table check looks for). Hide the column rather than
  // showing "Directo" for every business, which would be a lie.
  const showReseller = !attributionError;
  const resellerNames = new Map((resellerRows ?? []).map((r) => [r.id as string, r.name as string]));
  const resellerByTenant = new Map(
    ((attributionRows ?? []) as { id: string; reseller_id: string | null }[]).map((row) => [
      row.id,
      row.reseller_id,
    ])
  );

  return (
    <div>
      {/* Title left, the single primary action right. That button is the
          only filled one on the screen — Filtrar, the row menus and
          pagination are all deliberately quieter, so "create a tenant"
          reads unmistakably as the primary verb here. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Text variant="display" className="font-[family-name:var(--font-display)]">
            Negocios
          </Text>
          <Text variant="body" className="mt-1 max-w-md text-muted">
            Todos los negocios que corren sobre bicho, y en qué estado está cada uno.
          </Text>
        </div>
        <Link href="/tenants/new">
          <Button type="button">
            <Plus className="h-4 w-4" />
            Nuevo negocio
          </Button>
        </Link>
      </div>

      <PortfolioBand
        total={total ?? 0}
        active={activeCount ?? 0}
        trial={trialCount ?? 0}
        suspended={suspendedCount ?? 0}
        cancelled={cancelledCount ?? 0}
        mrr={mrr}
        planPrice={MONTHLY_PLAN_PRICE_MXN}
      />

      {/* Filters are a toolbar, not a card. They're chrome for the table
          right beneath them — wrapping them in their own raised surface
          made two panels compete, and read as if the filters were a
          section of content in their own right. */}
      <form method="get" className="mt-10 flex flex-wrap items-end gap-3 border-b border-border pb-5">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            type="text"
            name="q"
            aria-label="Buscar por nombre"
            placeholder="Buscar por nombre..."
            defaultValue={searchParams.q}
            className="w-full pl-9"
          />
        </div>
        <Select name="status" aria-label="Estado" defaultValue={searchParams.status ?? ''} className="min-w-[150px]">
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          name="vertical"
          aria-label="Vertical"
          defaultValue={searchParams.vertical ?? ''}
          className="min-w-[150px]"
        >
          <option value="">Todos los verticales</option>
          {VERTICALS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
        {/* These two date fields were previously unlabelled, so nothing
            told you what range they filtered on. */}
        <div>
          <label htmlFor="from" className="mb-1 block text-caption text-muted">
            Alta desde
          </label>
          <Input id="from" type="date" name="from" defaultValue={searchParams.from} />
        </div>
        <div>
          <label htmlFor="to" className="mb-1 block text-caption text-muted">
            hasta
          </label>
          <Input id="to" type="date" name="to" defaultValue={searchParams.to} />
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(hasFilters || searchParams.page) && (
          <Link
            href="/tenants"
            className="rounded-sm px-1 py-2 text-sm text-muted underline transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="mt-6">
        {tenants && tenants.length > 0 ? (
          <>
            <p className="mb-3 text-caption text-muted">
              {filteredCount} {filteredCount === 1 ? 'negocio' : 'negocios'}
              {hasFilters ? ' con estos filtros' : ' en total'}
            </p>
            <Table>
              <Thead>
                <tr>
                  <Th>Negocio</Th>
                  <Th>Vertical</Th>
                  <Th>Estado</Th>
                  {showReseller && <Th>Vendedor</Th>}
                  <Th>Plan</Th>
                  <Th>Fecha de alta</Th>
                  <Th className="text-right">&nbsp;</Th>
                </tr>
              </Thead>
              <tbody>
                {tenants.map((t) => (
                  <Tr key={t.id}>
                    <Td>
                      <Link
                        href={`/tenants/${t.id}`}
                        className="rounded-sm font-medium text-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {t.name}
                      </Link>
                      <p className="text-xs text-muted">{t.slug}</p>
                    </Td>
                    <Td className="capitalize text-muted">{t.vertical}</Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                    {showReseller && (
                      <Td className="text-muted">
                        {(() => {
                          const id = resellerByTenant.get(t.id);
                          const name = id ? resellerNames.get(id) : null;
                          return name ? (
                            <Link href={`/vendedores/${id}`} className="text-ink hover:underline">
                              {name}
                            </Link>
                          ) : (
                            'Directo'
                          );
                        })()}
                      </Td>
                    )}
                    <Td className="capitalize text-muted">{t.plan}</Td>
                    <Td className="text-muted">{new Date(t.created_at).toLocaleDateString('es-MX')}</Td>
                    <Td className="text-right">
                      <TenantRowActions tenantId={t.id} slug={t.slug} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </>
        ) : page > 1 ? (
          <Card>
            <EmptyState
              icon={Search}
              title="No hay más resultados"
              description="Llegaste al final de la lista — vuelve a la página anterior."
            />
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="Ningún tenant coincide con estos filtros — prueba ajustarlos o límpialos."
            />
          </Card>
        )}
        <Pagination page={page} totalPages={totalPages} buildHref={(p) => buildHref(searchParams, p)} />
      </div>
    </div>
  );
}
