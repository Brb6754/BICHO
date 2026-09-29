import Link from 'next/link';
import { ArrowUpRight, FolderOpen, PlayCircle } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { Bloom } from './Flourishes';
import { SpotlightCard } from './SpotlightCard';
import { PROJECTS, type Project } from './projects';

// Real screenshots of real shipped pages, each linking to the live
// thing. The screenshots are Bruno's own captures, in public/portfolio/.
//
// Two effects here, both tied to the pointer rather than running on
// their own: the card lights up from the cursor (SpotlightCard), and a
// band of light sweeps once across the screenshot (`.shine-host`). The
// sweep is the one flourish on the page that exists purely to make
// something look good — it earns it by landing on the actual product
// shots, which is what this section is here to show off.
//
// The card is a CONTAINER, not a link — even for a project with a
// single action. It carries up to two of them ("ver el sitio" and, for
// bicho reservas, "abrir la plataforma"), and a card with two actions
// can't be one link. Making only the two-action card different would
// also mean two hover behaviours in the same row. This is the same
// nested-anchor problem that already caused a real hydration error in
// the hero, so it's settled the same way: exactly one <a> per target,
// never one wrapping another. The corner arrow is deliberately NOT a
// link for that reason — it's an affordance, marked aria-hidden, and
// the real targets are the buttons in the footer.
function ProjectCard({ project }: { project: Project }) {
  const hasLink = !project.href.startsWith('#');

  return (
    <SpotlightCard className="group block h-full overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0B1030]">
      <div className="shine-host relative aspect-[16/10] border-b border-white/[0.07] bg-[#080D28]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static
            screenshot in public/, no remote host for next/image to be
            configured against and no layout win at this size. */}
        <img
          src={project.image}
          alt={`Captura del sitio de ${project.name}`}
          className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0B1030] to-transparent" />

        {/* The arrow. It sits over the shot's corner where a browser's
            own "open in new tab" would, tilts a little further out on
            hover, and says "this goes somewhere" before anyone reads a
            single word of the card. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[#080D28]/70 text-white backdrop-blur-sm transition-all duration-300 group-hover:border-[#A99BFF]/60 group-hover:bg-[#3B00FF] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
        </span>
      </div>

      <div className="p-6 sm:p-7">
        <span className="text-[11px] font-medium uppercase tracking-wide text-[#A99BFF]">
          {project.tag}
        </span>
        <h3 className="mt-1.5 font-[family-name:var(--font-central)] text-lg font-semibold text-white">
          {project.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#8C9BC9]">{project.blurb}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[11px] text-[#9FB0D9]"
            >
              {tech}
            </span>
          ))}
        </div>

        {(hasLink || project.demoHref) && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {project.demoHref && (
              <Link
                href={project.demoHref}
                className="inline-flex items-center gap-2 rounded-full bg-[#3B00FF] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_26px_-10px_rgba(59,0,255,0.9)] transition-colors hover:bg-[#5B2BFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A99BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Ver el sitio
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                <Link
                  href={project.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Ver el sitio
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ))}
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}

// One pass of the project list. Rendered twice inside the track, which
// is what makes the crawl seamless — same mechanism as the services
// ticker in the hero (globals.css, `ticker-crawl`): the keyframe moves
// exactly -50%, so copy #2 lands where copy #1 started.
//
// The second pass is `aria-hidden` AND `inert`: a screen reader hears
// three projects rather than six, and — the part that actually matters
// here, since these cards contain real buttons — Tab never lands on a
// duplicate of a link the visitor already passed.
function Pass({ clone = false }: { clone?: boolean }) {
  return (
    <ul
      className="flex shrink-0 items-stretch gap-5 pr-5"
      aria-hidden={clone || undefined}
      inert={clone || undefined}
    >
      {PROJECTS.map((project) => (
        <li key={project.slug} className="w-[min(82vw,30rem)] shrink-0">
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  );
}

export function PortfolioSection() {
  return (
    <section id="portafolio" className="relative overflow-hidden py-24 sm:py-28">
      <Bloom
        className="left-1/2 top-1/4 h-[32rem] w-[50rem] -translate-x-1/2"
        intensity={0.22}
        drift
        duration="54s"
      />

      <div className="relative px-6">
        <div className="mx-auto max-w-5xl">
          <SectionHeading
            line1="Trabajo real,"
            line2="que puedes | visitar"
            icon={<FolderOpen className="h-[0.5em] w-[0.5em]" strokeWidth={2.5} />}
            sub="Sitios y productos en producción, no maquetas. Entra y pruébalos."
          />
        </div>
      </div>

      {/* Full-bleed on purpose: a crawl that stops at a 1024px container
          reads as a widget on the page. Running edge to edge is what
          makes it read as a band moving THROUGH the page, same as the
          hero's ticker.
          `ticker-shell` brings the hover pause from globals.css; the
          focus-within pause is added there too, because these cards —
          unlike the hero's ticker — contain buttons someone has to be
          able to reach with the keyboard without chasing them. */}
      <div
        className="ticker-shell relative mt-14 overflow-hidden"
        style={{
          // Much slower than the hero's 16s: those are four short words,
          // these are 480px cards carrying a screenshot and a paragraph.
          // At this rate a card takes ~20s to cross, which is long
          // enough to read one without waiting for the pause.
          ['--ticker-duration' as string]: '60s',
          maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        }}
      >
        <div className="ticker-track flex w-max">
          <Pass />
          <Pass clone />
        </div>
      </div>

      {/* Hidden on a phone: there is no cursor there, so the sentence
          would be an instruction nobody can follow. */}
      <p className="relative mt-8 hidden px-6 text-center text-sm text-[#8C9BC9] sm:block">
        Pasa el cursor sobre una tarjeta para detener el desfile.
      </p>
    </section>
  );
}
