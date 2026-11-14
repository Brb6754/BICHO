import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { DotField } from '@/components/marketing/DotField';
import { Eyebrow, PillLink, focusRingOnLight } from '@/components/marketing/Primitives';
import { opcionesDirectorio, type NegocioDirectorio } from '@/lib/directorio/directorio';
import { DirectorioLista } from './DirectorioLista';

// La página del directorio, compartida por /negocios, /negocios/[ciudad] y
// /negocios/[ciudad]/[giro]. Hereda el lenguaje de la landing: suelo
// blanco, morado estructural, lima solo como chispa.
export function DirectorioPagina({
  todos,
  negocios,
  titulo,
  bajada,
  ciudad,
  giro,
}: {
  /** Todo el directorio: alimenta el buscador y los enlaces por ciudad. */
  todos: NegocioDirectorio[];
  /** Lo que se muestra con el filtro aplicado. */
  negocios: NegocioDirectorio[];
  titulo: string;
  bajada: string;
  ciudad?: string;
  giro?: string;
}) {
  const { ciudades, giros } = opcionesDirectorio(todos);
  const selectCls = `h-12 w-full appearance-none rounded-full border-0 bg-transparent pl-5 pr-10 text-[15px] font-medium text-[#140F2E] ${focusRingOnLight}`;

  return (
    <div className="min-h-screen bg-white text-[#140F2E]">
      <div className="relative overflow-hidden bg-[#1B1040]">
        <DotField tone="onDark" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#5B34E8] opacity-40 blur-3xl" aria-hidden />
        <MarketingNav tone="onViolet" />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pb-28 sm:pt-12">
          <Eyebrow onDark>Directorio Bicho</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-balance font-[family-name:var(--font-display)] text-[clamp(2.2rem,7vw,4.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-white">
            {titulo}
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[#B9B1E6]">{bajada}</p>
        </div>
      </div>

      <main className="relative z-10 -mt-12 rounded-t-[2rem] bg-white sm:-mt-14 sm:rounded-t-[2.5rem]">
        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          {/* Buscador: GET plano, funciona sin JS. /negocios lo redirige a la ruta SEO. */}
          <form
            action="/negocios"
            method="get"
            role="search"
            aria-label="Buscar negocios"
            className="relative -top-7 mx-auto flex max-w-3xl flex-col gap-1 rounded-[28px] bg-white p-2 shadow-[0_24px_60px_-24px_rgba(20,15,46,0.45)] ring-1 ring-[#140F2E]/[0.08] sm:flex-row sm:items-center sm:rounded-full"
          >
            <label className="relative flex-1">
              <span className="sr-only">Giro</span>
              <select name="giro" defaultValue={giro ?? ''} className={selectCls}>
                <option value="">Todos los giros</option>
                {giros.map((g) => (
                  <option key={g.slug} value={g.slug}>{g.nombre}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A6488]" aria-hidden />
            </label>
            <span className="mx-1 hidden h-7 w-px bg-[#E6E2F4] sm:block" aria-hidden />
            <label className="relative flex-1">
              <span className="sr-only">Ciudad</span>
              <select name="ciudad" defaultValue={ciudad ?? ''} className={selectCls}>
                <option value="">Todas las ciudades</option>
                {ciudades.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.nombre}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A6488]" aria-hidden />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#5B34E8] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4423C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8] focus-visible:ring-offset-2"
            >
              <Search className="h-4 w-4" aria-hidden /> Buscar
            </button>
          </form>

          {negocios.length > 0 ? (
            <DirectorioLista negocios={negocios} />
          ) : (
            <div className="mx-auto mt-6 max-w-xl rounded-[28px] bg-[#F5F3FC] px-6 py-12 text-center">
              <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase text-[#140F2E]">
                {todos.length ? 'Aquí todavía no hay nadie' : 'El directorio está por abrir'}
              </p>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#6A6488]">
                {todos.length
                  ? 'No hay negocios con reserva en línea para esta búsqueda. Prueba otra ciudad u otro giro.'
                  : 'Pronto vas a encontrar aquí negocios de tu ciudad donde reservar en línea, sin llamar ni esperar respuesta por WhatsApp.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {todos.length > 0 && <PillLink href="/negocios" tone="violet">Ver todos</PillLink>}
                <PillLink href="/reservas" tone={todos.length ? 'outlineOnLight' : 'lime'}>Tengo un negocio</PillLink>
              </div>
            </div>
          )}

          {ciudades.length > 0 && (
            <nav aria-label="Negocios por ciudad" className="mt-16 border-t border-[#E6E2F4] pt-8">
              <p className="text-sm font-semibold text-[#140F2E]">Buscar por ciudad</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {ciudades.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/negocios/${c.slug}`}
                      aria-current={c.slug === ciudad && !giro ? 'page' : undefined}
                      className={`inline-flex items-center gap-2 rounded-full border border-[#140F2E]/12 px-4 py-2 text-sm text-[#140F2E] transition-colors hover:bg-[#5B34E8]/[0.06] aria-[current=page]:border-[#5B34E8] aria-[current=page]:bg-[#5B34E8]/[0.06] ${focusRingOnLight}`}
                    >
                      {c.nombre} <span className="text-xs text-[#6A6488]">{c.total}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <aside className="mt-12 flex flex-col items-start justify-between gap-5 rounded-[28px] bg-[#D4F23A] p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl font-extrabold uppercase leading-tight text-[#140F2E]">¿Tienes un negocio?</p>
              <p className="mt-1 text-[15px] text-[#14092E]/80">Recibe reservas en línea y aparece en este directorio.</p>
            </div>
            <PillLink href="/reservas" tone="violet">Conoce Bicho</PillLink>
          </aside>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
