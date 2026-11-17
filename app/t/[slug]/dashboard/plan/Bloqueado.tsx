import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import { PLANES, moduloIncluido, planDe, planMinimoPara, type Modulo } from '@/lib/billing/planes';
import { urlDemo } from '@/lib/seo/sitio';

// LO QUE TU PLAN TODAVÍA NO INCLUYE.
//
// Antes, entrar a un módulo apagado te regresaba al inicio sin decir nada
// (o enseñaba una tarjeta con un link chiquito). Aquí se vende: qué
// ganarías en tres renglones, cuánto cuesta, el botón a "Mi plan" y, si
// hay, un ejemplo de la demo para verlo funcionando antes de pagar.
export function Bloqueado({
  modulo,
  plan,
  ganas,
  aviso,
  ejemplo,
}: {
  modulo: Modulo;
  /** `tenants.plan` tal cual viene de la base. */
  plan: unknown;
  /** Qué ganaría, en palabras de ella. Tres renglones cortos. */
  ganas: string[];
  /** Reemplaza el "Viene en el plan X" (extras que se pagan aparte). */
  aviso?: string;
  /** Ruta de la demo, ej. '/panel/lealtad'. */
  ejemplo?: string;
}) {
  const minimo = PLANES[planMinimoPara(modulo)];
  const texto =
    aviso ??
    (moduloIncluido(planDe(plan), modulo)
      ? 'Todavía no está activo en tu cuenta. Escríbenos y te lo prendemos.'
      : `Viene en el plan ${minimo.nombre}, de $${minimo.precio} al mes.`);

  return (
    <section className="mt-8 max-w-2xl rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        {texto}
      </p>
      <p className="mt-5 text-[15px] font-medium text-ink">Con esto vas a poder:</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {ganas.map((g) => (
          <li key={g} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink">
            <Check className="mt-1 h-4 w-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
            {g}
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/plan"
          className="ui-btn inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 max-sm:w-full"
        >
          Ver planes
        </Link>
        {ejemplo && (
          <a
            href={urlDemo('casa-luma', ejemplo)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full px-4 text-sm font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-sm:w-full"
          >
            Ver un ejemplo
          </a>
        )}
      </div>
    </section>
  );
}
