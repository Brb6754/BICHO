import { HTMLAttributes, forwardRef } from 'react';

// padded is a real prop, not a className override — see the cascade
// gotcha noted in CLAUDE.md: appending "p-0" via className is not
// guaranteed to beat the base component's own padding utility. Same
// reasoning applies to elevation/hoverable below.
//
// raised/overlay use the .glass-2/.glass-3 utilities (globals.css) —
// translucent + blurred, per the design brief's glass-level system.
// flat stays fully opaque bg-surface: for content nested inside another
// glass panel, stacking two translucent layers just muddies legibility.
type Elevation = 'flat' | 'raised' | 'overlay';

const ELEVATION_CLASSES: Record<Elevation, string> = {
  flat: 'border border-border bg-surface shadow-none',
  raised: 'glass-2',
  overlay: 'glass-3',
};

export const Card = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { padded?: boolean; elevation?: Elevation; hoverable?: boolean }
>(({ padded = true, elevation = 'raised', hoverable = false, className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`rounded-3xl transition-all duration-200 ${ELEVATION_CLASSES[elevation]} ${
      hoverable ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''
    } ${padded ? 'p-6' : ''} ${className}`}
    {...props}
  />
));
Card.displayName = 'Card';
