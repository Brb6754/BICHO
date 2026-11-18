import type { LucideIcon } from 'lucide-react';
import { Package, HeartHandshake } from 'lucide-react';
import { addDaysKey } from '@/lib/dates/tenantTime';
import { rangoDe, resumir, type Movimiento } from '@/lib/caja/resumen';
import { armar, type ResumenProps } from './resumen/comun';
import { Inicio } from './resumen/Inicio';

// EL RESUMEN — la pantalla con la que la dueña abre el día.
//
// Una sola pregunta manda: "¿qué tengo hoy?". Un solo diseño, blanco con
// colores, del teléfono al escritorio (resumen/Inicio): lo que pide
// atención, la siguiente cita, los números del día, los atajos, la agenda
// y los módulos.
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

export function ResumenHoy(props: ResumenProps) {
  return <Inicio p={props} d={armar(props)} modulos={props.modulos ?? []} />;
}
