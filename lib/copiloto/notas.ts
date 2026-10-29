import { ejecutarConsulta } from './frontera';
import { embeber, coseno } from './embedder';

// RAG v1: las notas se leen A TRAVÉS de la frontera (con el RLS del
// dueño, igual que cualquier SQL del modelo) y se embeben al vuelo. Un
// negocio tiene decenas de notas, no miles: un escaneo exacto en memoria
// es más rápido que mantener una tabla de vectores sincronizada.
const SQL_NOTAS = `
  select 'contacto' as fuente, c.name as quien, null::text as empresa, c.notes as texto, c.updated_at as fecha
    from contacts c where coalesce(c.notes, '') <> ''
  union all
  select 'cotización #' || q.folio, q.customer_name, null, q.notes, q.created_at
    from quotes q where coalesce(q.notes, '') <> ''
  union all
  select 'reunión (' || coalesce(b.outcome, 'sin resultado') || ')', cu.name, b.company, b.outcome_notes, b.starts_at
    from bookings b left join customers cu on cu.id = b.customer_id
   where coalesce(b.outcome_notes, '') <> ''`;

export type Nota = { fuente: string; quien: string | null; empresa: string | null; texto: string; fecha: string; similitud: number };

export async function buscarEnNotas(userId: string, consulta: string, k = 5): Promise<{ ok: true; notas: Nota[] } | { ok: false; error: string }> {
  const r = await ejecutarConsulta(userId, SQL_NOTAS);
  if (!r.ok) return r;
  const filas = r.filas as unknown as Omit<Nota, 'similitud'>[];
  if (filas.length === 0) return { ok: true, notas: [] };
  const [q, ...vs] = await embeber([consulta, ...filas.map((f) => f.texto)]);
  const notas = filas
    .map((f, i) => ({ ...f, fecha: String(f.fecha), similitud: Math.round(coseno(q, vs[i]) * 100) / 100 }))
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, k);
  return { ok: true, notas };
}
