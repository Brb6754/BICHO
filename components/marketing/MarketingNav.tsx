'use client';

import { BichoLogo } from './BichoLogo';

// This nav is shared by the homepage AND the legal pages (/privacidad,
// /terminos) — these section ids only exist on the homepage. Smooth-
// scroll when the target is actually on the current page; otherwise
// fall through to a normal navigation to `/#id`, which lands on the
// homepage and jumps there on load, same as any other cross-page anchor
// link.
function scrollToSection(id: string) {
  return (e: React.MouseEvent) => {
    const target = document.getElementById(id);
    if (!target) return; // not on this page — let the browser navigate to /#id
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

const LINKS = [
  { id: 'funciones', label: 'Funciones' },
  { id: 'precios', label: 'Precios' },
  { id: 'vendedores', label: 'Vendedores' },
];

// Floating rounded pill (2026 reference redesign), not a full-width bar —
// sits with margin on all sides instead of flush against the viewport
// edges, matching the reference's nav treatment.
export function MarketingNav() {
  return (
    <header className="sticky top-4 z-20 px-4 sm:top-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full bg-[#123321]/90 px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur sm:px-7">
        <a href="/#top" onClick={scrollToSection('top')} className="shrink-0">
          <BichoLogo className="h-7" />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`/#${link.id}`}
              onClick={scrollToSection(link.id)}
              className="text-sm text-[#9CA99A] transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="mailto:nonameynk@gmail.com?subject=Quiero%20una%20demo%20de%20bicho"
          className="inline-flex items-center justify-center rounded-full border border-[#D4F23A]/50 px-4 py-2 text-sm font-medium text-[#D4F23A] transition hover:bg-[#D4F23A]/10 sm:px-5"
        >
          Agenda una demo
        </a>
      </div>
    </header>
  );
}
