import { describe, expect, it } from 'vitest';
import { ordenarPorUso } from './Inicio';
import type { TileModulo } from '@/lib/branding/moduloColores';

const t = (clave: TileModulo['clave'], bloqueado = false): TileModulo => ({
  clave,
  label: clave,
  href: `/x/${clave}`,
  ...(bloqueado ? { bloqueado: { plan: 'Pro' } } : {}),
});

describe('cuadrícula del inicio por uso', () => {
  it('lo diario arriba, lo mensual abajo', () => {
    const orden = ordenarPorUso([t('resico'), t('facturacion'), t('caja'), t('agenda')]).map((x) => x.clave);
    expect(orden).toEqual(['agenda', 'caja', 'facturacion', 'resico']);
  });

  it('lo que el plan no incluye va siempre al final', () => {
    const orden = ordenarPorUso([t('agenda', true), t('resico')]).map((x) => x.clave);
    expect(orden).toEqual(['resico', 'agenda']);
  });
});
