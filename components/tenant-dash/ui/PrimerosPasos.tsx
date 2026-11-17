'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { LLAVE_COMPARTIDO, ShareLink } from './ShareLink';

// "TU AGENDA EN 5 MINUTOS" — los primeros pasos del inicio.
//
// Es lo que más evita el "esto es muy complicado": en vez de un panel con
// veinte secciones, la dueña ve UNA cosa que hacer, con un botón que la
// lleva justo a donde se hace. Lee el estado real del negocio (lo cuenta
// la página del inicio), se queda hasta completarse y se puede ocultar.
//
// El orden no es el de la venta sino el de las dependencias: el horario
// se pone por persona, así que "quién atiende" va antes que "horario".
//
// Lo único que la base no sabe es si compartió su link; eso lo recuerda
// el teléfono (ShareLink deja la seña) y se da por hecho en cuanto llega
// la primera cita.

export type EstadoPasos = {
  servicios: boolean;
  quienAtiende: boolean;
  horario: boolean;
  primeraCita: boolean;
};

const LLAVE_OCULTO = (slug: string) => `bicho:primeros-pasos-oculto:${slug}`;

function leer(llave: string) {
  try {
    return localStorage.getItem(llave) === '1';
  } catch {
    return false;
  }
}

export function PrimerosPasos({
  slug,
  url,
  negocio,
  estado,
  base = '/dashboard',
}: {
  slug: string;
  url: string;
  negocio: string;
  estado: EstadoPasos;
  base?: string;
}) {
  const [compartido, setCompartido] = useState(false);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    const sync = () => setCompartido(leer(LLAVE_COMPARTIDO(slug)));
    sync();
    setOculto(leer(LLAVE_OCULTO(slug)));
    window.addEventListener('bicho:link-compartido', sync);
    return () => window.removeEventListener('bicho:link-compartido', sync);
  }, [slug]);

  const pasos = [
    {
      titulo: 'Agrega tus servicios',
      detalle: 'Lo que tus clientas van a elegir, con su precio y cuánto dura.',
      boton: 'Agregar servicios',
      href: `${base}/services`,
      hecho: estado.servicios,
    },
    {
      titulo: 'Di quién atiende',
      detalle: 'Tú, tu equipo, o una silla o cabina. Cada uno lleva su propia agenda.',
      boton: 'Agregar quién atiende',
      href: `${base}/resources`,
      hecho: estado.quienAtiende,
    },
    {
      titulo: 'Pon tu horario',
      detalle: 'Los días y horas en que se puede reservar. Fuera de ellos no se ofrece nada.',
      boton: 'Poner mi horario',
      href: `${base}/schedule`,
      hecho: estado.horario,
    },
    {
      titulo: 'Comparte tu link',
      detalle: 'Mándalo por WhatsApp o ponlo en tu Instagram. Así te encuentran para reservar.',
      hecho: compartido || estado.primeraCita,
    },
    {
      titulo: 'Recibe tu primera cita',
      detalle: 'Pídele a una clienta de confianza que reserve con tu link, o agéndala tú desde la agenda.',
      boton: 'Ir a mi agenda',
      href: `${base}/calendar`,
      hecho: estado.primeraCita,
    },
  ];

  const hechos = pasos.filter((p) => p.hecho).length;
  if (hechos === pasos.length) return null;

  const actual = pasos.findIndex((p) => !p.hecho);
  // Sin servicios, quién atiende y horario la página no puede dar una sola hora.
  const noRecibe = !(estado.servicios && estado.quienAtiende && estado.horario);

  if (oculto) {
    if (!noRecibe) return null;
    return (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-2">
        <p className="py-2 text-sm font-medium text-ink">Tu página todavía no puede recibir citas.</p>
        <button
          type="button"
          onClick={() => {
            setOculto(false);
            try {
              localStorage.removeItem(LLAVE_OCULTO(slug));
            } catch {}
          }}
          className="min-h-[2.75rem] rounded-full px-3 text-sm font-semibold text-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Ver qué falta
        </button>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="primeros-pasos-titulo"
      className="primeros-pasos mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="primeros-pasos-titulo" className="text-lg font-semibold tracking-tight text-ink">
            Tu agenda en 5 minutos
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {noRecibe
              ? 'Con estos pasos tu página empieza a recibir citas sola.'
              : 'Tu página ya recibe citas. Falta que tus clientas la conozcan.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOculto(true);
            try {
              localStorage.setItem(LLAVE_OCULTO(slug), '1');
            } catch {}
          }}
          className="-mr-2 -mt-1 min-h-[2.75rem] shrink-0 rounded-full px-3 text-sm font-medium text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Ocultar
        </button>
      </div>

      {/* El avance, en número y en barra: "voy en el 2 de 5". */}
      <div className="mt-4 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.08]"
          role="progressbar"
          aria-label="Avance de los primeros pasos"
          aria-valuemin={0}
          aria-valuemax={pasos.length}
          aria-valuenow={hechos}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${(hechos / pasos.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums text-ink">
          {hechos} de {pasos.length}
        </span>
      </div>

      <ol className="mt-4 flex flex-col">
        {pasos.map((p, i) => {
          const esActual = i === actual;
          return (
            <li key={p.titulo} className={i > 0 ? 'border-t border-border' : ''}>
              <div className={`flex gap-3 ${esActual ? 'py-4' : 'py-3'}`}>
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    p.hecho
                      ? 'bg-success text-white'
                      : esActual
                        ? 'bg-primary text-[rgb(var(--color-cta-fg))]'
                        : 'border-2 border-ink/20 text-muted'
                  }`}
                  aria-hidden="true"
                >
                  {p.hecho ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[15px] ${
                      p.hecho ? 'text-muted line-through' : esActual ? 'font-semibold text-ink' : 'font-medium text-ink'
                    }`}
                  >
                    {p.titulo}
                    <span className="sr-only">{p.hecho ? ' (hecho)' : esActual ? ' (siguiente paso)' : ''}</span>
                  </p>
                  {esActual && (
                    <>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{p.detalle}</p>
                      <div className="mt-3">
                        {p.href ? (
                          <Link
                            href={p.href}
                            className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] shadow-sm transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                          >
                            {p.boton}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        ) : (
                          <ShareLink url={url} slug={slug} negocio={negocio} />
                        )}
                      </div>
                    </>
                  )}
                </div>
                {!esActual && !p.hecho && p.href && (
                  <Link
                    href={p.href}
                    aria-label={p.titulo}
                    className="-my-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
