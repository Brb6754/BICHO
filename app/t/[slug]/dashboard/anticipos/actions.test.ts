import { describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/lib/whatsapp/agente/fakeDb';

// guardarAnticipos con y sin db/062 (la columna de "Cómo te pagan").

const estado = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => estado.db }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/tenantStaff', () => ({
  requireTenantStaff: vi.fn(async () => ({ tenantId: 'T-A', userId: 'u-1', role: 'owner', timezone: 'America/Mexico_City' })),
}));

import { guardarAnticipos } from './actions';

const form = () => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ activado: '1', monto_general: '150', apartado_min: '30', reagendar_horas: '24', politica: '', instrucciones: 'CLABE 0123 a nombre de Ana' })) f.append(k, v);
  return f;
};

describe('guardarAnticipos', () => {
  it('con db/062 guarda también las instrucciones', async () => {
    const { db, tablas } = fakeDb({ tenants: [{ id: 'T-A' }] });
    estado.db = db;
    expect(await guardarAnticipos('salon-a', form())).toEqual({ aviso: undefined });
    expect(tablas.tenants[0]).toMatchObject({ anticipo_enabled: true, anticipo_mxn: 150, anticipo_apartado_min: 30, anticipo_instrucciones: 'CLABE 0123 a nombre de Ana' });
  });

  it('sin db/062 guarda lo demás y avisa', async () => {
    const { db, tablas } = fakeDb({ tenants: [{ id: 'T-A' }] }, { sinColumnas: { tenants: ['anticipo_instrucciones'] } });
    estado.db = db;
    const r = await guardarAnticipos('salon-a', form());
    expect(r.aviso).toMatch(/falta correr db\/062/);
    expect(tablas.tenants[0]).toMatchObject({ anticipo_enabled: true, anticipo_apartado_min: 30 });
    expect(tablas.tenants[0].anticipo_instrucciones).toBeUndefined();
  });

  it('sin db/061 tampoco: dice que falta esa migración', async () => {
    const { db } = fakeDb({ tenants: [{ id: 'T-A' }] }, { sinColumnas: { tenants: ['anticipo_instrucciones', 'anticipo_enabled'] } });
    estado.db = db;
    await expect(guardarAnticipos('salon-a', form())).rejects.toThrow(/db\/061/);
  });
});
