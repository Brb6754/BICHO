'use client';

import Link from 'next/link';
import { useCallback, useRef } from 'react';

// A card that lights up from wherever the pointer is. The visual lives
// in globals.css (`.spotlight`); this component's only job is writing
// --spot-x / --spot-y as the pointer moves.
//
// Why it's written this way:
//  - It sets the custom properties DIRECTLY on the node instead of
//    going through React state. Two coordinates at pointer frequency
//    through a re-render would re-run the whole card's render tree for
//    something that only ever changes a background position.
//  - The write is throttled to one per animation frame. pointermove
//    fires faster than the screen refreshes, so anything more is work
//    the compositor throws away.
//  - On pointerleave the coordinates are NOT reset. The CSS fades the
//    layer out on its own; moving the light back to the centre at the
//    same time makes it visibly slide away as it fades.
//
// `href` decides the element: an internal route gets next/link, an
// external one or a mailto gets a plain anchor, and no href gets a div —
// same branching the portfolio card already needed, centralised here so
// the three sections that use this don't each reinvent it.
export function SpotlightCard({
  children,
  className = '',
  href,
  external = false,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  external?: boolean;
  ariaLabel?: string;
}) {
  const frame = useRef<number | null>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (frame.current !== null) return;
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${clientX - r.left}px`);
      el.style.setProperty('--spot-y', `${clientY - r.top}px`);
    });
  }, []);

  const shared = {
    onPointerMove,
    className: `spotlight ${className}`,
  };

  if (!href) return <div {...shared}>{children}</div>;

  return external ? (
    <a {...shared} href={href} target="_blank" rel="noopener noreferrer" aria-label={ariaLabel}>
      {children}
    </a>
  ) : (
    <Link {...shared} href={href} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
