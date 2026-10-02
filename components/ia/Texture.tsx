import { NOTI } from './tokens';

// El grano de las piezas.
//
// Los posts están hechos con papel recortado y fotografiado: tienen una
// textura fina que es lo que impide que un campo de color plano se vea
// como un div. Un PNG de ruido costaría una petición y pesaría; esto es
// un filtro SVG que el navegador genera solo.
//
// baseFrequency alta (0.9) para que el grano sea fino y no se lea como
// manchas, y opacidad baja: a simple vista no se nota, se nota al
// quitarlo.
//
// `id` es obligatorio en la práctica cuando hay más de un campo de color
// en la misma página: dos <filter> con el mismo id es HTML inválido y el
// navegador resuelve TODAS las referencias al primero.
export function Grain({ opacity = 0.16, id = 'noti-grain' }: { opacity?: number; id?: string }) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full mix-blend-overlay"
      style={{ opacity }}
    >
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

/**
 * La firma de NOTI: el logotipo con el subrayado de lima que llevan
 * todas las piezas. `tone` existe porque vive sobre los dos fondos de la
 * publicación — el campo violeta y el papel.
 */
export function NotiWordmark({
  className = '',
  tone = 'ink',
}: {
  className?: string;
  tone?: 'ink' | 'paper';
}) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span
        className="relative z-10 font-[family-name:var(--font-ia)] font-bold tracking-[-0.045em]"
        style={{ color: tone === 'ink' ? NOTI.ink : NOTI.paper }}
      >
        NOTI
      </span>
      {/* Detrás de la última parte de la palabra, no debajo: en las
          piezas el lima es un trazo de marcador que pisa el texto, no un
          subrayado de procesador de textos. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-[0.1em] z-0 h-[0.32em]"
        style={{ backgroundColor: NOTI.lime }}
      />
    </span>
  );
}
