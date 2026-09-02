import { SelectHTMLAttributes, forwardRef } from 'react';

// Same reasoning as Input.tsx: no default width, callers add "w-full"
// explicitly instead of relying on a className override to shrink it.
// `error` is a real prop, not a className fight, same as Input.
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, error = false, ...props }, ref) => (
    <select
      ref={ref}
      aria-invalid={error || undefined}
      className={`rounded-2xl border bg-surface px-4 py-2.5 text-sm text-ink transition-shadow duration-150 focus:outline-none focus:ring-4 ${
        error
          ? 'border-error focus:border-error focus:ring-error/15'
          : 'border-border focus:border-primary focus:ring-primary/15'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';
