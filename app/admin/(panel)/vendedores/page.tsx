import Link from 'next/link';
import { Plus, Users } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { Table, Thead, Th, Tr, Td } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  countBillable,
  formatMxn,
  isMissingResellersTable,
  monthlyDue,
  monthlyRetail,
  type Reseller,
} from '@/lib/resellers';

export const dynamic = 'force-dynamic';

// The internal view of the rep network: who sells, what they brought in,
// and what each one owes bicho per month. Counted from real rows
// (tenants.reseller_id + status); the only hand-set numbers are each
// rep's wholesale price, typed here, and the price they charge each
// business, typed by them.
export default async function ResellersPage() {
  const admin = createAdminClient();

  const { data: resellerRows, error: resellersError } = await admin
    .from('resellers')
    .select('*')
    .order('created_at', { ascending: false });

  if (isMissingResellersTable(resellersError)) {
    return (
      <div>
        <Text variant="h1">Vendedores</Text>
        <Card className="mt-6 max-w-xl">
          <p className="text-sm font-medium text-ink">Falta correr la migración</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Esta sección necesita la tabla <code className="font-mono text-xs">resellers</code>. Corre{' '}
            <code className="font-mono text-xs">db/016_resellers.sql</code> en el SQL Editor de Supabase y
            recarga.
          </p>
        </Card>
      </div>
    );
  }

  const resellers = (resellerRows ?? []) as Reseller[];

  // One query for every business that has a rep, grouped in memory:
  // the whole network is a handful of rows, so N queries would be worse
  // than one small scan.
  const { data: tenantRows } = await admin
    .from('tenants')
    .select('id, status, reseller_id, retail_price_mxn')
    .not('reseller_id', 'is', null);

  type Row = { status: string; reseller_id: string; retail_price_mxn: number | null };
  const byReseller = new Map<string, Row[]>();
  for (const t of (tenantRows ?? []) as Row[]) {
    const list = byReseller.get(t.reseller_id) ?? [];
    list.push(t);
    byReseller.set(t.reseller_id, list);
  }

  const totalBusinesses = tenantRows?.length ?? 0;
  // What the network bills bicho every month — income, not cost: reps buy
  // wholesale and resell at their own price.
  const totalIncome = resellers.reduce(
    (sum, r) => sum + monthlyDue(byReseller.get(r.id) ?? [], r.wholesale_price_mxn),
    0
  );
  const activeReps = resellers.filter((r) => r.active).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Text variant="h1">Vendedores</Text>
          <Text variant="body" className="mt-1 text-muted">
            La red que trae negocios. Cada uno entra a vendedores.{process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'tuapp.com'}{' '}
            con su propio acceso.
          </Text>
        </div>
        <Link href="/vendedores/nuevo">
          <Button type="button">
            <Plus className="h-4 w-4" />
            Nuevo vendedor
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Vendedores activos</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{activeReps}</p>
          <p className="mt-1 text-xs text-muted">{resellers.length} registrados en total</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Negocios traídos por la red</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{totalBusinesses}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Te pagan al mes</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{formatMxn(totalIncome)}</p>
          <p className="mt-1 text-xs text-muted">Solo cuenta negocios activos</p>
        </Card>
      </div>

      <Card className="mt-8" padded={false}>
        {resellers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Todavía no hay vendedores"
            description="Registra al primero para que pueda dar de alta negocios con su propio acceso."
          />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Vendedor</Th>
                <Th>Zona</Th>
                <Th>Negocios</Th>
                <Th>Activos</Th>
                <Th>Te paga / mes</Th>
                <Th>Él cobra / mes</Th>
                <Th>Estado</Th>
              </tr>
            </Thead>
            <tbody>
              {resellers.map((r) => {
                const tenants = byReseller.get(r.id) ?? [];
                return (
                  <Tr key={r.id}>
                    <Td>
                      <Link href={`/vendedores/${r.id}`} className="font-medium text-ink hover:underline">
                        {r.name}
                      </Link>
                      <span className="mt-0.5 block text-xs text-muted">{r.email}</span>
                    </Td>
                    <Td className="text-muted">{r.zone || '—'}</Td>
                    <Td className="tabular-nums">{tenants.length}</Td>
                    <Td className="tabular-nums">{countBillable(tenants)}</Td>
                    <Td className="tabular-nums">{formatMxn(monthlyDue(tenants, r.wholesale_price_mxn))}</Td>
                    <Td className="tabular-nums text-muted">{formatMxn(monthlyRetail(tenants))}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-2 text-sm text-muted">
                        <span
                          className={'h-2 w-2 rounded-full ' + (r.active ? 'bg-success' : 'bg-muted')}
                          aria-hidden="true"
                        />
                        {r.active ? 'Activo' : 'Inactivo'}
                        {!r.user_id && r.active && (
                          <span className="ml-1 text-xs text-warning">· sin acceso</span>
                        )}
                      </span>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
