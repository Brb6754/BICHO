import type { LucideIcon } from 'lucide-react';
import { readableFgRgb } from '@/lib/branding/colors';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';

// Piezas visuales de las pantallas de la agenda (servicios, quién atiende,
// horario, clientes): que se sientan app y no documento. Sin hooks, así
// que sirven igual en server components que en client components.

// La familia de colores de los módulos (la misma de los anuncios), sin los
// oscuros ni el amarillo pálido: sobre blanco tienen que verse alegres y
// con su texto legible encima.
const PALETA = [
  COLOR_MODULO.agenda,
  COLOR_MODULO.regresan,
  COLOR_MODULO.recordatorios,
  COLOR_MODULO.lealtad,
  COLOR_MODULO.inventario,
  COLOR_MODULO.comisiones,
  COLOR_MODULO.caja,
  COLOR_MODULO.boost,
];

/** El mismo color para el mismo nombre, siempre: Renata es coral hoy y mañana. */
export function colorPara(texto: string): { bg: string; fg: string } {
  let h = 0;
  for (const c of texto.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bg = PALETA[h % PALETA.length];
  return { bg, fg: `rgb(${readableFgRgb(bg)})` };
}

/** "Lupita Pérez Soto" → "LP". "Silla 2" → "S2". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase();
}

const TAMANO = { chico: 'h-10 w-10 text-[15px]', normal: 'h-12 w-12 text-[17px]', grande: 'h-16 w-16 text-[1.375rem]' };

export function Avatar({ nombre, tamano = 'normal' }: { nombre: string; tamano?: keyof typeof TAMANO }) {
  const { bg, fg } = colorPara(nombre);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight ${TAMANO[tamano]}`}
      style={{ background: bg, color: fg }}
    >
      {iniciales(nombre)}
    </span>
  );
}

/** Ícono en un cuadro de color (servicios). */
export function IconoColor({ texto, icon: Icon }: { texto: string; icon: LucideIcon }) {
  const { bg, fg } = colorPara(texto);
  return (
    <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: bg, color: fg }}>
      <Icon className="h-6 w-6" strokeWidth={2.1} />
    </span>
  );
}

/** Una ficha de dato: "45 min", "Corte de dama". */
export function Chip({ children, icon: Icon }: { children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-ink/[0.06] px-3 py-1 text-[14px] font-medium text-ink">
      {Icon && <Icon className="h-4 w-4 text-ink/70" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Tarjeta base de las listas visuales. */
export const TARJETA =
  'animate-fade-in rounded-3xl border border-border bg-surface p-4 shadow-xs motion-reduce:animate-none sm:p-5';

/** Campo de texto grande para las hojas: 17 px en todos los tamaños, 48 px de alto. */
export const CAMPO =
  'min-h-12 w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-[17px] text-ink placeholder:text-muted transition-shadow focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15';

/** Etiqueta + campo de una hoja, con letra grande. La etiqueta envuelve al campo. */
export function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[15px] font-semibold text-ink">{label}</span>
      {children}
      {ayuda && <span className="mt-1.5 block text-[14px] leading-relaxed text-muted">{ayuda}</span>}
    </label>
  );
}

/**
 * El interruptor grande con su texto: "Se ofrece en tu página" / "Oculto
 * de tu página". Es un botón submit dentro de un ActionForm (las actions
 * de prender y apagar ya vienen con .bind), así que solo cambia cómo se ve.
 */
export function InterruptorPagina({ active, label }: { active: boolean; label: string }) {
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={active}
      aria-label={(active ? 'Ocultar de tu página: ' : 'Mostrar en tu página: ') + label}
      className="group -ml-1 inline-flex min-h-12 items-center gap-3 rounded-full py-1 pl-1 pr-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full transition-colors duration-200 motion-reduce:transition-none ${
          active ? 'bg-primary' : 'bg-ink/20'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none ${
            active ? 'translate-x-[1.5rem]' : 'translate-x-1'
          }`}
        />
      </span>
      <span className={`text-[15px] font-medium ${active ? 'text-ink' : 'text-muted'}`}>
        {active ? 'Se ofrece en tu página' : 'Oculto de tu página'}
      </span>
    </button>
  );
}

/** Botón de borrar con su palabra (nada de íconos sin texto): ConfirmForm triggerVariant="danger". */
export const BOTON_BORRAR = 'min-h-12 !text-[15px]';
