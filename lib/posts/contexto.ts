import { dayKey, formatTime, instantFromLocal } from '@/lib/dates/tenantTime';

// Lógica pura del módulo "Posts con IA": qué se le manda a Claude, cómo
// se revisa lo que devuelve, el límite del mes y los datos de la imagen.
// Sin Supabase ni red, para poder probarla (contexto.test.ts).

export const LIMITE_MENSUAL = 30;

export const TIPOS = ['servicio', 'promo', 'horarios', 'fecha', 'libre'] as const;
export type Tipo = (typeof TIPOS)[number];
export const FORMATOS = ['feed', 'historia', 'whatsapp'] as const;
export type Formato = (typeof FORMATOS)[number];
export const PLANTILLAS = ['precio', 'horarios', 'temporada', 'servicio', 'lealtad'] as const;
export type Plantilla = (typeof PLANTILLAS)[number];

export const FECHAS = [
  { id: 'buen-fin', nombre: 'Buen Fin' },
  { id: 'navidad', nombre: 'Navidad' },
  { id: 'ano-nuevo', nombre: 'Año Nuevo' },
  { id: 'san-valentin', nombre: '14 de febrero' },
  { id: 'dia-mujer', nombre: 'Día de la Mujer (8 de marzo)' },
  { id: 'dia-madres', nombre: 'Día de las Madres (10 de mayo)' },
  { id: 'regreso-clases', nombre: 'Regreso a clases' },
  { id: 'dia-muertos', nombre: 'Día de Muertos' },
] as const;

// Topes de la imagen. El route handler los vuelve a aplicar: es una URL
// que cualquiera puede escribir a mano.
export const TOPE = { titular: 70, detalle: 140, precio: 24, linea: 48, lineas: 6, tema: 300 } as const;

export type Contexto = {
  negocio: string;
  link: string;
  tipo: Tipo;
  formato: Formato;
  servicios: { nombre: string; precioCents: number }[];
  servicio?: { nombre: string; precioCents: number; minutos: number } | null;
  promo?: { titulo: string; detalle: string | null; codigo: string | null; vigencia: string } | null;
  horarios?: string[];
  fecha?: string | null;
  tema?: string | null;
  lealtad?: { sellos: number; premio: string } | null;
};

export type Opcion = { titular: string; texto: string };

export type BaseImagen = {
  plantilla: Plantilla;
  detalle: string;
  precio: string;
  lineas: string[];
  sellos: number;
};

