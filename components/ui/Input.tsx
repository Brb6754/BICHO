import { InputHTMLAttributes, forwardRef } from 'react';

// No default width here on purpose — a base "w-full" would conflict with
// any narrower width.className passed by a caller (same cascade gotcha
// noted in CLAUDE.md: className order doesn't decide the winner).
// Callers that want full width add "w-full" explicitly themselves.
//
// `error` is a boolean flag (not a className override) for the same
// reason: border/ring color needs to be a real branch, not something a
// caller is expected to fight via className.
// 16px text on phones, 14px from sm up. iOS Safari zooms the whole page
// into any field whose text is smaller than 16px the moment it's
// focused, and doesn't zoom back out: on a booking form that means the
// layout lurches sideways as the customer starts typing their name.
type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={`rounded-2xl border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted sm:py-2.5 sm:text-sm transition-shadow duration-150 focus:outline-none focus:ring-4 ${
        error
          ? 'border-error focus:border-error focus:ring-error/15'
          : 'border-border focus:border-primary focus:ring-primary/15'
      } ${className}`}
      {...props}
    />
  )
);
Input.displayName = 'Input';
