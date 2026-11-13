import type { LucideIcon } from 'lucide-react';
import { Package, HeartHandshake } from 'lucide-react';
import { addDaysKey } from '@/lib/dates/tenantTime';
import { rangoDe, resumir, type Movimiento } from '@/lib/caja/resumen';
import { armar, type ResumenProps } from './resumen/comun';
import { ResumenClasico } from './resumen/Clasico';
import { ResumenSuave } from './resumen/Suave';
import { ResumenVibrante } from './resumen/Vibrante';
import { ResumenPoster } from './resumen/Poster';

// EL RESUMEN — la pantalla con la que la dueña abre el día.
//
// Una sola pregunta manda: "¿qué tengo hoy?". Cada uno de los cuatro
// estilos (Clásico, Suave, Vibrante, Póster) la contesta con su propio
// acomodo, siempre con los mismos datos: la siguiente cita, el avance
// del día, lo que pide atención, el dinero y la agenda.
//
// Es la misma pieza para el panel real (/dashboard) y la demo sin login
// (/panel): cada página junta sus datos y esta solo pinta. `base` es el
// segmento de los enlaces, igual que navBase en el Sidebar.

export type Alerta = {
  key: string;
  icon: LucideIcon;
  tone: 'warning' | 'brand';
  title: string;
  detail?: string;
  href: string;
};

export type Dinero = { hoyCents: number; semanaCents: number; dias: { key: string; cents: number }[] };

/** Ventas de hoy, de la semana y de los últimos 7 días, de los mismos movimientos que la Caja. */
export function dineroDe(movs: Movimiento[], hoy: string): Dinero {
  const semana = rangoDe('semana', hoy);
  return {
    hoyCents: resumir(movs, hoy, hoy).vendidoCents,
    semanaCents: resumir(movs, semana.desde, semana.hasta).vendidoCents,
    dias: Array.from({ length: 7 }, (_, i) => {
      const key = addDaysKey(hoy, i - 6);
      return { key, cents: resumir(movs, key, key).vendidoCents };
    }),
  };
}

/** Las alertas que el Resumen sabe armar, con el mismo texto en el panel real y en la demo. */
export function alertaInventario(nombres: string[], base: string): Alerta | null {
  if (!nombres.length) return null;
  return {
    key: 'inventario',
    icon: Package,
    tone: 'warning',
    title: nombres.length === 1 ? 'Se está acabando 1 producto' : `Se están acabando ${nombres.length} productos`,
    detail: nombres.slice(0, 3).join(', ') + (nombres.length > 3 ? '…' : ''),
    href: `${base}/inventario`,
  };
}

export function alertaRegresan(nombres: string[], semanas: number, base: string): Alerta | null {
  if (!nombres.length) return null;
  return {
    key: 'regresan',
    icon: HeartHandshake,
    tone: 'brand',
    title:
      nombres.length === 1
        ? `1 clienta no ha vuelto en ${semanas} semanas`
        : `${nombres.length} clientas no han vuelto en ${semanas} semanas`,
    detail: 'Escríbeles hoy: ' + nombres.slice(0, 3).join(', ') + (nombres.length > 3 ? '…' : ''),
    href: `${base}/regresan`,
  };
}

// Un componente por estilo (db/054): las mismas props, las mismas
// cuentas (armar), distinto acomodo. El estilo de la piel —colores,
// radios, sombras— vive en globals.css bajo .tenant-dash[data-estilo].
export function ResumenHoy(props: ResumenProps) {
  const d = armar(props);
  switch (props.estilo) {
    case 'suave':
      return <ResumenSuave p={props} d={d} />;
    case 'vibrante':
      return <ResumenVibrante p={props} d={d} />;
    case 'poster':
      return <ResumenPoster p={props} d={d} />;
    default:
      return <ResumenClasico p={props} d={d} />;
  }
}
