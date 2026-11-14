import { describe, expect, it } from 'vitest';
import { reglasRobots } from './robots';

const r = (host: string) => reglasRobots(host, 'bichomx.com', 'https://bichomx.com/sitemap.xml');

describe('reglasRobots', () => {
  it('raíz: indexa y anuncia el sitemap, bloquea paneles', () => {
    const x = r('bichomx.com');
    expect(x.sitemap).toBe('https://bichomx.com/sitemap.xml');
    expect(JSON.stringify(x.rules)).toContain('/admin');
    expect(JSON.stringify(x.rules)).toContain('/t/');
    expect(r('www.bichomx.com').sitemap).toBeDefined();
  });
  it('admin y vendedores: nada', () => {
    expect(r('admin.bichomx.com').rules).toEqual({ userAgent: '*', disallow: '/' });
    expect(r('vendedores.bichomx.com').rules).toEqual({ userAgent: '*', disallow: '/' });
  });
  it('negocio: página pública sí, panel y links privados no, sin sitemap', () => {
    const x = r('lima-laca.bichomx.com');
    expect(x.sitemap).toBeUndefined();
    const reglas = JSON.stringify(x.rules);
    expect(reglas).toContain('"allow":"/"');
    for (const p of ['/dashboard', '/panel', '/cotizacion', '/tarjeta']) expect(reglas).toContain(p);
  });
  it('previews de Vercel: nada', () => {
    expect(r('reservas-saas-abc.vercel.app').rules).toEqual({ userAgent: '*', disallow: '/' });
  });
});
