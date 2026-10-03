'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BichoLogo } from './BichoLogo';
import { PillLink, focusRingOnDark, focusRingOnLight } from './Primitives';

// This nav is shared by the homepage AND the legal pages (/privacidad,
// /terminos) — these section ids only exist on the homepage. Smooth-
// scroll when the target is actually on the current page; otherwise
// fall through to a normal navigation to `/#id`.
function scrollToSection(id: string, onDone?: () => void) {
  return (e: React.MouseEvent) => {
    const target = document.getElementById(id);
    if (!target) return; // not on this page — let the browser go to /#id
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onDone?.();
  };
}

const LINKS = [
  { id: 'funciones', label: 'Funciones' },
  { id: 'demos', label: 'Demos' },
  { id: 'como-funciona', label: 'Cómo funciona' },
  { id: 'precios', label: 'Precios' },
  { id: 'vendedores', label: 'Vendedores' },
];

// Sits transparently ON the hero rather than as its own coloured band —
// the nav is part of the hero composition, which is what lets the hero
// read as one full-bleed field instead of "a bar, then a section".
//
// `tone` exists because this nav renders on two different grounds: the
// hero's violet field and the white legal pages. Every colour it needs
// is resolved once, up top, as a pair — not as conditionals sprinkled
// through the JSX, which is how one of them ends up forgotten and
// invisible. The logo matters most: its pixels are white, so on white it
// has to be inverted (tone="ink") or it renders as nothing at all.
export function MarketingNav({ tone = 'onLight' }: { tone?: 'onViolet' | 'onLight' }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Escape cierra el menú. En un panel que tapa la página, dejar el
  // teclado sin salida es la clase de detalle que solo nota quien
  // depende de él.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const onViolet = tone === 'onViolet';

  const ring = onViolet ? focusRingOnDark : focusRingOnLight;
  // The links live inside a glass capsule, so each one needs its own
  // hover fill — a colour-only hover inside a tinted shell is almost
  // invisible, since the shell has already lifted the contrast.
  const linkTone = onViolet
    ? 'text-white/75 hover:bg-white/15 hover:text-white'
    : 'text-[#140F2E]/65 hover:bg-[#5B34E8]/[0.08] hover:text-[#140F2E]';
  // The capsule itself. On violet it is a real frosted panel; on the
  // white legal pages white-on-white would vanish, so there it is a
  // whisper of violet with a hairline instead.
  const navShell = onViolet
    ? 'bg-white/10 ring-white/20'
    : 'bg-[#5B34E8]/[0.05] ring-[#140F2E]/[0.08]';
  const burgerTone = onViolet
    ? 'border-white/25 text-white hover:bg-white/10'
    : 'border-[#140F2E]/15 text-[#140F2E] hover:bg-[#140F2E]/[0.04]';

  return (
    <header className="relative z-30">
      {/* Grid and not justify-between: with the logo on one side and a
          pill button on the other, "space between" leaves the middle item
          wherever the two unequal sides happen to put it — it was landing
          61px off centre, which nobody notices on bare links and everyone
          notices on a capsule. The 1fr columns force the centre column to
          the real centre. Below lg the nav is hidden, that column
          collapses to zero, and the row reads as logo + actions. */}
      <div className="relative z-30 mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-5">
        <a
          href="/reservas#top"
          onClick={scrollToSection('top', close)}
          /* El logo medía 28px de alto, por debajo del objetivo táctil
             de 44 que recomienda Apple y Android. El -my-2 devuelve el
             espacio que el py-2 añade, así que el área de toque crece
             sin mover la barra. */
          className={`-my-2 flex shrink-0 items-center rounded-sm py-2 ${ring}`}
        >
          <BichoLogo className="h-7" tone={onViolet ? 'light' : 'ink'} />
        </a>

        <nav
          className={`hidden items-center gap-1 rounded-full p-1.5 ring-1 ring-inset backdrop-blur-xl lg:flex ${navShell}`}
        >
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`/reservas#${link.id}`}
              onClick={scrollToSection(link.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${linkTone} ${ring}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-self-end gap-3">
          <PillLink
            href="/demo"
            tone={onViolet ? 'white' : 'violet'}
            className="hidden sm:inline-flex"
          >
            Agenda una demo
          </PillLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors lg:hidden ${burgerTone} ${ring}`}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* The panel is white on both grounds: a translucent panel over the
          hero's grid texture made the links unreadable. */}
      {/* Un velo detrás del panel: oscurece la página, deja claro que el
          menú está encima de todo, y da la salida que un celular espera
          — tocar fuera para cerrar. Antes la única forma era apuntarle
          a la X. */}
      {open && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={close}
          className="fixed inset-0 z-20 cursor-default bg-[#140F2E]/45 lg:hidden"
        />
      )}

      {open && (
        <div className="absolute inset-x-4 top-full z-30 rounded-2xl bg-white p-2 shadow-[0_24px_60px_-20px_rgba(20,15,46,0.35)] ring-1 ring-[#140F2E]/[0.08] lg:hidden">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`/reservas#${link.id}`}
              onClick={scrollToSection(link.id, close)}
              className={`block rounded-xl px-4 py-3 text-sm font-medium text-[#140F2E]/75 transition-colors hover:bg-[#5B34E8]/[0.06] hover:text-[#140F2E] ${focusRingOnLight}`}
            >
              {link.label}
            </a>
          ))}
          <a
            href="/demo"
            className={`mt-1 block rounded-xl bg-[#5B34E8] px-4 py-3 text-center text-sm font-semibold text-white ${focusRingOnLight}`}
          >
            Agenda una demo
          </a>
        </div>
      )}
    </header>
  );
}
