import { describe, it, expect } from 'vitest';
import {
  countBillable,
  monthlyDue,
  monthlyRetail,
  monthlyMargin,
  formatMxn,
  billingDayLabel,
  isMissingResellersTable,
} from './resellers';

// A rep with five businesses: two active (billable), the rest not.
const tenants = [
  { status: 'active', retail_price_mxn: 700 },
  { status: 'active', retail_price_mxn: 650 },
  { status: 'trial', retail_price_mxn: 700 },
  { status: 'suspended', retail_price_mxn: 700 },
  { status: 'cancelled', retail_price_mxn: 700 },
];

const WHOLESALE = 400;

describe('what the rep owes bicho', () => {
  it('counts only active businesses', () => {
    expect(countBillable(tenants)).toBe(2);
    expect(monthlyDue(tenants, WHOLESALE)).toBe(800);
  });

  it('is zero before a wholesale price is set', () => {
    expect(monthlyDue(tenants, 0)).toBe(0);
  });
});

describe("what the rep charges, and what they keep", () => {
  it('adds up the per-business prices of active businesses only', () => {
    expect(monthlyRetail(tenants)).toBe(1350);
  });

  it('ignores a business with no price set instead of inventing one', () => {
    expect(monthlyRetail([{ status: 'active', retail_price_mxn: null }])).toBe(0);
  });

  it('margin is what they charge minus what they owe', () => {
    expect(monthlyMargin(tenants, WHOLESALE)).toBe(550);
  });

  it('shows a negative margin when a business was priced below wholesale', () => {
    const cheap = [{ status: 'active', retail_price_mxn: 300 }];
    expect(monthlyMargin(cheap, WHOLESALE)).toBe(-100);
    expect(formatMxn(monthlyMargin(cheap, WHOLESALE))).toBe('-$100');
  });
});

describe('formatting', () => {
  it('formats whole pesos with es-MX grouping', () => {
    expect(formatMxn(1200)).toBe('$1,200');
    expect(formatMxn(0)).toBe('$0');
  });

  it('describes the billing day and keeps it inside a month every month has', () => {
    expect(billingDayLabel(5)).toBe('el 5 de cada mes');
    expect(billingDayLabel(31)).toBe('el 28 de cada mes');
  });
});

describe('isMissingResellersTable', () => {
  it('recognises the "migration not applied yet" errors', () => {
    expect(isMissingResellersTable({ code: '42P01' })).toBe(true);
    expect(isMissingResellersTable({ code: 'PGRST205' })).toBe(true);
    expect(isMissingResellersTable({ message: 'Could not find the table public.resellers' })).toBe(true);
  });

  it('does not swallow unrelated errors', () => {
    expect(isMissingResellersTable(null)).toBe(false);
    expect(isMissingResellersTable({ code: '23505', message: 'duplicate key' })).toBe(false);
  });
});