/** $350 · $350.50 — como lo escribiría el negocio. */
export function precioMx(cents: number): string {
  const pesos = cents / 100;
  return `$${pesos.toLocaleString('es-MX', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
export const sinEmoji = (s: string) => s.replace(EMOJI, '').replace(/\s{2,}/g, ' ').trim();

/** Cantidades con $ y porcentajes que aparecen en un texto. */
export function cantidadesEn(texto: string): { pesos: number[]; porcentajes: number[] } {
  const pesos = [...texto.matchAll(/\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g)].map(
    (m) => Number(m[1].replace(/,/g, '')) + (m[2] ? Number(m[2].padEnd(2, '0')) / 100 : 0)
  );
  const porcentajes = [...texto.matchAll(/(\d{1,3})\s?%/g)].map((m) => Number(m[1]));
  return { pesos, porcentajes };
}

// Lo único que el texto puede citar: precios del catálogo y lo que
// venga escrito en la promoción o en el tema que puso la dueña.
function permitidas(ctx: Contexto) {
  const pesos = new Set<number>([...ctx.servicios, ...(ctx.servicio ? [ctx.servicio] : [])].map((s) => s.precioCents / 100));
  const porcentajes = new Set<number>();
  for (const t of [ctx.promo?.titulo, ctx.promo?.detalle, ctx.tema, ctx.lealtad?.premio]) {
    if (!t) continue;
    const c = cantidadesEn(t);
    c.pesos.forEach((p) => pesos.add(p));
    c.porcentajes.forEach((p) => porcentajes.add(p));
  }
  return { pesos, porcentajes };
}

/** True si el texto cita un precio o un descuento que no viene de los datos. */
export function inventaCantidades(texto: string, ctx: Contexto): boolean {
  const ok = permitidas(ctx);
  const c = cantidadesEn(texto);
  return c.pesos.some((p) => !ok.pesos.has(p)) || c.porcentajes.some((p) => !ok.porcentajes.has(p));
}

function queAnunciar(ctx: Contexto): string {
  switch (ctx.tipo) {
    case 'servicio':
      return ctx.servicio
        ? `El servicio "${ctx.servicio.nombre}" (${precioMx(ctx.servicio.precioCents)}, ${ctx.servicio.minutos} min).`
        : 'Sus servicios en general.';
    case 'promo':
      return ctx.promo
        ? `La promoción "${ctx.promo.titulo}"${ctx.promo.detalle ? ` — ${ctx.promo.detalle}` : ''}${
            ctx.promo.codigo ? ` (código ${ctx.promo.codigo})` : ''
          }, vigente ${ctx.promo.vigencia}.`
        : 'Su programa de lealtad.';
    case 'horarios':
      return ctx.horarios?.length
        ? `Que quedan horarios libres esta semana: ${ctx.horarios.join('; ')}.`
        : 'Que todavía hay lugar esta semana (no menciones horas concretas).';
    case 'fecha':
      return `Un post para ${ctx.fecha ?? 'una fecha especial'}. Sin descuentos salvo que vengan en los datos.`;
    case 'libre':
      return `El tema que pidió la dueña: «${ctx.tema ?? ''}».`;
  }
}

const POR_FORMATO: Record<Formato, string> = {
  feed: 'Post de feed de Instagram/Facebook: 3 a 6 líneas cortas y 3 a 5 hashtags al final, antes del link.',
  historia: 'Historia de Instagram: muy corto, 1 a 3 líneas, sin hashtags.',
  whatsapp: 'Mensaje de WhatsApp para mandar a sus clientas: directo y amable, como de persona a persona, sin hashtags.',
};

export function armarPrompt(ctx: Contexto): { system: string; user: string } {
  const system = [
    'Escribes textos para redes sociales de un negocio pequeño de servicios en México (salón, uñas, pestañas, spa, consultorio).',
    'Español mexicano, tono cercano y genuino, como lo escribiría la dueña. Nada de halagos exagerados ni promesas ("el mejor", "garantizado", "resultados increíbles").',
    'REGLA DURA: usa SOLO los datos que te doy. Nunca inventes precios, descuentos, porcentajes, promociones, horarios, premios ni datos del negocio. Si un dato no viene, no lo menciones.',
    'Máximo 2 o 3 emojis por texto.',
    `Cada texto termina con este link de reserva, exacto: ${ctx.link}`,
    POR_FORMATO[ctx.formato],
    'Para cada opción da también un "titular" para la imagen: máximo 6 palabras, sin emojis, sin precio.',
    'Devuelve 3 opciones con enfoques distintos entre sí.',
  ].join('\n');

  const datos = {
    negocio: ctx.negocio,
    servicios: ctx.servicios.map((s) => ({ nombre: s.nombre, precio: precioMx(s.precioCents) })),
    ...(ctx.lealtad ? { tarjeta_de_lealtad: `${ctx.lealtad.sellos} sellos = ${ctx.lealtad.premio}` } : {}),
    link_de_reserva: ctx.link,
  };

  const user = `Datos reales del negocio:\n${JSON.stringify(datos, null, 2)}\n\nQué anunciar: ${queAnunciar(ctx)}`;
  return { system, user };
}

/** Lo que queda en el historial: una línea legible. */
export function resumenDe(ctx: Contexto): string {
  const que =
    ctx.tipo === 'servicio'
      ? ctx.servicio?.nombre ?? 'Servicios'
      : ctx.tipo === 'promo'
        ? ctx.promo?.titulo ?? 'Lealtad'
        : ctx.tipo === 'horarios'
          ? 'Horarios libres esta semana'
          : ctx.tipo === 'fecha'
            ? ctx.fecha ?? 'Fecha especial'
            : ctx.tema ?? 'Tema libre';
  return que.slice(0, TOPE.tema) || 'Post';
}

/** El JSON Schema que se le pide a Claude (structured outputs). */
export const ESQUEMA_SALIDA = {
  type: 'object',
  properties: {
    opciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: { titular: { type: 'string' }, texto: { type: 'string' } },
        required: ['titular', 'texto'],
        additionalProperties: false,
      },
    },
  },
  required: ['opciones'],
  additionalProperties: false,
} as const;

/**
 * Revisa lo que devolvió Claude. Descarta opciones vacías, repetidas o
 * que citan una cantidad que no viene de los datos; asegura el link al
 * final. Lanza si no queda ninguna.
 */
export function validarOpciones(raw: unknown, ctx: Contexto): Opcion[] {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error('La IA respondió algo que no se pudo leer. Intenta de nuevo.');
    }
  }
  const lista = (data as { opciones?: unknown })?.opciones;
  if (!Array.isArray(lista)) throw new Error('La IA respondió algo que no se pudo leer. Intenta de nuevo.');

  const vistas = new Set<string>();
  const out: Opcion[] = [];
  for (const o of lista) {
    if (!o || typeof o !== 'object') continue;
    const { titular, texto } = o as Record<string, unknown>;
    if (typeof texto !== 'string' || typeof titular !== 'string') continue;
    const limpio = texto.trim().slice(0, 2200);
    if (!limpio || vistas.has(limpio) || inventaCantidades(limpio, ctx)) continue;
    vistas.add(limpio);
    const t = limpio.includes(ctx.link) ? limpio : `${limpio}\n\n${ctx.link}`;
    out.push({ titular: sinEmoji(titular).slice(0, TOPE.titular) || ctx.negocio, texto: t });
    if (out.length === 3) break;
  }
  if (!out.length) throw new Error('La IA no devolvió opciones usables (o inventó precios). Intenta de nuevo.');
  return out;
}

/** El primer instante del mes en curso, en la zona del negocio (ISO). */
export function inicioDeMes(now: Date, timezone?: string | null): string {
  return instantFromLocal(`${dayKey(now, timezone).slice(0, 8)}01`, '00:00', timezone);
}

export const restantes = (usadas: number) => Math.max(0, LIMITE_MENSUAL - usadas);

/** Plantilla y datos iniciales de la imagen según qué se anuncia. */
export function baseImagen(ctx: Contexto): BaseImagen {
  const sellos = Math.min(12, Math.max(2, ctx.lealtad?.sellos ?? 6));
  const recorta = (s: string, n: number) => s.slice(0, n);
  switch (ctx.tipo) {
    case 'servicio':
      return {
        plantilla: ctx.servicio && ctx.servicio.precioCents > 0 ? 'precio' : 'servicio',
        detalle: recorta(ctx.servicio ? `${ctx.servicio.nombre} · ${ctx.servicio.minutos} min` : ctx.negocio, TOPE.detalle),
        precio: ctx.servicio && ctx.servicio.precioCents > 0 ? precioMx(ctx.servicio.precioCents) : '',
        lineas: [],
        sellos,
      };
    case 'promo':
      return ctx.promo
        ? {
            plantilla: 'precio',
            detalle: recorta([ctx.promo.detalle, ctx.promo.codigo && `Código ${ctx.promo.codigo}`].filter(Boolean).join(' · '), TOPE.detalle),
            precio: '',
            lineas: [],
            sellos,
          }
        : { plantilla: 'lealtad', detalle: recorta(ctx.lealtad?.premio ?? '', TOPE.detalle), precio: '', lineas: [], sellos };
    case 'horarios':
      return {
        plantilla: 'horarios',
        detalle: 'Reserva en línea',
        precio: '',
        lineas: (ctx.horarios ?? []).slice(0, TOPE.lineas).map((l) => recorta(l, TOPE.linea)),
        sellos,
      };
    case 'fecha':
      return { plantilla: 'temporada', detalle: recorta(ctx.fecha ?? '', TOPE.detalle), precio: '', lineas: [], sellos };
    case 'libre':
      return { plantilla: 'servicio', detalle: recorta(ctx.negocio, TOPE.detalle), precio: '', lineas: [], sellos };
  }
}

/** La URL de la imagen (route handler app/api/posts/imagen). */
export function imagenUrl(slug: string, formato: Formato, titular: string, base: BaseImagen): string {
  const q = new URLSearchParams({
    slug,
    f: formato === 'historia' ? 'historia' : 'feed',
    p: base.plantilla,
    t: titular.slice(0, TOPE.titular),
    d: base.detalle.slice(0, TOPE.detalle),
    pr: base.precio.slice(0, TOPE.precio),
    l: base.lineas.slice(0, TOPE.lineas).join('|'),
    s: String(base.sellos),
  });
  return `/api/posts/imagen?${q.toString()}`;
}

export const waShareHref = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Huecos libres (de get_available_slots) → "Mié 11: 10:00 · 12:30".
 * Solo futuros, sin repetir, hasta 4 horas por día y 6 días.
 */
export function lineasDeHorarios(inicios: string[], now: Date, timezone?: string | null): string[] {
  const porDia = new Map<string, Set<string>>();
  for (const iso of [...new Set(inicios)].sort()) {
    if (new Date(iso) <= now) continue;
    const dia = dayKey(iso, timezone);
    const horas = porDia.get(dia) ?? new Set<string>();
    horas.add(formatTime(iso, timezone));
    porDia.set(dia, horas);
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, TOPE.lineas)
    .map(([dia, horas]) => {
      const [y, m, d] = dia.split('-').map(Number);
      const semana = DIAS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
      return `${semana} ${d}: ${[...horas].slice(0, 4).join(' · ')}`;
    });
}
