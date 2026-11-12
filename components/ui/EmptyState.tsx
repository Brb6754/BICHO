import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Text } from './Text';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {/* The icon sits on a brand tint with ink strokes, so a pale or a
          near-black brand never makes it disappear. */}
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-ink/75 ring-1 ring-inset ring-primary/20">
        <span className="absolute -inset-2 rounded-[1.25rem] border border-dashed border-primary/25" aria-hidden="true" />
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <Text variant="h3">{title}</Text>
        {description && (
          <Text variant="small" className="mx-auto mt-1 max-w-sm">
            {description}
          </Text>
        )}
      </div>
      {action}
    </div>
  );
}
