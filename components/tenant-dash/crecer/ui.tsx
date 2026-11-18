'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from '@/components/tenant-dash/ui/Toast';

// Piezas del grupo Crecer (regresan, lealtad, llena tus huecos, referidos,
// posts, WhatsApp, copiloto, marca, plan) para que se sientan app y no
// documento: caras con iniciales, interruptores grandes, anillos, pasos
// ilustrados, burbujas y un marco de teléfono. Panel claro: los tonos
// fijos de aquí pasan AA sobre blanco (texto oscuro sobre pastel).

// Pasteles cálidos con su texto oscuro (≥ 4.5:1).
const TONOS = [
  { bg: '#FDE2D6', fg: '#8A2E12' }, // durazno
  { bg: '#FCE1EC', fg: '#8C1D4F' }, // rosa
  { bg: '#FFF0C2', fg: '#7A5200' }, // miel
  { bg: '#E6F4D9', fg: '#3D6216' }, // pistache
  { bg: '#EDE4FB', fg: '#5B2E9E' }, // lila
  { bg: '#FBE4D2', fg: '#8A4A12' }, // canela
];

/** Siempre el mismo color para la misma persona. */
export function tonoDe(nombre: string) {
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONOS[h % TONOS.length];
}

export function iniciales(nombre: string): string {
  const limpio = nombre.replace(/^Ejemplo:\s*/i, '').trim();
  const partes = limpio.split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '?') + (partes[1]?.[0] ?? '')).toUpperCase();
}

