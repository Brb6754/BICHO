import { contrastRatio, readableFgRgb } from '@/lib/branding/colors';
import { moduloIncluido, planMinimoPara, PLANES, type Modulo, type PlanId } from '@/lib/billing/planes';
import type { ProductosDelNegocio } from '@/lib/products';

// La paleta de los módulos: un color por servicio, el MISMO de los
// anuncios de la campaña (redes/facebook-campana/v2/colores.md). Vive
// aquí sola para que el panel, la landing o un post la tomen de un lugar.
// Los que la campaña no tiene salen de los acentos de esa misma familia.
export const COLOR_MODULO = {
  agenda: '#5B34E8', // morado
  recordatorios: '#00C2A8', // turquesa
  regresan: '#FF5A36', // coral
  lealtad: '#FF2E93', // fucsia
  caja: '#00B85C', // verde dinero
  inventario: '#FF8A00', // naranja
  comisiones: '#1F5BFF', // azul eléctrico
  facturacion: '#E5242B', // rojo
  resico: '#E5242B', // rojo, el mismo camino que facturas
  copiloto: '#0D0D0D', // negro, con acento cian
  servicios: '#FFD60A', // amarillo
  cotizaciones: '#14213D', // azul marino
  reuniones: '#C6FF3D', // lima
  posts: '#00E5FF', // cian
  whatsapp: '#25D366', // verde WhatsApp: el canal se reconoce por su color
  boost: '#A020F0', // violeta neón: de la familia de campaña, ningún otro módulo lo usa
  anticipos: '#00B85C', // verde dinero, el mismo de Caja: es cobrar
} as const;
export const ACENTO_COPILOTO = '#00E5FF';

export type ClaveColor = keyof typeof COLOR_MODULO;

/** Fondo del tile y el texto que pasa AA sobre él ("R G B" de readableFgRgb). */
export function colorDe(clave: ClaveColor): { bg: string; fg: string } {
  return { bg: COLOR_MODULO[clave], fg: readableFgRgb(COLOR_MODULO[clave]) };
}

/** Para la prueba: el texto elegido llega a 4.5:1 sobre su fondo. */
export function contrasteTile(clave: ClaveColor): number {
  const { bg, fg } = colorDe(clave);
  const hex = '#' + fg.split(' ').map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  return contrastRatio(bg, hex);
}

export type TileModulo = {
  clave: ClaveColor;
  label: string;
  href: string;
  /** Fuera del plan: candado y lleva a /plan. */
  bloqueado?: { plan: string };
};

// Orden del menú lateral (lo que más se abre, arriba). Cada tile dice qué
// módulo lo prende y a qué sección lleva, sin el prefijo /t/{slug}.
const TILES: { clave: ClaveColor; modulo: Modulo; label: string; ruta: string }[] = [
  { clave: 'agenda', modulo: 'reservas', label: 'Agenda', ruta: '/calendar' },
  { clave: 'caja', modulo: 'caja', label: 'Caja', ruta: '/caja' },
  { clave: 'regresan', modulo: 'regresan', label: 'Clientes que regresan', ruta: '/regresan' },
  { clave: 'lealtad', modulo: 'lealtad', label: 'Lealtad', ruta: '/lealtad' },
  { clave: 'inventario', modulo: 'inventario', label: 'Inventario', ruta: '/inventario' },
  { clave: 'comisiones', modulo: 'comisiones', label: 'Comisiones', ruta: '/comisiones' },
  { clave: 'cotizaciones', modulo: 'cotizaciones', label: 'Cotizaciones', ruta: '/cotizaciones' },
  { clave: 'reuniones', modulo: 'reuniones', label: 'Reuniones', ruta: '/reuniones' },
  { clave: 'facturacion', modulo: 'facturacion', label: 'Facturas', ruta: '/facturas' },
  { clave: 'resico', modulo: 'resico', label: 'Impuestos (RESICO)', ruta: '/resico' },
  { clave: 'posts', modulo: 'posts', label: 'Posts con IA', ruta: '/posts' },
  { clave: 'servicios', modulo: 'reservas', label: 'Servicios', ruta: '/services' },
  { clave: 'anticipos', modulo: 'reservas', label: 'Anticipos', ruta: '/anticipos' },
  { clave: 'copiloto', modulo: 'copiloto', label: 'Copiloto', ruta: '/copiloto' },
  { clave: 'whatsapp', modulo: 'whatsapp', label: 'WhatsApp', ruta: '/whatsapp' },
  { clave: 'boost', modulo: 'boost', label: 'Llena tus huecos', ruta: '/boost' },
];

/**
 * Los tiles del inicio móvil: uno por módulo prendido y, si el negocio
 * tiene plan (`conPlan`), uno con candado por cada módulo que su plan no
 * incluye. La demo no tiene página de plan: pasa conPlan=false.
 */
export function tilesDe(productos: ProductosDelNegocio, base: string, plan: PlanId | null, conPlan = true): TileModulo[] {
  return TILES.flatMap((t): TileModulo[] => {
    if (productos[t.modulo]) return [{ clave: t.clave, label: t.label, href: `${base}${t.ruta}` }];
    if (!conPlan || moduloIncluido(plan, t.modulo)) return [];
    return [{ clave: t.clave, label: t.label, href: `${base}/plan`, bloqueado: { plan: PLANES[planMinimoPara(t.modulo)].nombre } }];
  });
}
