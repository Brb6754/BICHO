import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

// Las dos piezas de la VIBRA de la campaña "Desenreda" que usa toda la
// landing del estudio. No las piezas del anuncio —su nudo, su calendario,
// sus papeles con frases—: una primera versión las copió y Bruno la
// corrigió ("sigue la vibra, no la repliques"). Lo que se queda es la
// actitud: trazos lima como energía, y botones que se sienten objetos.

/**
 * Las rayitas de "sonido": tres trazos cortos que salen de un punto. Es
 * la marca de énfasis de la campaña, en lugar de un brillo o un degradado.
 */
export function Destello({ className = '', voltear = false }: { className?: string; voltear?: boolean }) {
  return (
    <svg
      viewBox="0 0 60 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      {/* El volteo va DENTRO del SVG y no como `transform` en el elemento:
          la clase `anim-destellar` anima `transform`, y una animación
          pisa el estilo en línea — los trazos volteados se desvoltearían
          a medio latido. */}
      <g transform={voltear ? 'translate(60 0) scale(-1 1)' : undefined}>
        <path d="M8 40 L24 34" />
        <path d="M12 20 L27 26" />
        <path d="M28 6 L33 21" />
      </g>
    </svg>
  );
}

/**
 * El botón principal de toda la página: pastilla lima con su sombra dura
 * en berenjena, como una pieza de papel puesta sobre otra. Esa sombra sin
 * difuminar es del mundo de la campaña, no una sombra de interfaz, y por
 * eso es la misma en cada sección. Se hunde al presionarlo.
 *
 * Una sola versión a propósito: si cada sección armara su propio botón,
 * el primero que alguien ajuste deja a los demás desparejos.
 */
export function BotonPieza({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-[3.4rem] items-center gap-3 rounded-full bg-[#D4F23A] px-8 font-[family-name:var(--font-display)] text-[17px] font-extrabold uppercase tracking-[0.02em] text-[#14092E] shadow-[0_5px_0_#1B1040] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_7px_0_#1B1040] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#14092E]/40 active:translate-y-[3px] active:shadow-[0_2px_0_#1B1040]"
    >
      {children}
      <ArrowRight
        className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
        strokeWidth={2.6}
        aria-hidden="true"
      />
    </Link>
  );
}

/** El botón secundario: misma pastilla, sin relleno. `sobre` es el suelo. */
export function BotonContorno({
  href,
  sobre,
  children,
}: {
  href: string;
  sobre: 'oscuro' | 'claro';
  children: ReactNode;
}) {
  const tono =
    sobre === 'oscuro'
      ? 'text-white ring-white/50 hover:bg-white/10 focus-visible:ring-white/70'
      : 'text-[#14092E] ring-[#14092E]/40 hover:bg-[#14092E]/[0.06] focus-visible:ring-[#14092E]/40';
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[3.4rem] items-center rounded-full px-6 text-[16px] font-semibold ring-2 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-4 ${tono}`}
    >
      {children}
    </Link>
  );
}
