'use client';

import { BichoLogo } from './BichoLogo';

// In-page anchors only (this is a single-page marketing site), so a
// plain <a href="#..."> plus scrollIntoView is enough — no router, no
// need for globals.css's (unavailable to us) scroll-behavior: smooth.
function scrollToSection(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        <a href="#top" onClick={scrollToSection('top')} className="shrink-0">
          <BichoLogo className="h-7" />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
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
          Contáctanos
        </a>
      </div>
    </header>
  );
}
