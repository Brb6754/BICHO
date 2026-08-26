'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreVertical, type LucideIcon } from 'lucide-react';

export function Dropdown({ trigger, children }: { trigger?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menú de acciones"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-glass/60 hover:text-ink"
      >
        {trigger ?? <MoreVertical className="h-4 w-4" />}
      </button>
      {open && (
        <div
          role="menu"
          className="glass-3 animate-pop-in absolute right-0 z-30 mt-2 w-52 origin-top-right rounded-[22px] p-1.5"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function itemClasses(destructive: boolean) {
  return `flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-100 ${
    destructive ? 'text-error hover:bg-error-soft' : 'text-ink hover:bg-glass/70'
  }`;
}

export function DropdownItem({
  children,
  icon: Icon,
  href,
  onClick,
  destructive = false,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
}) {
  const content = (
    <>
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children}
    </>
  );

  if (href) {
    return (
      <a href={href} role="menuitem" className={itemClasses(destructive)}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" role="menuitem" onClick={onClick} className={itemClasses(destructive)}>
      {content}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1.5 h-px bg-border" />;
}
