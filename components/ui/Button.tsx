import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'ghost-inverse' | 'outline' | 'danger' | 'success';

// Each variant is a complete, self-contained class string — never rely on
// a className override to change color, since Tailwind's generated
// stylesheet order (not JSX order) decides which utility wins when two
// conflict, and that order isn't something we control reliably.
const VARIANT_CLASSES: Record<Variant, string> = {
  // "Gradiente premium": primary → secondary, with a soft colored glow
  // instead of a flat fill. primary/secondary are themselves CSS-var
  // tokens (tailwind.config.ts) — inside a tenant dashboard they resolve
  // to that tenant's own colors, everywhere else (admin) to the
  // platform's indigo/violet, with zero extra classes needed here.
  primary: 'bg-gradient-to-r from-primary to-secondary text-[rgb(var(--color-cta-fg))] shadow-glow-primary hover:brightness-110 hover:shadow-lg',
  secondary: 'glass-2 text-ink hover:bg-glass/90',
  ghost:
    'border border-primary/15 bg-transparent text-primary hover:bg-glass/50 dark:border-accent/25 dark:text-accent dark:hover:bg-white/5',
  'ghost-inverse': 'border border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/15',
  outline: 'border border-border bg-transparent text-ink hover:bg-glass/40',
  danger: 'bg-transparent text-error hover:bg-error-soft',
  success: 'bg-success text-white shadow-sm hover:bg-success/90',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; isLoading?: boolean }
>(({ variant = 'primary', isLoading = false, disabled, className = '', children, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled || isLoading}
    aria-busy={isLoading || undefined}
    className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${className}`}
    {...props}
  >
    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
));
Button.displayName = 'Button';
