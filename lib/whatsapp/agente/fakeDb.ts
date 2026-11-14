import type { SupabaseClient } from '@supabase/supabase-js';

// Supabase en memoria para las pruebas del agente: aplica de verdad los
// filtros eq/gt/in, así que una consulta que olvide `.eq('tenant_id', …)`
// devuelve filas de otro negocio y la prueba de aislamiento lo atrapa.
// Solo lo que usa este módulo; no es un clon de PostgREST.

type Row = Record<string, unknown>;
type Filtro = (r: Row) => boolean;

export function fakeDb(
  tablas: Record<string, Row[]>,
  opts: {
    rpc?: Record<string, (args: Row) => { data?: unknown; error?: unknown }>;
    unicas?: Record<string, string[]>;
  } = {}
) {
  let n = 0;
  const llamadas: { rpc: string; args: Row }[] = [];

  function from(tabla: string) {
    const filtros: Filtro[] = [];
    let op: 'select' | 'insert' | 'update' = 'select';
    let payload: Row | Row[] | null = null;
    let orden: { col: string; asc: boolean } | null = null;
    let lim: number | null = null;
    let modo: 'many' | 'single' | 'maybe' = 'many';

    const run = () => {
      const filas = (tablas[tabla] ??= []);
      if (op === 'insert') {
        const nuevas: Row[] = (Array.isArray(payload) ? payload : [payload!]).map((r) => ({
          id: `id-${++n}`,
          ...(tabla === 'whatsapp_conversaciones' ? { historial: [], estado: 'ia', last_message_at: new Date().toISOString() } : {}),
          ...r,
        }));
        for (const r of nuevas) {
          for (const col of opts.unicas?.[tabla] ?? []) {
            if (filas.some((f) => f[col] === r[col])) return { data: null, error: { code: '23505' } };
          }
        }
        filas.push(...nuevas);
        return fin(nuevas);
      }
      let res = filas.filter((r) => filtros.every((f) => f(r)));
      if (op === 'update') {
        res.forEach((r) => Object.assign(r, payload));
        return fin(res);
      }
      if (orden) {
        const { col, asc } = orden;
        res = [...res].sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1) * (asc ? 1 : -1));
      }
      if (lim !== null) res = res.slice(0, lim);
      return fin(res);
    };
    const fin = (res: Row[]) => {
      if (modo === 'many') return { data: res, error: null };
      if (modo === 'single' && res.length !== 1) return { data: null, error: { code: 'PGRST116' } };
      return { data: res[0] ?? null, error: null };
    };

    const q = {
      select: () => q,
      insert: (p: Row | Row[]) => ((op = 'insert'), (payload = p), q),
      update: (p: Row) => ((op = 'update'), (payload = p), q),
      eq: (c: string, v: unknown) => (filtros.push((r) => r[c] === v), q),
      gt: (c: string, v: string) => (filtros.push((r) => String(r[c]) > v), q),
      in: (c: string, vs: unknown[]) => (filtros.push((r) => vs.includes(r[c])), q),
      order: (col: string, o?: { ascending?: boolean }) => ((orden = { col, asc: o?.ascending !== false }), q),
      limit: (k: number) => ((lim = k), q),
      single: () => ((modo = 'single'), Promise.resolve(run())),
      maybeSingle: () => ((modo = 'maybe'), Promise.resolve(run())),
      then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(run()).then(ok, ko),
    };
    return q;
  }

  const db = {
    from,
    rpc: async (nombre: string, args: Row) => {
      llamadas.push({ rpc: nombre, args });
      const h = opts.rpc?.[nombre];
      return h ? { data: null, error: null, ...h(args) } : { data: null, error: { code: 'PGRST202' } };
    },
  };
  return { db: db as unknown as SupabaseClient, tablas, llamadas };
}
