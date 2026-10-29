import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import postgres from 'postgres';
import { ejecutarConsulta, validarSql } from '@/lib/copiloto/frontera';

// La frontera del copiloto probada contra la base REAL, no contra un
// mock: lo que se está probando es justo lo que hace Postgres.
function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    if (key && !(key in process.env)) process.env[key] = line.slice(i + 1).trim();
  }
}
loadEnvLocal();

describe('validador de la frontera (sin base)', () => {
  it.each([
    ['select 1; drop table quotes'],
    ['delete from quotes'],
    ['set role service_role'],
    ['reset role'],
    ["select set_config('request.jwt.claims', '{\"sub\":\"x\"}', true)"],
    ['select "set_config"(\'role\', \'service_role\', true)'],
    ['select pg_catalog.set_config(\'role\',\'postgres\',true)'],
    ['update quotes set status = \'accepted\''],
  ])('rechaza %s', (sql) => {
    expect(validarSql(sql).ok).toBe(false);
  });

  it.each([
    ['select * from quotes'],
    ['with x as (select 1) select * from x;'],
    ["select * from contacts where notes ilike '%set role%; drop'"], // dentro de un literal no cuenta
  ])('acepta %s', (sql) => {
    expect(validarSql(sql).ok).toBe(true);
  });
});

const hasEnv = Boolean(
  process.env.DATABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

describe.skipIf(!hasEnv)('frontera contra la base real', () => {
  let duenoNova: string;
  let otroUsuario: string;
  let novaId: string;
  let raw: postgres.Sql;
  let quotePrueba: string;
  let limpiar: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    // service_role SOLO para preparar el test (saber qué ids usar),
    // nunca para la consulta que se está probando.
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: nova } = await admin.from('tenants').select('id').eq('slug', 'nova-solar').single();
    novaId = nova!.id;
    const { data: miembros } = await admin.from('business_users').select('user_id, tenant_id');
    duenoNova = miembros!.find((m) => m.tenant_id === novaId)!.user_id;
    const novaUsers = new Set(miembros!.filter((m) => m.tenant_id === novaId).map((m) => m.user_id));
    otroUsuario = miembros!.find((m) => m.tenant_id !== novaId && !novaUsers.has(m.user_id))!.user_id;
    raw = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
    // Nova Solar ya es un cliente real sin datos de demo: el test siembra
    // su propia cotización para tener algo que aislar, y la borra al final.
    const { data: q, error } = await admin
      .from('quotes')
      .insert({ tenant_id: novaId, folio: 999_999, customer_name: 'Prueba de la frontera (test)' })
      .select('id')
      .single();
    if (error) throw error;
    quotePrueba = q.id;
    limpiar = async () => {
      await admin.from('quotes').delete().eq('id', quotePrueba);
    };
  });

  afterAll(async () => {
    await limpiar?.();
    await raw?.end();
  });

  it('delete falla aunque se salte el validador (read only)', async () => {
    // Directo a la transacción, sin validador: prueba la capa 1 sola.
    await expect(
      raw.begin('read only', async (tx) => {
        await tx`set local role authenticated`;
        await tx.unsafe('delete from quotes');
      }),
    ).rejects.toThrow(/read-only/);
    expect((await ejecutarConsulta(duenoNova, 'delete from quotes')).ok).toBe(false);
  });

  it('el dueño de Nova Solar solo ve cotizaciones de Nova Solar', async () => {
    const r = await ejecutarConsulta(duenoNova, 'select tenant_id from quotes');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filas.length).toBeGreaterThan(0);
    expect(r.filas.every((f) => f.tenant_id === novaId)).toBe(true);
  });

  it('un usuario de otro negocio ve cero filas de Nova Solar, aun pidiéndolas', async () => {
    for (const tabla of ['quotes', 'contacts', 'bookings', 'customers']) {
      const r = await ejecutarConsulta(otroUsuario, `select * from ${tabla} where tenant_id = '${novaId}'`);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.filas).toHaveLength(0);
    }
  });

  it('pg_sleep(10) se corta por timeout', async () => {
    const t0 = Date.now();
    const r = await ejecutarConsulta(duenoNova, 'select pg_sleep(10)');
    expect(r.ok).toBe(false);
    expect(Date.now() - t0).toBeLessThan(8000);
  }, 15000);

  it('el rol dentro de la transacción es authenticated, nunca postgres', async () => {
    const r = await ejecutarConsulta(duenoNova, 'select current_user as u, auth.uid() as uid');
    expect(r.ok && r.filas[0]).toMatchObject({ u: 'authenticated', uid: duenoNova });
  });

  it('el tope de filas se respeta', async () => {
    const r = await ejecutarConsulta(duenoNova, 'select generate_series(1, 1000) as n');
    expect(r.ok && r.filas.length).toBe(200);
    expect(r.ok && r.truncado).toBe(true);
  });
});
