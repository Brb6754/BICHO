// The sales-rep network (db/016, db/017). Shared by the rep's own panel
// (/vendedor) and the internal panel's Vendedores section, so both count
// the same money.
//
// HOW THE MONEY FLOWS — this was built backwards at first, so it is
// spelled out here: bicho does NOT pay reps a commission. A rep buys at
// wholesale (a fixed price per active business, set by bicho) and sells
// at their own price (set per business, by them). They charge the
// business directly, off-platform; bicho only bills the rep, once a
// month, for however many of their businesses are active.

export type Reseller = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  zone: string | null;
  wholesale_price_mxn: number;
  default_retail_price_mxn: number;
  billing_day: number;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type ResellerTenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  vertical: string | null;
  retail_price_mxn: number | null;
  created_at: string;
};

// Only an ACTIVE business is billable: one still in trial, suspended or
// cancelled costs the rep nothing, because bicho isn't charging for it
// either.
export const BILLABLE_STATUS = 'active';

export function countBillable(tenants: { status: string }[]): number {
  return tenants.filter((t) => t.status === BILLABLE_STATUS).length;
}

// What the rep owes bicho this month.
export function monthlyDue(tenants: { status: string }[], wholesaleMxn: number): number {
  return countBillable(tenants) * Math.max(0, Math.round(wholesaleMxn));
}

// What the rep charges their own businesses this month. A business with
// no price set yet contributes nothing rather than guessing a number.
export function monthlyRetail(tenants: { status: string; retail_price_mxn?: number | null }[]): number {
  return tenants
    .filter((t) => t.status === BILLABLE_STATUS)
    .reduce((sum, t) => sum + Math.max(0, Math.round(t.retail_price_mxn ?? 0)), 0);
}

// The rep's margin. Can go negative if they priced a business below
// wholesale, and it is shown as such — hiding that would be the one
// number a rep most needs to see.
export function monthlyMargin(
  tenants: { status: string; retail_price_mxn?: number | null }[],
  wholesaleMxn: number
): number {
  return monthlyRetail(tenants) - monthlyDue(tenants, wholesaleMxn);
}

// "$1,200" — whole pesos, es-MX grouping. No decimals anywhere in this
// feature: these are hand-set round numbers, not computed cents.
export function formatMxn(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return sign + '$' + Math.abs(Math.round(amount)).toLocaleString('es-MX');
}

// "el 5 de cada mes"
export function billingDayLabel(day: number): string {
  return `el ${Math.min(28, Math.max(1, Math.round(day)))} de cada mes`;
}

// db/016 not applied yet: PostgREST answers 42P01 (undefined_table) or
// PGRST205 (table not found in schema cache). Everything that reads
// resellers uses this so the panels can say "falta correr la migración"
// instead of crashing or silently showing an empty list.
export function isMissingResellersTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  return /relation .*resellers.* does not exist|could not find the table/i.test(error.message ?? '');
}

export const STATUS_LABELS: Record<string, string> = {
  trial: 'En prueba',
  active: 'Activo',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
};
