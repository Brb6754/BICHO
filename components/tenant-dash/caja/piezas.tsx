'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Banknote,
  Check,
  CreditCard,
  Delete,
  Home,
  Lightbulb,
  Package,
  Receipt,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';
import type { CategoriaGasto, Metodo } from '@/lib/caja/resumen';

// Piezas de la Caja que comparten el tablero y sus hojas: colores e
// íconos por forma de pago, el teclado de montos, la palomita de "listo"
// y el conteo animado del número grande.

/** Cada forma de pago con su color de la paleta de módulos: el mismo en la barrita, la lista y los botones. */
export const METODO_INFO: Record<Metodo, { label: string; color: string; Icono: LucideIcon }> = {
  efectivo: { label: 'Efectivo', color: COLOR_MODULO.caja, Icono: Banknote },
  tarjeta: { label: 'Tarjeta', color: COLOR_MODULO.comisiones, Icono: CreditCard },
  transferencia: { label: 'Transferencia', color: COLOR_MODULO.lealtad, Icono: Smartphone },
};

export const CATEGORIA_INFO: Record<CategoriaGasto, { label: string; Icono: LucideIcon }> = {
  productos: { label: 'Productos', Icono: Package },
  renta: { label: 'Renta', Icono: Home },
  sueldos: { label: 'Sueldos', Icono: Users },
  servicios: { label: 'Luz, agua, internet', Icono: Lightbulb },
  otro: { label: 'Otro', Icono: Receipt },
};

/**
 * Las hojas se montan en la raíz del panel (`.tenant-shell`, que trae los
 * colores del negocio) y no dentro de `.dash-main`: ese contenedor es
 * `relative z-10` y deja cualquier Modal DEBAJO de la barra de abajo del teléfono.
 */
export function EncimaDeTodo({ children }: { children: React.ReactNode }) {
  const [destino, setDestino] = useState<Element | null>(null);
  useEffect(() => setDestino(document.querySelector('.tenant-shell') ?? document.body), []);
  return destino ? createPortal(children, destino) : null;
}

export const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

// Botones de las hojas con su propio string completo: a `Button` no se le
// puede subir la letra a 17 px por className (la trampa de CLAUDE.md).
const BOTON = `inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[17px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none ${FOCO}`;
export const BOTON_PRINCIPAL = `${BOTON} bg-primary text-[rgb(var(--color-cta-fg))] shadow-sm hover:brightness-110`;
export const BOTON_CONTORNO = `${BOTON} border border-border bg-surface text-ink hover:bg-ink/[0.03]`;

function sinMovimiento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * El número grande cuenta suave hasta su valor: al abrir desde 0 y, al
 * cobrar, desde lo que había. Con "reducir movimiento" salta directo.
 */
export function useConteo(objetivo: number): number {
  const [valor, setValor] = useState(objetivo);
  const desde = useRef(0);
  useEffect(() => {
    const inicio = desde.current;
    desde.current = objetivo;
    if (inicio === objetivo || sinMovimiento()) {
      setValor(objetivo);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / 800);
      const suave = 1 - Math.pow(1 - p, 3);
      // A medio camino en pesos cerrados: "$1,234.57" girando se ve nervioso.
      setValor(p < 1 ? Math.round((inicio + (objetivo - inicio) * suave) / 100) * 100 : objetivo);
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo]);
  return valor;
}

/** La palomita que se dibuja al guardar. Sin movimiento, aparece quieta. */
export function Palomita({ color = COLOR_MODULO.caja }: { color?: string }) {
  const trazo = useRef<SVGPathElement>(null);
  useEffect(() => {
    if (sinMovimiento() || !trazo.current?.animate) return;
    trazo.current.animate([{ strokeDashoffset: 40 }, { strokeDashoffset: 0 }], {
      duration: 420,
      delay: 120,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'backwards',
    });
  }, []);
  return (
    <span
      className="animate-pop-in flex h-24 w-24 items-center justify-center rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path ref={trazo} d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={40} />
      </svg>
    </span>
  );
}

