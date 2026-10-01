import { describe, it, expect } from 'vitest';
import {
  EXTERNAL_SUBDOMAINS,
  PREFIXED_SUBDOMAINS,
  RESERVED_SLUGS,
  ROOT_ALIAS_SUBDOMAINS,
  isReservedSlug,
} from './domains';

// Routing that fails silently is the reason these exist. A business whose
// slug collides with one of ours does not show an error — its page simply
// never loads, and nobody finds out until a customer complains.

describe('isReservedSlug', () => {
  it('refuses every subdomain the proxy already routes', () => {
    for (const name of [
      ...Object.keys(PREFIXED_SUBDOMAINS),
      ...Object.keys(ROOT_ALIAS_SUBDOMAINS),
      ...EXTERNAL_SUBDOMAINS,
    ]) {
      expect(isReservedSlug(name)).toBe(true);
    }
  });

  it('refuses the app’s own top-level routes', () => {
    for (const name of ['demo', 'ia', 'plataforma', 'privacidad', 'terminos', 'api']) {
      expect(isReservedSlug(name)).toBe(true);
    }
  });

  it('lets a real business slug through', () => {
    for (const name of ['test-salon', 'barber', 'spa', 'barberia-el-punto']) {
      expect(isReservedSlug(name)).toBe(false);
    }
  });

  it('is not fooled by case or stray whitespace', () => {
    expect(isReservedSlug('  Reservas ')).toBe(true);
    expect(isReservedSlug('ADMIN')).toBe(true);
  });
});

describe('the two kinds of subdomain stay distinct', () => {
  // reservas must NOT be a prefixed subdomain: that landing links to
  // /demo, /plataforma, /privacidad and /terminos, which live at the
  // apex. Prefixing the whole path would 404 all four.
  it('reservas is a root alias, never a prefix', () => {
    expect(ROOT_ALIAS_SUBDOMAINS.reservas).toBe('/reservas');
    expect(PREFIXED_SUBDOMAINS.reservas).toBeUndefined();
  });

  it('admin and vendedores are prefixes, never root aliases', () => {
    expect(PREFIXED_SUBDOMAINS.admin).toBe('/admin');
    expect(PREFIXED_SUBDOMAINS.vendedores).toBe('/vendedor');
    expect(ROOT_ALIAS_SUBDOMAINS.admin).toBeUndefined();
    expect(ROOT_ALIAS_SUBDOMAINS.vendedores).toBeUndefined();
  });

  it('no name is in both lists', () => {
    const overlap = Object.keys(PREFIXED_SUBDOMAINS).filter((k) => k in ROOT_ALIAS_SUBDOMAINS);
    expect(overlap).toEqual([]);
  });

  it('every routed subdomain is also a reserved slug', () => {
    for (const name of [
      ...Object.keys(PREFIXED_SUBDOMAINS),
      ...Object.keys(ROOT_ALIAS_SUBDOMAINS),
      ...EXTERNAL_SUBDOMAINS,
    ]) {
      expect(RESERVED_SLUGS.has(name)).toBe(true);
    }
  });

  // choose is served by a different Vercel project, so this app must not
  // route it — but it still has to be unavailable as a business slug.
  it('choose is external: reserved, but routed by nobody here', () => {
    expect(EXTERNAL_SUBDOMAINS.has('choose')).toBe(true);
    expect(isReservedSlug('choose')).toBe(true);
    expect(ROOT_ALIAS_SUBDOMAINS.choose).toBeUndefined();
    expect(PREFIXED_SUBDOMAINS.choose).toBeUndefined();
  });
});
