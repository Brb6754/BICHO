import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tenantManageBookingUrl } from './urls';

describe('tenantManageBookingUrl', () => {
  const originalRootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = originalRootDomain;
  });

  it('builds a path-based URL on the root domain, not a tenant subdomain', () => {
    // Real bug this fixed: a subdomain link (`{slug}.{root}/...`) either
    // has no valid TLS cert on the shared *.vercel.app domain, or only
    // resolves on the exact machine running the local dev server — an
    // email link needs to work from a fresh navigation on any device.
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'reservas-saas-sigma.vercel.app';
    const url = tenantManageBookingUrl('test-salon', 'abc-123');
    expect(url).toBe('https://reservas-saas-sigma.vercel.app/t/test-salon/reservar/cita/abc-123');
    expect(url).not.toContain('test-salon.reservas-saas-sigma.vercel.app');
  });

  it('uses http (not https) for local *.localhost dev', () => {
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'localhost:3000';
    const url = tenantManageBookingUrl('test-salon', 'abc-123');
    expect(url).toBe('http://localhost:3000/t/test-salon/reservar/cita/abc-123');
  });

  it('falls back to localhost:3000 when NEXT_PUBLIC_ROOT_DOMAIN is unset', () => {
    const url = tenantManageBookingUrl('test-salon', 'abc-123');
    expect(url).toBe('http://localhost:3000/t/test-salon/reservar/cita/abc-123');
  });
});
