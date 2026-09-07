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

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#1F1F1F] bg-[#000000]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" onClick={scrollToSection('top')} className="shrink-0">
          <BichoLogo className="h-8" />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={scrollToSection(link.id)}
              className="text-sm text-[#8C8C8C] transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="mailto:nonameynk@gmail.com?subject=Quiero%20una%20demo%20de%20bicho"
          className="inline-flex items-center justify-center rounded-full bg-[#D4F23A] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-95 sm:px-5"
        >
          Agenda una demo
        </a>
      </div>
    </header>
  );
}