/** "Listo" grande dentro de una hoja, antes de cerrarse sola. */
export function Listo({ titulo, detalle, color }: { titulo: string; detalle?: string; color?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-8 text-center">
      <Palomita color={color} />
      <p className="text-2xl font-bold tracking-tight text-ink">{titulo}</p>
      {detalle && <p className="text-[17px] text-muted">{detalle}</p>}
    </div>
  );
}

/** Aplica una tecla al texto del monto: un punto, hasta 2 decimales y hasta $9,999,999. */
export function teclear(texto: string, tecla: string): string {
  if (tecla === 'borrar') return texto.slice(0, -1);
  if (tecla === '.') return texto.includes('.') ? texto : (texto || '0') + '.';
  if (!/^\d$/.test(tecla)) return texto;
  const [enteros, decimales] = texto.split('.');
  if (decimales !== undefined) return decimales.length >= 2 ? texto : texto + tecla;
  if (enteros === '0') return tecla;
  return enteros.length >= 7 ? texto : texto + tecla;
}

/** "1250.5" → "1,250.5" para la pantalla del teclado, sin perder lo que va escribiendo. */
export function montoEnPantalla(texto: string): string {
  if (!texto) return '0';
  const [enteros, decimales] = texto.split('.');
  const conComas = Number(enteros || '0').toLocaleString('es-MX');
  return decimales === undefined ? conComas : `${conComas}.${decimales}`;
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'borrar'];

/**
 * Teclado de caja registradora: la pantalla con el monto, montos rápidos
 * y teclas grandes. En la computadora también se escribe con el teclado.
 */
export function Teclado({
  texto,
  onTexto,
  rapidos,
  onListo,
}: {
  texto: string;
  onTexto: (t: string) => void;
  rapidos: number[];
  /** Enter en el teclado físico. */
  onListo?: () => void;
}) {
  const ultimo = useRef({ texto, onTexto, onListo });
  ultimo.current = { texto, onTexto, onListo };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const { texto: t, onTexto: set, onListo: listo } = ultimo.current;
      if (/^\d$/.test(e.key)) set(teclear(t, e.key));
      else if (e.key === '.' || e.key === ',') set(teclear(t, '.'));
      else if (e.key === 'Backspace') set(teclear(t, 'borrar'));
      else if (e.key === 'Enter' && listo) listo();
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div>
      <p className="rounded-2xl bg-paper px-4 py-4 text-right ring-1 ring-border" aria-live="polite">
        <span className="sr-only">Monto: </span>
        <span className="text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-ink">
          ${montoEnPantalla(texto)}
        </span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {rapidos.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onTexto(String(r))}
            className={`min-h-11 flex-1 rounded-full bg-primary/[0.1] px-3 text-[17px] font-semibold tabular-nums text-ink ring-1 ring-primary/25 transition active:scale-95 motion-reduce:transform-none ${FOCO}`}
          >
            ${r.toLocaleString('es-MX')}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {TECLAS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTexto(teclear(texto, t))}
            className={`flex min-h-14 items-center justify-center gap-1.5 rounded-2xl bg-surface text-2xl font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-border transition active:scale-95 active:bg-ink/[0.04] motion-reduce:transform-none ${FOCO}`}
          >
            {t === 'borrar' ? (
              <>
                <Delete className="h-5 w-5" aria-hidden="true" />
                <span className="text-[15px] font-medium">Borrar</span>
              </>
            ) : (
              t
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Botón grande de forma de pago (ícono + texto). Tocarlo guarda. */
export function BotonPago({
  metodo,
  actual,
  disabled,
  onClick,
}: {
  metodo: Metodo;
  actual?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const { label, color, Icono } = METODO_INFO[metodo];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={actual}
      className={`relative flex min-h-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface px-2 py-3 text-[15px] font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition active:scale-95 disabled:opacity-50 motion-reduce:transform-none ${FOCO}`}
      style={{ boxShadow: `inset 0 0 0 ${actual ? 2.5 : 1.5}px ${color}` }}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
        <Icono className="h-5 w-5 text-white" aria-hidden="true" />
      </span>
      {label}
      {actual && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
          <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          <span className="sr-only">(así quedó)</span>
        </span>
      )}
    </button>
  );
}
