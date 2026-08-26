import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Text } from './Text';

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-between">
      <Text variant="caption">
        Página {page} de {totalPages}
      </Text>
      <div className="flex items-center gap-2">
        <Link
          href={buildHref(page - 1)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink transition hover:bg-black/[0.02] dark:hover:bg-white/5 ${
            page <= 1 ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={buildHref(page + 1)}
          aria-disabled={page >= totalPages}
          tabIndex={page >= totalPages ? -1 : undefined}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border text-ink transition hover:bg-black/[0.02] dark:hover:bg-white/5 ${
            page >= totalPages ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
