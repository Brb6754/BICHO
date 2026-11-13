'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ESTILOS, COOKIE_ESTILO_DEMO, estiloDe, type Estilo } from '@/lib/branding/dashEstilo';

// Demo pública (/panel): los cuatro estilos del panel se alternan en
// vivo con ?estilo=, sin escribir nada en la base. Una cookie del
// navegador recuerda el último para que, al abrir Caja o Agenda desde el
// menú (enlaces sin ?estilo), el armazón no regrese a clásico.

function useEstilo(inicial: Estilo): Estilo {
  const q = useSearchParams().get('estilo');
  return q ? estiloDe(q) : inicial;
}

/** La raíz .tenant-dash de la demo: lleva data-estilo según la URL o la cookie. */
export function DemoRoot({ inicial, className, style, children }: { inicial: Estilo; className: string; style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div className={className} style={style} data-estilo={useEstilo(inicial)}>
      {children}
    </div>
  );
}

/** El conmutador flotante. */
export function EstiloSwitcher({ inicial }: { inicial: Estilo }) {
  const actual = useEstilo(inicial);
  const pathname = usePathname();
  return (
    <nav
      aria-label="Estilo del panel"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-max gap-1 overflow-x-auto rounded-full border border-white/10 [scrollbar-width:none] bg-[#111]/90 p-1 text-white shadow-[0_12px_32px_-8px_rgb(0_0_0/0.5)] backdrop-blur-md lg:bottom-5 lg:left-auto lg:right-5"
    >
      {ESTILOS.map((e) => (
        <Link
          key={e.id}
          href={`${pathname}?estilo=${e.id}`}
          scroll={false}
          onClick={() => {
            document.cookie = `${COOKIE_ESTILO_DEMO}=${e.id}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
          }}
          aria-current={actual === e.id ? 'true' : undefined}
          className={`flex min-h-[2.75rem] shrink-0 items-center rounded-full px-4 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            actual === e.id ? 'bg-white text-[#111]' : 'text-white/75 hover:bg-white/10 hover:text-white'
          }`}
        >
          {e.nombre}
        </Link>
      ))}
    </nav>
  );
}
