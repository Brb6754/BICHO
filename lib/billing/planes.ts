// Los tres planes de bicho (decisión de Bruno, 2026-11-11). Única fuente
// de verdad: precio, módulos incluidos y topes. Reemplaza el esquema viejo
// "$299 base + $200 por módulo". Puro: sin red, para poder probarlo.
//
// El plan vive en `tenants.plan` (columna de db/006, antes siempre
// 'standard'). Un valor que no sea uno de estos tres = negocio de antes de
// los planes: nada se bloquea y se cobra como hoy ($299).

import type { ProductosDelNegocio } from '@/lib/products';

export type PlanId = 'esencial' | 'negocio' | 'pro';
export type Modulo = keyof ProductosDelNegocio;

const ESENCIAL: Modulo[] = ['reservas', 'resico'];
const NEGOCIO: Modulo[] = [...ESENCIAL, 'caja', 'lealtad', 'regresan', 'inventario', 'comisiones'];
const PRO: Modulo[] = [...NEGOCIO, 'cotizaciones', 'reuniones', 'facturacion', 'copiloto'];

export const PLANES: Record<PlanId, { nombre: string; precio: number; modulos: Modulo[]; resumen: string }> = {
  esencial: { nombre: 'Esencial', precio: 299, modulos: ESENCIAL, resumen: 'Reservas, agenda, clientes, servicios, tu marca y recordatorios por correo.' },
  negocio: { nombre: 'Negocio', precio: 499, modulos: NEGOCIO, resumen: 'Esencial + caja, lealtad, clientes que regresan, inventario y comisiones.' },
  pro: { nombre: 'Pro', precio: 799, modulos: PRO, resumen: 'Negocio + cotizaciones, reuniones, facturación (100 timbres/mes) y Copiloto.' },
};
export const PLAN_IDS = Object.keys(PLANES) as PlanId[];

/** Precio de los negocios sin plan nuevo (y de Esencial). */
export const PRECIO_LEGADO_MXN = 299;

// Fundador: los primeros 20 negocios que paguen Negocio se quedan en $299.
export const PRECIO_FUNDADOR_MXN = 299;
export const CUPO_FUNDADOR = 20;

// Topes mensuales (zona del negocio, se reinician el día 1).
export const TOPE_COPILOTO_MES = 500;
export const TOPE_TIMBRES_MES = 100;

// Módulos que no dependen del plan: posts está apagado como producto y
// WhatsApp es un add-on aparte (no es un Modulo).
const SIN_PLAN: Modulo[] = ['posts'];

/** Columna de `tenants` que prende cada módulo. */
export const COLUMNA_MODULO: Record<Modulo, string> = {
  reservas: 'reservas_enabled',
  cotizaciones: 'quotes_enabled',
  facturacion: 'facturacion_enabled',
  reuniones: 'reuniones_enabled',
  copiloto: 'copiloto_enabled',
  caja: 'caja_enabled',
  lealtad: 'lealtad_enabled',
  regresan: 'regresan_enabled',
  posts: 'posts_enabled',
  resico: 'resico_enabled',
  comisiones: 'comisiones_enabled',
  inventario: 'inventario_enabled',
};

export function planDe(raw: unknown): PlanId | null {
  return typeof raw === 'string' && Object.hasOwn(PLANES, raw) ? (raw as PlanId) : null;
}

/** Sin plan nuevo (null) todo se puede prender, como antes. */
export function moduloIncluido(plan: PlanId | null, modulo: Modulo): boolean {
  return plan === null || SIN_PLAN.includes(modulo) || PLANES[plan].modulos.includes(modulo);
}

/** El plan más barato que incluye el módulo (para "incluido en Pro"). */
export function planMinimoPara(modulo: Modulo): PlanId {
  return PLAN_IDS.find((p) => PLANES[p].modulos.includes(modulo)) ?? 'pro';
}

/** Lo que paga al mes un negocio ya dado de alta. */
export function precioMensual(plan: PlanId | null, precioFundador?: number | null): number {
  if (plan === null) return PRECIO_LEGADO_MXN;
  if (plan === 'negocio' && precioFundador != null) return precioFundador;
  return PLANES[plan].precio;
}

/**
 * Monto del checkout. `fundadoresUsados` = negocios que ya congelaron su
 * precio; si queda cupo, Negocio se ofrece a precio fundador.
 */
export function precioCheckout(
  plan: PlanId | null,
  precioFundador: number | null | undefined,
  fundadoresUsados: number
): { monto: number; fundador: boolean } {
  if (plan === 'negocio' && precioFundador == null && fundadoresUsados < CUPO_FUNDADOR) {
    return { monto: PRECIO_FUNDADOR_MXN, fundador: true };
  }
  return { monto: precioMensual(plan, precioFundador), fundador: plan === 'negocio' && precioFundador != null };
}

/** ¿Este cobro autorizado congela el precio fundador? */
export function congelaFundador(
  plan: PlanId | null,
  precioFundador: number | null | undefined,
  montoCobrado: number | null | undefined,
  fundadoresUsados: number
): boolean {
  return plan === 'negocio' && precioFundador == null && montoCobrado === PRECIO_FUNDADOR_MXN && fundadoresUsados < CUPO_FUNDADOR;
}

/** Banderas a escribir al cambiar de plan: lo incluido prendido, lo demás apagado. */
export function banderasDelPlan(plan: PlanId): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const m of Object.keys(COLUMNA_MODULO) as Modulo[]) {
    if (!SIN_PLAN.includes(m)) out[COLUMNA_MODULO[m]] = PLANES[plan].modulos.includes(m);
  }
  return out;
}

/** Mensaje amable al llegar a un tope; null si aún hay espacio. */
export function mensajeTope(usadas: number, tope: number, que: 'copiloto' | 'timbres'): string | null {
  if (usadas < tope) return null;
  return que === 'copiloto'
    ? `Ya usaste las ${tope} preguntas del Copiloto de este mes. Se renuevan el día 1; si necesitas más, escríbenos y lo vemos.`
    : `Ya timbraste las ${tope} facturas incluidas este mes. Se renuevan el día 1; si necesitas más, escríbenos y lo vemos.`;
}
