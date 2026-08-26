'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Menu } from 'lucide-react';

const SEGMENT_LABELS: Record<string, string> = {
  tenants: 'Tenants',
  templates: 'Plantillas',
  settings: 'Configuración',
  new: 'Nuevo',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname() ?? '';
  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-glass/55 px-4 backdrop-blur-md lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menú"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink transition hover:bg-glass/60 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <nav className="flex items-center gap-1.5 overflow-x-auto text-small">
        <span className="text-ink">Panel</span>
        {segments.map((seg, i) => {
          const label = UUID_REGEX.test(seg) ? 'Detalle' : (SEGMENT_LABELS[seg] ?? seg);
          const isLast = i === segments.length - 1;
          return (
            <span key={i} className="flex shrink-0 items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted" />
              <span className={isLast ? 'font-medium text-ink' : 'text-muted'}>{label}</span>
            </span>
          );
        })}
      </nav>
    </header>
  );
}
