import Link from 'next/link';
import { ArrowUpRight, ChevronLeft } from 'lucide-react';
import { ShareLink } from '@/components/tenant-dash/ui/ShareLink';
import { StatusDot } from '@/components/reseller/StatusDot';
import { BACK_LINK } from '@/components/reseller/styles';
import { formatMxn } from '@/lib/resellers';

export const BUSINESS_SECTIONS = [
  { id: 'precio', label: 'Precio' },
  { id: 'acceso', label: 'Acceso' },
  { id: 'productos', label: 'Productos' },
  { id: 'extras', label: 'Extras' },
  { id: 'pagina', label: 'Su página' },
  { id: 'marca', label: 'Marca' },
] as const;

// Lo primero que ve el vendedor al abrir un negocio: de quién es, cómo va,
// cuánto le cobra, y el link para mandárselo a la dueña en ese momento.
// Debajo, saltos a cada sección: en el teléfono la página es larga.
export function BusinessHeader({
  name,
  status,
  retailPrice,
  pageUrl,
  slug,
}: {
  name: string;
  status: string;
  retailPrice: number | null;
  pageUrl: string;
  slug: string;
}) {
  return (
    <>
      <Link href="/" className={BACK_LINK}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Mis negocios
      </Link>

      <header className="mt-1 border-b border-border pb-6">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink [overflow-wrap:anywhere]">
          {name}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
          <StatusDot status={status} />
          <span aria-hidden="true">·</span>
          {retailPrice ? (
            <span className="tabular-nums">Le cobras {formatMxn(retailPrice)} al mes</span>
          ) : (
            <a href="#precio" className="font-medium text-warning underline underline-offset-4">
              Sin precio todavía
            </a>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ShareLink url={pageUrl} slug={slug} negocio={name} corto />
          <a
            href={pageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Abrir su página
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </header>

      <nav aria-label="Secciones del negocio" className="-mx-5 mt-4 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {BUSINESS_SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:min-h-9"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

/** Encabezado de sección con ancla para los saltos de BusinessHeader. */
export function BusinessSection({
  id,
  title,
  note,
  children,
}: {
  id: (typeof BUSINESS_SECTIONS)[number]['id'];
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="mt-10 scroll-mt-20 lg:scroll-mt-8">
      <div className="mb-3">
        <h2 id={`${id}-titulo`} className="text-base font-semibold text-ink">
          {title}
        </h2>
        {note && <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}
