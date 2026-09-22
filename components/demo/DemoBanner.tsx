import Link from 'next/link';
import { ArrowLeft, CalendarDays, LayoutDashboard } from 'lucide-react';

// The strip that sits above every demo screen.
//
// It has to do three things at once, and saying them plainly beats
// being subtle about any of them: this is a demo (so nobody thinks
// "Estudio Aurora" is a real client), nothing is saved (so people feel
// free to click Confirmar), and there are two sides to look at (the
// owner's panel and what their customer sees) — a visitor who only
// finds one of them has seen half the product.
export function DemoBanner({ current }: { current: 'panel' | 'reservar' }) {
  const tabs = [
    { key: 'panel' as const, href: '/plataforma/panel', label: 'Panel del negocio', Icon: LayoutDashboard },
    { key: 'reservar' as const, href: '/plataforma/reservar', label: 'Página de reservas', Icon: CalendarDays },
  ];

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[#05091C] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full text-[13px] font-medium text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Volver a bicho
        </Link>

        <span aria-hidden="true" className="hidden h-4 w-px bg-white/15 lg:block" />

        {/* Full width on its own line until there's room for all three
            on one. Squeezed between the back link and the tab group it
            collapsed to a one-word-per-line column — `flex-1` will
            happily shrink a paragraph to nothing. */}
        <p className="order-last w-full text-[13px] leading-snug text-white/60 lg:order-none lg:w-auto lg:flex-1">
          <span className="font-semibold text-[#A99BFF]">Demo.</span> Negocio de ejemplo, datos de
          ejemplo. Puedes tocar todo — nada se guarda.
        </p>

        <div className="ml-auto flex shrink-0 gap-1 rounded-full bg-white/[0.06] p-1 lg:ml-0">
          {tabs.map(({ key, href, label, Icon }) => (
            <Link
              key={key}
              href={href}
              aria-current={current === key ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
                current === key ? 'bg-[#3B00FF] text-white' : 'text-white/65 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
