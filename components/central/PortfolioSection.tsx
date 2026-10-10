import Link from 'next/link';
import { ArrowUpRight, PlayCircle } from 'lucide-react';
import { SectionOpener } from '@/components/marketing/Primitives';
import { Reveal } from '@/components/marketing/Reveal';
import { PROJECTS, type Project } from './projects';

// El portafolio: capturas reales de páginas reales, cada una con su
// enlace a lo que está en vivo. Las capturas son de Bruno, en
// public/portfolio/.
//
// DOS CAMBIOS, 2026-10-09 (Bruno).
//
// 1. SE FUE EL DESFILE AUTOMÁTICO. Funcionaba sobre el fondo casi negro
//    original, pero sobre blanco se leía como un widget pegado a la
//    página y, peor, recortaba las capturas — que son exactamente la
//    prueba que esta sección viene a enseñar. Ahora son filas que
//    alternan lado: la captura tiene espacio de verdad.
//    De paso se fue la pasada duplicada con `inert`, que existía solo
//    para que el ciclo no saltara; sin desfile no hace falta, y con
//    ella se va un enredo de accesibilidad.
//
// 2. ESTA SECCIÓN ES OSCURA. La página venía blanco/mist/blanco/mist, y
//    mist está tan cerca del blanco que al bajar se leía como una sola
//    extensión sin ritmo. Un bloque oscuro al centro parte la página en
//    dos mitades — y las capturas, que son casi todas de interfaces
//    oscuras o saturadas, resaltan aquí mucho más que sobre blanco.
//
// La tarjeta sigue siendo un CONTENEDOR, no un enlace: lleva hasta dos
// acciones, y una tarjeta con dos acciones no puede ser un solo enlace.
// Es el mismo problema de anclas anidadas que ya causó un error real de
// hidratación en el hero, y se resuelve igual: exactamente un <a> por
// destino, nunca uno dentro de otro. La flecha de la esquina NO es un
// enlace por esa razón — es affordance, va `aria-hidden`, y los
// destinos reales son los botones.
function ProjectRow({ project, index }: { project: Project; index: number }) {
  const hasLink = !project.href.startsWith('#');
  // Alterna el lado de la captura. En teléfono siempre va arriba, que
  // es lo que una columna puede sostener.
  const imagenDerecha = index % 2 === 1;

  return (
    <article className="group grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div
        className={`shine-host relative aspect-[16/10] overflow-hidden rounded-3xl bg-[#241746] ring-1 ring-white/10 ${
          imagenDerecha ? 'lg:order-2' : ''
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- captura
            estática en public/, sin host remoto que configurarle a
            next/image y sin ganancia de layout a este tamaño. */}
        <img
          src={project.image}
          alt={`Captura del sitio de ${project.name}`}
          className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          loading="lazy"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#140F2E] shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-[#D4F23A]"
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
        </span>
      </div>

      <div className={imagenDerecha ? 'lg:order-1' : ''}>
        <span className="text-[13px] font-semibold text-[#D4F23A]">{project.tag}</span>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold uppercase leading-[1] tracking-[-0.02em] text-white">
          {project.name}
        </h3>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#B9B1E6]">{project.blurb}</p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="rounded-md bg-white/[0.07] px-2 py-1 text-[11px] text-[#B9B1E6]"
            >
              {tech}
            </span>
          ))}
        </div>

        {(hasLink || project.demoHref) && (
          <div className="mt-7 flex flex-wrap items-center gap-2">
            {project.demoHref && (
              <Link
                href={project.demoHref}
                className="inline-flex items-center gap-2 rounded-full bg-[#D4F23A] px-5 py-2.5 text-[13px] font-semibold text-[#140F2E] transition-colors hover:bg-[#B5D42B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Ver la plataforma
              </Link>
            )}
            {hasLink &&
              (project.external ? (
                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Ver el sitio
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                <Link
                  href={project.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Ver el sitio
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function PortfolioSection() {
  return (
    <section id="portafolio" className="bg-[#1B1040] px-5 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <SectionOpener
          eyebrow="Portafolio"
          title={
            <>
              Trabajo real,
              <br />
              que puedes visitar
            </>
          }
          intro="Sitios y productos en producción, no maquetas."
          onDark
        />

        <div className="mt-14 flex flex-col gap-16 sm:gap-20">
          {PROJECTS.map((project, i) => (
            <Reveal key={project.slug} delay={i * 60}>
              <ProjectRow project={project} index={i} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
