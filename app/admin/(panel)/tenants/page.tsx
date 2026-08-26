import Link from 'next/link';
import { Building2, CheckCircle2, Clock, DollarSign, TrendingDown, Search, Plus } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { MetricCard } from '@/components/admin/MetricCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { Table, Thead, Th, Tr, Td } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TenantRowActions } from './TenantRowActions';

const VERTICALS = ['general', 'peluqueria', 'dentista', 'padel'];
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
  return `/tenants${qs ? `?${qs}` : ''}`;
}

// MRR/churn are not real yet — there's no subscription/billing history
// in the DB (that's step 7, Stripe, currently paused). MRR is at least
// derived from a real number (active tenant count × the $499 MXN plan
// price from CLAUDE.md's business model), churn is a flat placeholder.
const MONTHLY_PLAN_PRICE_MXN = 499;
const MOCK_CHURN_PERCENT = 4.2;

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; vertical?: string; from?: string; to?: string; page?: string };
}) {
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
  // so they're 3 separate exact counts instead of one query that pulls
  // every tenant row into memory just to .filter() them in JS — with a
  // few tenants the difference is invisible, with thousands the old
  // version moved thousands of rows on every single admin page load.
  // head: true means "give me the count, not the rows".
  const [{ data: tenants, count: filteredCount }, { count: total }, { count: activeCount }, { count: trialCount }] =
    await Promise.all([
      query,
      admin.from('tenants').select('id', { count: 'exact', head: true }),
      admin.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      admin.from('tenants').select('id', { count: 'exact', head: true }).eq('status', 'trial'),
    ]);
  const totalPages = Math.max(1, Math.ceil((filteredCount ?? 0) / PAGE_SIZE));
  const mrr = (activeCount ?? 0) * MONTHLY_PLAN_PRICE_MXN;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Text variant="h1">Tenants</Text>
          <Text variant="body" className="mt-1 text-muted">
            Todos los negocios que corren sobre la plataforma.
          </Text>
        </div>
        <Link href="/tenants/new">
          <Button type="button">
            <Plus className="h-4 w-4" />
            Nuevo tenant
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Total tenants" value={String(total ?? 0)} icon={Building2} />
        <MetricCard label="Activos" value={String(activeCount ?? 0)} icon={CheckCircle2} />
        <MetricCard label="En trial" value={String(trialCount ?? 0)} icon={Clock} />
        <MetricCard
          label="MRR"
          value={`$${mrr.toLocaleString('es-MX')} MXN`}
          hint="Estimado: activos × plan"
          icon={DollarSign}
        />
        <MetricCard
          label="Churn del mes"
          value={`${MOCK_CHURN_PERCENT}%`}
          hint="Placeholder — falta paso 7"
          icon={TrendingDown}
        />
      </div>

      <Card className="mt-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Input type="text" name="q" placeholder="Buscar por nombre..." defaultValue={searchParams.q} className="w-full" />
          </div>
          <div className="min-w-[150px]">
            <Select name="status" defaultValue={searchParams.status ?? ''} className="w-full">
              <option value="">Todos los estados</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-[150px]">
            <Select name="vertical" defaultValue={searchParams.vertical ?? ''} className="w-full">
              <option value="">Todos los verticales</option>
              {VERTICALS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Input type="date" name="from" defaultValue={searchParams.from} />
          </div>
          <div>
            <Input type="date" name="to" defaultValue={searchParams.to} />
          </div>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
          {(searchParams.q || searchParams.status || searchParams.vertical || searchParams.from || searchParams.to || searchParams.page) && (
            <Link href="/tenants" className="text-sm text-muted underline">
              Limpiar
            </Link>
          )}
        </form>
      </Card>

      <div className="mt-6">
        {tenants && tenants.length > 0 ? (
          <Table>
            <Thead>
              <tr>
                <Th>Negocio</Th>
                <Th>Vertical</Th>
                <Th>Estado</Th>
                <Th>Plan</Th>
                <Th>Fecha de alta</Th>
                <Th className="text-right">&nbsp;</Th>
              </tr>
            </Thead>
            <tbody>
              {tenants.map((t) => (
                <Tr key={t.id}>
                  <Td>
                    <Link href={`/tenants/${t.id}`} className="font-medium text-primary hover:underline dark:text-accent">
                      {t.name}
                    </Link>
                    <p className="text-xs text-muted">{t.slug}</p>
                  </Td>
                  <Td className="capitalize">{t.vertical}</Td>
                  <Td>
                    <StatusBadge status={t.status} />
                  </Td>
                  <Td className="capitalize">{t.plan}</Td>
                  <Td>{new Date(t.created_at).toLocaleDateString('es-MX')}</Td>
                  <Td className="text-right">
                    <TenantRowActions tenantId={t.id} slug={t.slug} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
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
