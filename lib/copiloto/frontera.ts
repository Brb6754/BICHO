import postgres from 'postgres';

// La frontera: el ÚNICO lugar por donde el SQL que escribe el modelo
// llega a la base. Ver docs/copiloto/README.md ("Diseño de la frontera").
//
// Las capas, de la que más garantiza a la que menos:
//   1. transacción `read only`      → el motor rechaza cualquier escritura
//   2. `set local role authenticated` → nunca service_role ni postgres
//   3. `request.jwt.claims` del dueño → auth.uid() es él, y el RLS que ya
//      existe (private.is_member_of_tenant) aísla su negocio
//   4. statement_timeout             → una consulta cara no tumba la base
//   5. validador de texto            → una sola sentencia select/with, y
//      nada que pueda reescribir las capas 2–3 desde adentro
//   6. tope de filas                 → el modelo nunca recibe un volcado
//   7. rollback siempre
//
// Las capas 1–3 viven en Postgres: un modelo no puede convencerlas de
// nada. La 5 es la que cubre el único hueco que dejan (ver abajo).

export const MAX_FILAS = 200;
const TIMEOUT = '3s';

let cliente: postgres.Sql | null = null;
function db() {
  if (!cliente) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Falta DATABASE_URL (pooler de Supabase, modo session).');
    // prepare:false — el pooler no garantiza la misma conexión física
    // para un prepared statement. max bajo: esto es un chat, no un ETL.
    cliente = postgres(url, { prepare: false, max: 3, idle_timeout: 20 });
  }
  return cliente;
}

export type ResultadoConsulta =
  | { ok: true; filas: Record<string, unknown>[]; truncado: boolean }
  | { ok: false; error: string };

// Funciones que, llamadas DENTRO de un select, reescribirían las capas
// 2–3 en la misma transacción: `set_config('request.jwt.claims', …)`
// cambiaría el auth.uid() con el que el RLS decide, y `set_config('role')`
// el rol. El rol `authenticated` puede ejecutarlas (son de pg_catalog),
// así que esto NO lo frena el motor — por eso existe esta capa.
const PROHIBIDO = [
  /\bset_config\b/,
  /\bset\s+(local\s+|session\s+)?(role|session|request|statement_timeout)\b/,
  /\breset\b/,
  /\bpg_sleep_for\b|\bpg_sleep_until\b/, // pg_sleep lo corta el timeout; estas también, pero no hay por qué
  /\bdblink\b|\bpg_read_file\b|\blo_import\b|\bcopy\b/,
];

/** Quita comentarios y el contenido de literales para analizar solo la estructura. */
function esqueleto(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\$([a-z_]*)\$[\s\S]*?\$\1\$/gi, "''") // dollar-quoting
    .replace(/'(?:[^']|'')*'/g, "''")
    .toLowerCase();
}

export function validarSql(sql: string): { ok: true; sql: string } | { ok: false; error: string } {
  const limpio = sql.trim().replace(/;\s*$/, '');
  if (!limpio) return { ok: false, error: 'Consulta vacía.' };
  const esq = esqueleto(limpio);
  // El nombre entre comillas dobles ("set_config") burlaría las regex.
  const sinComillas = esq.replace(/"/g, '');
  if (esq.includes(';')) return { ok: false, error: 'Solo se permite una sentencia.' };
  if (!/^\s*(select|with)\b/.test(esq)) return { ok: false, error: 'Solo se permiten consultas SELECT o WITH.' };
  for (const patron of PROHIBIDO) {
    if (patron.test(sinComillas)) return { ok: false, error: 'La consulta usa una función o comando no permitido.' };
  }
  return { ok: true, sql: limpio };
}

class Rollback extends Error {}

export async function ejecutarConsulta(userId: string, sql: string): Promise<ResultadoConsulta> {
  const v = validarSql(sql);
  if (!v.ok) return v;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: 'Usuario inválido.' };

  const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
  let filas: Record<string, unknown>[] = [];
  try {
    await db().begin('read only', async (tx) => {
      await tx`set local role authenticated`;
      await tx`select set_config('request.jwt.claims', ${claims}, true)`;
      await tx.unsafe(`set local statement_timeout = '${TIMEOUT}'`);
      const res = await tx.unsafe(`select * from (${v.sql}) q limit ${MAX_FILAS + 1}`);
      filas = [...res] as Record<string, unknown>[];
      throw new Rollback(); // capa 7: nunca commit, aunque sea read only
    });
  } catch (e) {
    if (!(e instanceof Rollback)) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg.includes('statement timeout') ? 'La consulta tardó demasiado (límite 3 s).' : msg };
    }
  }
  const truncado = filas.length > MAX_FILAS;
  return { ok: true, filas: filas.slice(0, MAX_FILAS), truncado };
}
