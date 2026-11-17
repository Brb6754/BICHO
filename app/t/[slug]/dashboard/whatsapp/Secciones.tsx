import Link from 'next/link';
import { Bot, Check, Circle, FileText, Hourglass } from 'lucide-react';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { urlDemo } from '@/lib/seo/sitio';

// Piezas de la página de WhatsApp que comparten el panel real y la demo.
//
// La página tenía dos productos encimados (la recepcionista y Cotiza) en
// un solo scroll larguísimo. Ahora son dos pestañas: cada una dice qué
// hace en una frase ANTES de pedir nada, y si falta conectar el número
// lo dice como lo que es, "te lo activamos nosotros", nunca como un
// formulario técnico.

export type Vista = 'recepcionista' | 'cotiza';

export const vistaDe = (raw: unknown): Vista => (raw === 'cotiza' ? 'cotiza' : 'recepcionista');

export function Pestanas({ actual }: { actual: Vista }) {
  const pestanas: { id: Vista; texto: string; icono: typeof Bot }[] = [
    { id: 'recepcionista', texto: 'Recepcionista', icono: Bot },
    { id: 'cotiza', texto: 'Cotiza', icono: FileText },
  ];
  return (
    <nav aria-label="Secciones de WhatsApp" className="mt-6 flex gap-1 rounded-full bg-ink/[0.06] p-1 sm:inline-flex">
      {pestanas.map((p) => {
        const activa = p.id === actual;
        return (
          <Link
            key={p.id}
            href={`?vista=${p.id}`}
            scroll={false}
            aria-current={activa ? 'page' : undefined}
            className={`flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:flex-none ${
              activa ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            <p.icono className="h-4 w-4" aria-hidden="true" />
            {p.texto}
          </Link>
        );
      })}
    </nav>
  );
}

/** Una frase de qué hace + el detalle en un "¿cómo funciona?". */
export function Intro({ vista }: { vista: Vista }) {
  return vista === 'recepcionista' ? (
    <div className="mt-6 flex max-w-2xl items-start gap-1">
      <p className="text-[17px] leading-relaxed text-ink">
        Contesta a tus clientas al instante, a cualquier hora, y les aparta la cita directo en tu agenda. Si una plática se
        complica, la tomas tú.
      </p>
      <HelpTip title="¿Cómo funciona la recepcionista?">
        Cuando alguien escribe a tu WhatsApp, la recepcionista le contesta con tus servicios, precios y horarios libres de
        verdad, y agenda la cita. Tú ves aquí cada plática. Si quieres contestar tú, tocas «Contestar yo» y ella se calla
        en esa plática hasta que se la regreses.
      </HelpTip>
    </div>
  ) : (
    <div className="mt-6 flex max-w-2xl items-start gap-1">
      <p className="text-[17px] leading-relaxed text-ink">
        Tus clientes te piden precio por WhatsApp y reciben su cotización en PDF con tu catálogo. La aceptan y, si la
        necesitan, piden su factura ahí mismo.
      </p>
      <HelpTip title="¿Cómo funciona Cotiza?">
        Es un extra aparte del plan, para negocios que cotizan antes de vender. Arma la cotización con los precios de tu
        catálogo, le da seguimiento a las 48 horas si no contestan y, cuando aceptan, les pide sus datos para la factura.
        Pregúntanos el precio.
      </HelpTip>
    </div>
  );
}

/** El número todavía no está conectado: "te lo activamos nosotros". */
export function Proximamente({ vista }: { vista: Vista }) {
  const pasos =
    vista === 'recepcionista'
      ? [
          'Nos escribes que la quieres.',
          'Conectamos tu WhatsApp con bicho. Es un trámite con Meta (la empresa de WhatsApp) que hacemos nosotros.',
          'Te avisamos y la prendes aquí con un botón.',
        ]
      : [
          'Nos escribes que quieres Cotiza y te decimos el precio.',
          'Conectamos tu propio número de WhatsApp con bicho. El trámite con Meta lo hacemos nosotros.',
          'Te avisamos y lo prendes aquí con un botón.',
        ];
  return (
    <section className="mt-8 max-w-2xl rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Hourglass className="h-4 w-4 shrink-0" aria-hidden="true" />
        Próximamente en tu cuenta: te lo activamos nosotros
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">No tienes que configurar nada técnico. Así va:</p>
      <ol className="mt-5 flex flex-col gap-4">
        {pasos.map((p, i) => (
          <li key={p} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-sm font-semibold tabular-nums">
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>
      <a
        href={urlDemo('casa-luma', `/panel/whatsapp?vista=${vista}`)}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex min-h-[2.75rem] items-center rounded-full px-1 text-sm font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        Ver un ejemplo de cómo se ve
      </a>
    </section>
  );
}

/** Lo que Cotiza necesita, con palomita o círculo vacío (íconos, no caracteres). */
export function Requisitos({ items }: { items: { ok: boolean; texto: string }[] }) {
  return (
    <ul className="mt-5 flex flex-col gap-2.5">
      {items.map((r) => (
        <li key={r.texto} className={`flex items-start gap-2.5 text-[15px] leading-relaxed ${r.ok ? 'text-ink' : 'text-muted'}`}>
          {r.ok ? (
            <Check className="mt-1 h-4 w-4 shrink-0 text-success" strokeWidth={2.5} aria-label="Listo" />
          ) : (
            <Circle className="mt-1 h-4 w-4 shrink-0" aria-label="Falta" />
          )}
          {r.texto}
        </li>
      ))}
    </ul>
  );
}
