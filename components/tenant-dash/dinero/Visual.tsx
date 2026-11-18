'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { colorDe, type ClaveColor } from '@/lib/branding/moduloColores';

// Piezas visuales del grupo Dinero (comisiones, inventario, facturas,
// impuestos, cotizaciones, reuniones): que se sienta app y no documento.
// Todas respetan prefers-reduced-motion (transiciones con motion-reduce,
// y .animate-pop-in ya se apaga en globals.css).

// Colores de la paleta de módulos para los avatares: cada persona tiene
// siempre el mismo, así la reconoce de un vistazo.
const AVATAR: ClaveColor[] = ['regresan', 'comisiones', 'lealtad', 'caja', 'inventario', 'agenda', 'recordatorios', 'boost'];

// Arranca vacío y se llena en el siguiente cuadro: así la barra "crece".
function useAlAparecer(set: (v: boolean) => void) {
  useEffect(() => {
    const id = requestAnimationFrame(() => set(true));
    return () => cancelAnimationFrame(id);
  }, [set]);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const [a, b] = [partes[0], partes.length > 1 ? partes[partes.length - 1] : ''];
  return (a[0] + (b[0] ?? '')).toUpperCase();
}

export function Avatar({ nombre, grande = false }: { nombre: string; grande?: boolean }) {
  const { bg, fg } = colorDe(AVATAR[hash(nombre) % AVATAR.length]);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${grande ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-[15px]'}`}
      style={{ background: bg, color: `rgb(${fg})` }}
    >
      {iniciales(nombre)}
    </span>
  );
}

const TONO_BARRA = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  primary: 'bg-primary',
  info: 'bg-info',
} as const;
export type TonoBarra = keyof typeof TONO_BARRA;

/** Barra que se llena al aparecer. `pct` de 0 a 100. */
export function Barra({
  pct,
  tono = 'primary',
  label,
  grueso = false,
}: {
  pct: number;
  tono?: TonoBarra;
  label: string;
  grueso?: boolean;
}) {
  const [listo, setListo] = useState(false);
  useAlAparecer(setListo);
  const valor = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(valor)}
      className={`overflow-hidden rounded-full bg-ink/[0.08] ${grueso ? 'h-3.5' : 'h-2.5'}`}
    >
      <div
        className={`h-full rounded-full ${TONO_BARRA[tono]} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
        style={{ width: `${listo ? valor : 0}%` }}
      />
    </div>
  );
}

/** Anillo de progreso con el contenido al centro ("3 de 6"). */
export function Anillo({
  hechos,
  total,
  children,
  tamano = 112,
}: {
  hechos: number;
  total: number;
  children: React.ReactNode;
  tamano?: number;
}) {
  const [listo, setListo] = useState(false);
  useAlAparecer(setListo);
  const grosor = 10;
  const r = (tamano - grosor) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? hechos / total : 0;
  return (
    <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} className="-rotate-90" aria-hidden="true">
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" strokeWidth={grosor} className="stroke-ink/[0.08]" />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={listo ? c * (1 - pct) : c}
          className={`${pct === 1 ? 'stroke-success' : 'stroke-primary'} transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** El check verde que "salta" al marcar algo como hecho. */
export function CheckAnimado({ chico = false }: { chico?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`animate-pop-in flex shrink-0 items-center justify-center rounded-full bg-success text-white ${chico ? 'h-6 w-6' : 'h-8 w-8'}`}
    >
      <Check className={chico ? 'h-3.5 w-3.5' : 'h-5 w-5'} strokeWidth={3} />
    </span>
  );
}

const TONO_CHIP = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-info-soft text-info',
  primary: 'bg-primary/10 text-ink',
  muted: 'bg-ink/[0.07] text-muted',
} as const;
export type TonoChip = keyof typeof TONO_CHIP;

/** Estado en color, siempre con texto (nunca solo el color). */
export function Chip({ tono, children }: { tono: TonoChip; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${TONO_CHIP[tono]}`}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** Filtro por estado: chips tocables con su cuenta. */
export function FiltroChips<T extends string>({
  opciones,
  valor,
  onChange,
  label,
}: {
  opciones: { id: T; label: string; cuenta: number }[];
  valor: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(o.id)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-medium ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              activo ? 'bg-primary text-[rgb(var(--color-cta-fg))] ring-primary' : 'bg-surface text-ink ring-border hover:bg-ink/[0.04]'
            }`}
          >
            {o.label}
            <span
              className={`rounded-full px-2 text-[13px] font-semibold tabular-nums ${activo ? 'bg-white/25' : 'bg-ink/[0.07] text-muted'}`}
            >
              {o.cuenta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** "Paso 2 de 3" con barra de progreso, para los asistentes. */
export function Pasos({ actual, nombres }: { actual: number; nombres: string[] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-muted">
        Paso {actual + 1} de {nombres.length} · <span className="text-ink">{nombres[actual]}</span>
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {nombres.map((n, i) => (
          <span key={n} className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.08]">
            <span
              className={`block h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none ${i <= actual ? 'w-full' : 'w-0'}`}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
