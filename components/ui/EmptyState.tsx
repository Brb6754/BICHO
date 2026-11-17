import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Text } from './Text';

// Un estado vacío ENSEÑA, no solo avisa (docs/UX-PANEL.md → "Estados
// vacíos"): qué va a aparecer aquí (title + description), por qué le
// sirve (why), un botón que lleva a hacerlo (action) y, si existe, un
// ejemplo para ver cómo se ve antes de empezar (example).
export function EmptyState({
  icon: Icon,
  title,
  description,
  why,
  action,
  example,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Por qué vale la pena: el beneficio en una frase, no la función. */
  why?: string;
  action?: ReactNode;
  /** Acción secundaria discreta, normalmente "Ver un ejemplo". */
  example?: ReactNode;
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
        {why && <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-ink">{why}</p>}
      </div>
      {(action || example) && (
        <div className="mt-1 flex flex-col items-center gap-1">
          {action}
          {example}
        </div>
      )}
    </div>
  );
}
