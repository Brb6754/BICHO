import Link from 'next/link';
import { CentralLogo } from '@/components/central/CentralLogo';
import { NOTI, RULE } from './tokens';

// La cabecera y el pie de los posts, traídos al sitio.
//
// En cada pieza de la campaña hay una regla fina arriba con la sección a
// la izquierda y la fecha a la derecha, y abajo el lockup NOTI · by
// bicho con la bajada "Ideas que bajan a la operación". Repetirlos aquí
// es lo que hace que la página se lea como el mismo medio y no como una
// web que habla del medio.

export function Masthead({
  section,
  meta,
  tone = 'ink',
}: {
  section: string;
  meta: string;
  /** `paper` para cuando va sobre el campo violeta de la portada. */
  tone?: 'ink' | 'paper';
}) {
  const onColor = tone === 'paper';
  return (
    <div
      className="flex items-baseline justify-between gap-4 border-b pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-xs"
      style={{
        borderColor: onColor ? 'rgba(251, 249, 245, 0.28)' : RULE,
        color: onColor ? NOTI.paper : NOTI.ink,
      }}
    >
      <Link href="/ia" className="transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:underline">
        NOTI <span className="opacity-40">/</span> {section}
      </Link>
      <span className="shrink-0 opacity-55">{meta}</span>
    </div>
  );
}

/**
 * El pie: el lockup y la bajada. `tone="ink"` invierte el logo de bicho,
 * cuyos píxeles son blancos — sobre papel, sin invertir, no se ve nada.
 */
export function NotiLockup({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${className}`}>
      <span
        className="font-[family-name:var(--font-ia)] text-2xl font-bold tracking-[-0.04em]"
        style={{ color: NOTI.ink }}
      >
        NOTI
      </span>
      <span className="h-6 w-px" style={{ backgroundColor: RULE }} aria-hidden="true" />
      <span className="flex items-center gap-2 text-[13px] font-medium" style={{ color: NOTI.ink }}>
        by
        <CentralLogo className="h-4" tone="ink" />
      </span>
      <span className="h-6 w-px" style={{ backgroundColor: RULE }} aria-hidden="true" />
      <span className="text-[13px] leading-snug opacity-60" style={{ color: NOTI.ink }}>
        Ideas que bajan a la operación.
      </span>
    </div>
  );
}

/**
 * El resaltador de los posts: una etiqueta corta sobre una banda de
 * color. El lima SOLO lleva tinta encima — como texto sobre papel crema
 * da 1.3:1 y desaparece.
 */
export function Highlight({
  children,
  tone = 'lime',
}: {
  children: React.ReactNode;
  tone?: 'lime' | 'lavender';
}) {
  return (
    <span
      className="inline-block px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
      style={{ backgroundColor: tone === 'lime' ? NOTI.lime : NOTI.lavender, color: NOTI.ink }}
    >
      {children}
    </span>
  );
}
