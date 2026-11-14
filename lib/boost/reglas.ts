import { ADDON_BOOST, TOPE_BOOST_MENSAJES_MES, planDe } from '@/lib/billing/planes';

// Reglas puras de Boost de clientes (sin red, para probarlas). El precio y
// el tope mensual viven en lib/billing/planes.ts; lo de aquí es operación.

/** A cuántas clientas de la lista VIP se les avisa por hueco liberado. */
export const BOOST_VIP_POR_HUECO = 3;
/** Una clienta VIP recibe como mucho un aviso cada tantas horas. */
export const BOOST_VIP_HORAS_ENTRE_AVISOS = 12;
/** Anti-spam: máximo una promoción por clienta cada tantos días. */
export const BOOST_DIAS_ENTRE_PROMOS = 7;
/** Ventana en la que vale el descuento de horas flojas. */
export const BOOST_VENTANA_MIN = 20;
/** Huecos con menos anticipación que esto no se ofrecen: no da tiempo de llegar. */
export const BOOST_MIN_ANTICIPACION_MIN = 30;
/** Promociones por negocio en una corrida del cron. */
export const BOOST_FLOJAS_POR_CORRIDA = 5;
/** Historial que se mira para saber en qué franja suele reservar una clienta. */
export const BOOST_HISTORIAL_DIAS = 180;

// Estimación (no factura de Meta): utilidad MX$0.15–0.20 y marketing ≈3×,
// según WHATSAPP_SETUP.md §3. Revisar contra el cobro real de Meta.
export const COSTO_ESTIMADO_MXN = { vip: 0.2, flojas: 0.6 } as const;

export type BoostTipo = 'vip' | 'flojas';
export type Franja = 'manana' | 'tarde' | 'noche';
export const FRANJAS: { id: Franja; label: string; desde: number; hasta: number }[] = [
  { id: 'manana', label: 'Mañana (antes de 12)', desde: 0, hasta: 12 },
  { id: 'tarde', label: 'Tarde (12 a 5)', desde: 12, hasta: 17 },
  { id: 'noche', label: 'Noche (después de 5)', desde: 17, hasta: 24 },
];
export const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export type TenantBoost = {
  id: string;
  slug: string;
  name: string;
  timezone: string | null;
  plan?: string | null;
  whatsapp_phone_number_id?: string | null;
  boost_vip_enabled?: boolean | null;
  boost_flojas_enabled?: boolean | null;
  boost_descuento_max?: number | null;
  boost_aviso_horas?: number | null;
  boost_dias?: number[] | null;
  boost_hora_desde?: number | null;
  boost_hora_hasta?: number | null;
};

export type ContactoBoost = {
  id: string;
  tenant_id: string;
  nombre: string;
  telefono: string;
  service_type_id: string | null;
  dias: number[] | null;
  franjas: string[] | null;
  consentimiento_avisos: boolean;
  consentimiento_promos: boolean;
  baja_at: string | null;
  ultimo_aviso_at: string | null;
  ultima_promo_at: string | null;
  created_at: string;
};

export function planPermiteBoost(plan: unknown): boolean {
  const p = planDe(plan);
  return p !== null && ADDON_BOOST.planes.includes(p);
}

/** Switch prendido Y plan Negocio/Pro: si bajan a Esencial, Boost se calla solo. */
export function boostActivo(t: TenantBoost | null | undefined, tipo: BoostTipo): boolean {
  if (!t || !planPermiteBoost(t.plan)) return false;
  return tipo === 'vip' ? t.boost_vip_enabled === true : t.boost_flojas_enabled === true;
}

/** Día (0 = domingo) y hora local del negocio para un instante. */
export function localDe(iso: string | Date, timezone: string | null | undefined): { dia: number; hora: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: timezone || 'America/Mexico_City',
  }).formatToParts(new Date(iso));
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partes.find((p) => p.type === 'weekday')?.value ?? '');
  const hora = Number(partes.find((p) => p.type === 'hour')?.value ?? 0);
  return { dia, hora };
}

export function franjaDe(hora: number): Franja {
  return FRANJAS.find((f) => hora >= f.desde && hora < f.hasta)?.id ?? 'noche';
}

/**
 * ¿Le sirve este hueco a esta clienta de la lista VIP? Servicio (o "el
 * que sea"), día y franja; lista vacía = le da igual. Nunca a quien se dio
 * de baja o no dio permiso.
 */
