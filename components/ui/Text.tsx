import { HTMLAttributes, ElementType, forwardRef } from 'react';

export type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label';

// Each variant bundles size + weight + color into one class string, so
// using the type scale doesn't depend on remembering which weight goes
// with which size everywhere it's used.
const VARIANT_CLASSES: Record<TextVariant, string> = {
  // display/h1/h2 bumped to font-bold this pass (2026 reference
  // redesign) — the bigger clamp() sizes in tailwind.config.ts need the
  // heavier weight to read as confident rather than just "large text".
  // h3 stays semibold on purpose: not every heading level should shout.
  display: 'text-display font-bold text-ink',
  h1: 'text-h1 font-bold text-ink',
  h2: 'text-h2 font-bold text-ink',
  h3: 'text-h3 font-semibold text-ink',
  body: 'text-body text-ink',
  small: 'text-small text-muted',
  caption: 'text-caption text-muted',
  label: 'text-label font-semibold uppercase text-muted',
};

const DEFAULT_TAG: Record<TextVariant, ElementType> = {
  display: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  small: 'p',
  caption: 'p',
  label: 'span',
};

export const Text = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement> & { variant: TextVariant; as?: ElementType }
>(({ variant, as, className = '', ...props }, ref) => {
  const Tag = as ?? DEFAULT_TAG[variant];
  return <Tag ref={ref} className={`${VARIANT_CLASSES[variant]} ${className}`} {...props} />;
});
Text.displayName = 'Text';
