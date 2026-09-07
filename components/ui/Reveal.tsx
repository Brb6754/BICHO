'use client';

import { useEffect, useRef, useState } from 'react';

// Scroll-triggered version of the page-load fade-up (globals.css's
// .animate-fade-in, used at mount by things like the marketing Hero) —
// starts invisible, then plays that same keyframe once an
// IntersectionObserver says the element has actually entered the
// viewport. Shared across the marketing site and the tenant-facing
// dashboard/booking pages: it carries zero color assumptions (pure
// opacity/transform), so it's exactly as safe inside a tenant's own
// branded pages as it is on the platform's own marketing page.
//
// `delay` (ms) staggers a group of siblings — pass increasing values
// (0, 80, 160...) for things that should reveal in sequence rather
// than all at once.
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
