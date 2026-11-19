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

/** Cómo está cada herramienta: prendida, apagada o por activar (null). */
export type EstadoHerramienta = { texto: string; prendido: boolean | null };

const HERRAMIENTAS: { id: Vista; texto: string; que: string; icono: typeof Bot }[] = [
  { id: 'recepcionista', texto: 'Recepcionista', que: 'Contesta y agenda por ti, a cualquier hora.', icono: Bot },
  { id: 'cotiza', texto: 'Cotiza', que: 'Manda cotizaciones en PDF y hace la factura.', icono: FileText },
];

/** Las dos herramientas como tarjetas grandes con su estado; tocar una abre su vista. */
export function Pestanas({ actual, estados }: { actual: Vista; estados?: Record<Vista, EstadoHerramienta> }) {
  return (
    <nav aria-label="Herramientas de WhatsApp" className="mt-6 grid grid-cols-2 gap-3 lg:max-w-3xl">
      {HERRAMIENTAS.map((p) => {
        const activa = p.id === actual;
        const e = estados?.[p.id];
        return (
          <Link
            key={p.id}
            href={`?vista=${p.id}`}
            scroll={false}
            aria-current={activa ? 'page' : undefined}
            className={`flex min-h-[2.75rem] flex-col gap-3 rounded-3xl bg-surface p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:p-5 ${
              activa ? 'shadow-md ring-[3px] ring-primary' : 'ring-1 ring-border hover:shadow-md'
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D9FDD3] text-[#1F5E2E]" aria-hidden="true">
              <p.icono className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-[18px] font-semibold leading-tight text-ink">{p.texto}</span>
              <span className="mt-1 block text-[14px] leading-snug text-muted max-sm:hidden">{p.que}</span>
            </span>
            {e && (
              <span
                className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[14px] font-semibold ${
                  e.prendido === true ? 'bg-success-soft text-success' : e.prendido === false ? 'bg-ink/[0.07] text-ink' : 'bg-warning-soft text-warning'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${e.prendido === true ? 'bg-success' : e.prendido === false ? 'bg-ink/40' : 'bg-warning'}`} aria-hidden="true" />
                {e.texto}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** El detalle de cómo funciona cada una, en una ayuda desplegable. */
export function Intro({ vista }: { vista: Vista }) {
  return vista === 'recepcionista' ? (
    <div className="mt-4">
      <HelpTip title="¿Cómo funciona la recepcionista?" label="¿Cómo funciona la recepcionista?">
        Cuando alguien escribe a tu WhatsApp, la recepcionista le contesta con tus servicios, precios y horarios libres de
        verdad, y agenda la cita. Tú ves aquí cada plática. Si quieres contestar tú, tocas «Contestar yo» y ella se calla
        en esa plática hasta que se la regreses.
      </HelpTip>
    </div>
  ) : (
    <div className="mt-4">
      <HelpTip title="¿Cómo funciona Cotiza?" label="¿Cómo funciona Cotiza?">
        Tus clientes te piden precio por WhatsApp y reciben su cotización en PDF con tu catálogo. Es un extra aparte del
        plan: le da seguimiento a las 48 horas si no contestan y, cuando aceptan, les pide sus datos para la factura.
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

/**
 * "En esta página": saltos a cada bloque de la vista larga (Recepcionista
 * tiene pláticas y, debajo, Anticipos). Anclas nativas: sin JS y el botón
 * Atrás regresa arriba.
 */
export function Anclas({ items }: { items: { id: string; texto: string; detalle?: string }[] }) {
  return (
    <nav aria-label="En esta página" className="mt-5 flex flex-wrap gap-2">
      {items.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-[15px] font-semibold text-ink ring-1 ring-border transition hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {i.texto}
          {i.detalle && <span className="font-normal text-muted">· {i.detalle}</span>}
        </a>
      ))}
    </nav>
  );
}

/** Para qué sirve un bloque, en una línea, bajo su título. */
export function ParaQue({ children }: { children: React.ReactNode }) {
  return <p className="-mt-2 mb-4 text-[15px] leading-relaxed text-muted">{children}</p>;
}