export function coincideVip(
  c: Pick<ContactoBoost, 'service_type_id' | 'dias' | 'franjas' | 'consentimiento_avisos' | 'baja_at'>,
  hueco: { service_type_id: string; starts_at: string },
  timezone: string | null | undefined
): boolean {
  if (!c.consentimiento_avisos || c.baja_at) return false;
  if (c.service_type_id && c.service_type_id !== hueco.service_type_id) return false;
  const { dia, hora } = localDe(hueco.starts_at, timezone);
  if (c.dias?.length && !c.dias.includes(dia)) return false;
  if (c.franjas?.length && !c.franjas.includes(franjaDe(hora))) return false;
  return true;
}

/** Anti-spam de promociones: con permiso, sin baja y sin promo en los últimos X días. */
export function puedeRecibirPromo(c: Pick<ContactoBoost, 'consentimiento_promos' | 'baja_at' | 'ultima_promo_at'>, ahora: Date): boolean {
  if (!c.consentimiento_promos || c.baja_at) return false;
  if (!c.ultima_promo_at) return true;
  return ahora.getTime() - new Date(c.ultima_promo_at).getTime() >= BOOST_DIAS_ENTRE_PROMOS * 86_400_000;
}

export function puedeRecibirAviso(c: Pick<ContactoBoost, 'ultimo_aviso_at'>, ahora: Date): boolean {
  if (!c.ultimo_aviso_at) return true;
  return ahora.getTime() - new Date(c.ultimo_aviso_at).getTime() >= BOOST_VIP_HORAS_ENTRE_AVISOS * 3_600_000;
}

/** Precio con el descuento máximo del negocio (precio piso), redondeado a peso. */
export function precioConDescuento(precioCents: number, descuentoPct: number): number {
  const pct = Math.min(50, Math.max(0, Math.round(descuentoPct)));
  return Math.round((precioCents * (100 - pct)) / 100 / 100) * 100;
}

/**
 * Lo que se cobra al apartar: el precio de la oferta SOLO dentro de su
 * ventana; pasada, el precio normal de hoy del servicio. Nunca menos que
 * el precio guardado en la oferta (no se puede bajar desde el cliente).
 */
export function precioAplicable(
  oferta: { precio_oferta_cents: number; precio_normal_cents: number; expira_at: string },
  precioActualCents: number,
  ahora: Date
): { cents: number; conDescuento: boolean } {
  const vigente = new Date(oferta.expira_at).getTime() > ahora.getTime();
  if (vigente && oferta.precio_oferta_cents < oferta.precio_normal_cents) return { cents: oferta.precio_oferta_cents, conDescuento: true };
  return { cents: precioActualCents, conDescuento: false };
}

export function restantesMes(usados: number): number {
  return Math.max(0, TOPE_BOOST_MENSAJES_MES - usados);
}

// Palabras que significan "ya no me escriban". Mensaje completo, no
// "contiene": "quiero cancelar mi cita" no es una baja.
const BAJAS = new Set([
  'baja', 'stop', 'alto', 'unsubscribe', 'darme de baja', 'dar de baja', 'dame de baja', 'quiero darme de baja',
  'ya no', 'ya no quiero', 'ya no me escriban', 'no mas', 'no mas mensajes', 'no mas avisos', 'no mas promociones',
  'cancelar avisos', 'cancelar promociones', 'detener', 'parar',
]);

export function esBaja(texto: string | null | undefined): boolean {
  const limpio = (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return BAJAS.has(limpio);
}

export function formatoPesos(cents: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(cents / 100);
}

export type ResultadosBoost = {
  huecosOfrecidos: number;
  huecosLlenados: number;
  recuperadoCents: number;
  mensajes: { vip: number; flojas: number };
  costoEstimadoMxn: number;
};

/**
 * Resultados REALES del periodo: huecos distintos ofrecidos (recurso +
 * hora), citas que salieron de Boost y siguen en pie, la suma de su
 * precio, y el costo ESTIMADO de los mensajes que sí salieron.
 */
export function resumirResultados(
  ofertas: { resource_id: string; starts_at: string }[],
  citas: { status: string; boost_precio_cents: number | null }[],
  mensajes: { tipo: string; status: string }[]
): ResultadosBoost {
  const vivas = citas.filter((c) => c.status !== 'cancelled');
  const enviados = mensajes.filter((m) => m.status === 'sent');
  const vip = enviados.filter((m) => m.tipo === 'vip').length;
  const flojas = enviados.filter((m) => m.tipo === 'flojas').length;
  return {
    huecosOfrecidos: new Set(ofertas.map((o) => `${o.resource_id}|${o.starts_at}`)).size,
    huecosLlenados: vivas.length,
    recuperadoCents: vivas.reduce((s, c) => s + (c.boost_precio_cents ?? 0), 0),
    mensajes: { vip, flojas },
    costoEstimadoMxn: Math.round((vip * COSTO_ESTIMADO_MXN.vip + flojas * COSTO_ESTIMADO_MXN.flojas) * 100) / 100,
  };
}