export function Avatar({ nombre, size = 'md' }: { nombre: string; size?: 'md' | 'lg' }) {
  const t = tonoDe(nombre);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-[15px]'}`}
      style={{ background: t.bg, color: t.fg }}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Palomita que aparece con un rebote (sin rebote con movimiento reducido). */
export function CheckListo({ className = '' }: { className?: string }) {
  return (
    <span className={`animate-pop-in inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-white ${className}`} aria-hidden="true">
      <Check className="h-4 w-4" strokeWidth={3} />
    </span>
  );
}

/**
 * Interruptor grande con su texto. Con `type="submit"` vive dentro de un
 * ActionForm (la acción decide); sin `onToggle` ni submit es de muestra
 * (demo): cambia en pantalla y avisa que no se guarda.
 */
export function Interruptor({
  prendido,
  etiqueta,
  type = 'button',
  onToggle,
  disabled,
  textos = ['Prendido', 'Apagado'],
}: {
  prendido: boolean;
  etiqueta: string;
  /** Lo que dice al lado: ["Prendida", "Apagada"], ["Sí", "No"]. */
  textos?: [string, string];
  type?: 'button' | 'submit';
  onToggle?: (v: boolean) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(prendido);
  // Al enviar, el interruptor se mueve ya; si la acción falla, regresa solo.
  const [optimista, setOptimista] = useState<boolean | null>(null);
  const muestra = type === 'button' && !onToggle;
  const on = muestra ? local : (optimista ?? prendido);
  return (
    <button
      type={type}
      role="switch"
      aria-checked={on}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={() => {
        if (type === 'submit') {
          setOptimista(!prendido);
          setTimeout(() => setOptimista(null), 4000);
        } else if (onToggle) onToggle(!on);
        else if (muestra) {
          setLocal(!on);
          toast('Es una demo: aquí no se guarda nada.');
        }
      }}
      className="group inline-flex min-h-[2.75rem] shrink-0 items-center gap-3 rounded-full py-1 pl-1 pr-2 text-[15px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50"
    >
      <span
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-200 motion-reduce:transition-none ${on ? 'bg-success' : 'bg-ink/20'}`}
        aria-hidden="true"
      >
        <span
          className={`absolute left-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none ${on ? 'translate-x-6' : 'translate-x-0'}`}
        />
      </span>
      <span aria-hidden="true">{on ? textos[0] : textos[1]}</span>
    </button>
  );
}

/** Anillo de avance con la cifra en medio ("5 de 300"). */
export function Anillo({ valor, tope, color, etiqueta }: { valor: number; tope: number; color: string; etiqueta: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, tope ? valor / tope : 0);
  return (
    <div className="relative h-36 w-36 shrink-0" role="meter" aria-valuemin={0} aria-valuemax={tope} aria-valuenow={valor} aria-label={etiqueta}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-ink/[0.08]" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[1.75rem] font-semibold leading-none tabular-nums text-ink">{valor}</span>
        <span className="mt-1 text-[13px] text-muted">de {tope}</span>
      </div>
    </div>
  );
}

/** "Cómo funciona" en 3 pasos con dibujo (ícono en círculo de color) y número. */
export function PasosIlustrados({
  pasos,
  color,
}: {
  /** `icono` va como elemento (<Send />): un componente no cruza de server a cliente. */
  pasos: { icono: React.ReactNode; titulo: string; texto: string }[];
  color: string;
}) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {pasos.map((p, i) => (
        <li
          key={p.titulo}
          className="relative flex gap-4 rounded-3xl border border-border bg-surface p-5 sm:flex-col"
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${color}1f`, color }} aria-hidden="true">
            <span className="[&>svg]:h-7 [&>svg]:w-7">{p.icono}</span>
            <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-paper">{i + 1}</span>
          </span>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold leading-snug text-ink">{p.titulo}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-muted">{p.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Slider grande para un número de un formulario (va en el FormData por
 * `name`), con la cifra en vivo y un ejemplo concreto que cambia con él.
 */
export function Deslizador({
  name,
  etiqueta,
  min,
  max,
  inicial,
  formato,
  ejemplo,
}: {
  name: string;
  etiqueta: string;
  min: number;
  max: number;
  inicial: number;
  formato: (v: number) => string;
  ejemplo: (v: number) => string;
}) {
  const [v, setV] = useState(inicial);
  const id = `desliza-${name}`;
  return (
    <div>
      <label htmlFor={id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[15px] font-medium text-ink">{etiqueta}</span>
        <output htmlFor={id} className="text-[1.6rem] font-semibold leading-none tabular-nums text-ink">
          {formato(v)}
        </output>
      </label>
      <input
        id={id}
        name={name}
        type="range"
        min={min}
        max={max}
        step={1}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        className="mt-2 h-11 w-full cursor-pointer accent-primary"
      />
      <p className="text-[14px] leading-relaxed text-muted">{ejemplo(v)}</p>
    </div>
  );
}

// Los dos sliders de "Llena tus huecos", ya armados: las funciones de
// formato no pueden cruzar de un server component a uno de cliente.
const horaCorta = (h: number) => (h % 24 === 12 ? '12 p. m.' : h % 24 === 0 ? '12 a. m.' : h % 24 < 12 ? `${h % 24} a. m.` : `${(h % 24) - 12} p. m.`);

export function DeslizadorDescuento({ inicial }: { inicial: number }) {
  return (
    <Deslizador
      name="descuento"
      etiqueta="Descuento máximo"
      min={5}
      max={50}
      inicial={inicial}
      formato={(v) => `${v}%`}
      ejemplo={(v) => `Ejemplo: con ${v}%, un servicio de $300 nunca baja de $${Math.round(300 * (1 - v / 100))}.`}
    />
  );
}

export function DeslizadorAviso({ inicial }: { inicial: number }) {
  return (
    <Deslizador
      name="aviso"
      etiqueta="Avisar con anticipación"
      min={1}
      max={12}
      inicial={inicial}
      formato={(v) => `${v} ${v === 1 ? 'hora' : 'horas'}`}
      ejemplo={(v) => `Ejemplo: a las 11 a. m. se ofrecen los huecos que empiezan antes de las ${horaCorta(11 + v)}.`}
    />
  );
}

/** Pestañas grandes para cambiar de vista dentro de una página (con su cuenta). */
export function Pestanas<T extends string>({
  opciones,
  actual,
  onCambiar,
  etiqueta,
}: {
  opciones: { id: T; texto: string; cuenta?: number }[];
  actual: T;
  onCambiar: (id: T) => void;
  etiqueta: string;
}) {
  return (
    <div role="tablist" aria-label={etiqueta} className="grid grid-flow-col auto-cols-fr gap-1 rounded-3xl bg-ink/[0.06] p-1 sm:inline-flex sm:rounded-full">
      {opciones.map((o) => {
        const activa = o.id === actual;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onCambiar(o.id)}
            className={`flex min-h-[2.75rem] min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-[1.25rem] px-2 py-1.5 text-center text-[15px] leading-tight sm:flex-nowrap sm:whitespace-nowrap sm:rounded-full font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex-none sm:px-5 ${
              activa ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {o.texto}
            {o.cuenta !== undefined && (
              <span className={`rounded-full px-2 py-0.5 text-[13px] tabular-nums ${activa ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : 'bg-ink/[0.08] text-ink'}`}>
                {o.cuenta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Marco de teléfono para vistas previas en vivo. */
export function MarcoTelefono({ children, etiqueta }: { children: React.ReactNode; etiqueta: string }) {
  return (
    <figure aria-label={etiqueta} className="mx-auto w-full max-w-[300px]">
      <div className="rounded-[2.5rem] bg-[#1c1917] p-2.5 shadow-xl">
        <div className="relative overflow-hidden rounded-[2rem] bg-white text-[#1c1917]">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-[#1c1917]" aria-hidden="true" />
          {children}
        </div>
      </div>
    </figure>
  );
}

/** Contenedor de plática con fondo tipo WhatsApp. */
export function FondoChat({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-2 rounded-2xl bg-[#EFE7DD] p-3 sm:p-4 ${className}`}>{children}</div>;
}

/** Burbuja estilo WhatsApp: `mia` = verde a la derecha. */
export function Burbuja({ mia, autor, children }: { mia?: boolean; autor?: string; children: React.ReactNode }) {
  return (
    <div
      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed text-[#1c1917] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${
        mia ? 'self-end rounded-tr-md bg-[#D9FDD3]' : 'self-start rounded-tl-md bg-white'
      }`}
    >
      {autor && <p className="mb-0.5 text-[13px] font-semibold text-[#3D6216]">{autor}</p>}
      <div className="whitespace-pre-wrap break-words">{children}</div>
    </div>
  );
}
