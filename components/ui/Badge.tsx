import { HTMLAttributes } from 'react';

type Tone = 'default' | 'muted' | 'danger' | 'inverse';

// A tone prop instead of relying on className overrides — Tailwind's
// generated stylesheet order doesn't match JSX class order, so appending
// a conflicting color utility via className is not guaranteed to win.
const TONE_CLASSES: Record<Tone, string> = {
  default: 'bg-primary/10 text-primary dark:bg-accent/10 dark:text-accent',
  muted: 'bg-black/5 text-muted dark:bg-white/10',
  danger: 'bg-error-soft text-error',
  inverse: 'bg-white/10 text-accent',
};

export function Badge({
  tone = 'default',
  className = '',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
