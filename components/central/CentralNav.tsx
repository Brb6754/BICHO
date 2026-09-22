'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { CentralLogo } from './CentralLogo';
import { PillLink, focusRingOnDark, focusRingOnLight } from './Primitives';

// The studio's own nav — sits on the hero's deep-blue field the same
// way bicho reservas' nav sits on its violet field (part of the hero
// composition, not a bar above it). Only ever renders on this one page
// today, but takes `tone` anyway so a future page under bicho central
// (case studies, /trabajo) can reuse it on a white ground without
// duplicating the component.
function scrollToSection(id: string, onDone?: () => void) {
  return (e: React.MouseEvent) => {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onDone?.();
  };
}

const LINKS = [
  { id: 'portafolio', label: 'Portafolio' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'nosotros', label: 'Cómo trabajamos' },
];

export function CentralNav({ tone = 'onDeep' }: { tone?: 'onDeep' | 'onLight' }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const onDeep = tone === 'onDeep';

  const ring = onDeep ? focusRingOnDark : focusRingOnLight;
  const linkTone = onDeep
    ? 'text-white/75 hover:bg-white/10 hover:text-white'
    : 'text-[#05091C]/65 hover:bg-[#3B00FF]/[0.08] hover:text-[#05091C]';
  const navShell = onDeep ? 'bg-white/[0.06] ring-white/15' : 'bg-[#3B00FF]/[0.05] ring-[#05091C]/[0.08]';
  const burgerTone = onDeep
    ? 'border-white/20 text-white hover:bg-white/10'
    : 'border-[#05091C]/15 text-[#05091C] hover:bg-[#05091C]/[0.04]';

  return (
    <header className="relative z-30">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-5">
        <a
          href="/#top"
          onClick={scrollToSection('top', close)}
          className={`shrink-0 rounded-sm ${ring} ${onDeep ? 'text-white' : 'text-[#05091C]'}`}
        >
          <CentralLogo className="h-7" />
        </a>

        <nav
          className={`hidden items-center gap-1 rounded-full p-1.5 ring-1 ring-inset backdrop-blur-xl lg:flex ${navShell}`}
        >
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`/#${link.id}`}
              onClick={scrollToSection(link.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${linkTone} ${ring}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-self-end gap-3">
          <PillLink
            href="mailto:nonameynk@gmail.com"
            tone={onDeep ? 'white' : 'core'}
            className="hidden px-5 py-2.5 sm:inline-flex"
          >
            Hablemos
          </PillLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors lg:hidden ${burgerTone} ${ring}`}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute inset-x-4 top-full z-30 rounded-2xl border border-white/10 bg-[#0B1030] p-2 shadow-[0_24px_60px_-20px_rgba(2,6,30,0.6)] lg:hidden">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`/#${link.id}`}
              onClick={scrollToSection(link.id, close)}
              className={`block rounded-xl px-4 py-3 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white ${focusRingOnDark}`}
            >
              {link.label}
            </a>
          ))}
          <a
            href="mailto:nonameynk@gmail.com"
            className={`mt-1 block rounded-xl bg-[#3B00FF] px-4 py-3 text-center text-sm font-semibold text-white ${focusRingOnDark}`}
          >
            Hablemos
          </a>
        </div>
      )}
    </header>
  );
}
