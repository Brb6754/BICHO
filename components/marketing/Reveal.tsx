'use client';

import { useEffect, useRef, useState } from 'react';

// Scroll-triggered version of the same fade-up used on page load (Hero,
// globals.css's .animate-fade-in) — inspired by numia.co (Bruno liked
// its section-by-section reveals as you scroll). Starts invisible,
// then plays the existing keyframe once an IntersectionObserver says
// it's actually entered the viewport, instead of firing at mount like
// Hero's version does. Reuses .animate-fade-in as-is (same easing,
// same reduced-motion handling in globals.css) rather than defining a
// second animation — one scroll-reveal language for the whole page.
//
// `delay` (ms) staggers a group of siblings the same way Hero staggers
// its own elements — pass increasing values (0, 80, 160...) for things
// that should reveal in sequence rather than all at once.
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${visible ? 'animate-fade-in' : 'opacity-0'} ${className}`}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
