// Limpieza de una sola vez: une los rangos encimados que ya están en la
// base (anteriores al arreglo de `createScheduleSlot`).
//
// Correr con:  node db/cleanup-overlapping-schedules.mjs          (en seco)
//              node db/cleanup-overlapping-schedules.mjs --aplicar
//
// La lógica de unión es la misma que `lib/schedule/merge.ts`, que es la
// fuente de verdad y la que tiene las pruebas. Está copiada aquí porque
// este script es JavaScript suelto y no puede importar TypeScript; son
// diez líneas y el script se corre una vez.
//
// NUNCA quita tiempo abierto: solo fusiona rangos que se enciman o se
// tocan. Un turno partido de verdad (9–14 y 16–20) queda intacto.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const aplicar = process.argv.includes('--aplicar');

const hhmm = (t) => String(t).trim().slice(0, 5);

function mergeRanges(rangos) {
  const limpios = rangos
    .map((r) => ({ starts_at: hhmm(r.starts_at), ends_at: hhmm(r.ends_at) }))
    .filter((r) => r.starts_at < r.ends_at)
    .sort((a, b) => (a.starts_at < b.starts_at ? -1 : a.starts_at > b.starts_at ? 1 : 0));

  const salida = [];
  for (const r of limpios) {
    const ultimo = salida[salida.length - 1];
    if (ultimo && r.starts_at <= ultimo.ends_at) {
      if (r.ends_at > ultimo.ends_at) ultimo.ends_at = r.ends_at;
    } else {
      salida.push({ ...r });
    }
  }
  return salida;
}

const mismos = (a, b) => {
  if (a.length !== b.length) return false;
  const k = (r) => `${hhmm(r.starts_at)}-${hhmm(r.ends_at)}`;
  const x = a.map(k).sort();
  const y = b.map(k).sort();
  return x.every((v, i) => v === y[i]);
};

const { data: filas, error } = await db
  .from('resource_schedules')
  .select('id, tenant_id, resource_id, day_of_week, starts_at, ends_at');
if (error) {
  console.error('No se pudo leer resource_schedules:', error.message);
  process.exit(1);
}

const { data: recursos } = await db.from('resources').select('id, name');
const { data: negocios } = await db.from('tenants').select('id, slug');
const nombre = Object.fromEntries((recursos ?? []).map((r) => [r.id, r.name]));
const slug = Object.fromEntries((negocios ?? []).map((t) => [t.id, t.slug]));

const grupos = new Map();
for (const f of filas ?? []) {
  const k = `${f.tenant_id}|${f.resource_id}|${f.day_of_week}`;
  if (!grupos.has(k)) grupos.set(k, []);
  grupos.get(k).push(f);
}

let tocados = 0;
let filasAntes = 0;
let filasDespues = 0;

for (const [k, grupo] of grupos) {
  const unidos = mergeRanges(grupo);
  if (mismos(grupo, unidos)) continue;

  const [tenantId, resourceId, dia] = k.split('|');
  tocados++;
  filasAntes += grupo.length;
  filasDespues += unidos.length;

  console.log(
    `${(slug[tenantId] ?? '?').padEnd(16)} ${(nombre[resourceId] ?? '?').padEnd(12)} día ${dia}: ` +
      `${grupo.map((g) => `${hhmm(g.starts_at)}-${hhmm(g.ends_at)}`).join(' + ')}  →  ` +
      `${unidos.map((u) => `${u.starts_at}-${u.ends_at}`).join(' + ')}`
  );

  if (aplicar) {
    await db
      .from('resource_schedules')
      .delete()
      .in('id', grupo.map((g) => g.id));
    await db.from('resource_schedules').insert(
      unidos.map((u) => ({
        tenant_id: tenantId,
        resource_id: resourceId,
        day_of_week: Number(dia),
        starts_at: u.starts_at,
        ends_at: u.ends_at,
      }))
    );
  }
}

console.log(
  `\n${tocados} día(s) con rangos encimados · ${filasAntes} filas → ${filasDespues}` +
    (aplicar ? '  (APLICADO)' : '  (en seco, usa --aplicar para escribir)')
);
