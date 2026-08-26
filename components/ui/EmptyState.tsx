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
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary dark:bg-accent/10 dark:text-accent">
        <Icon className="h-6 w-6" />
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
