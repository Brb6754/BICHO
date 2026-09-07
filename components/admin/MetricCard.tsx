import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

// trend is optional on purpose and only meant to be passed when there's
// a real previous-period number to compare against — never fabricate a
// plausible-looking trend just for visual effect.
type Trend = { label: string; direction: 'up' | 'down' | 'flat' };

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  trend?: Trend;
  // The one bold stat on a screen — a solid brand-color block instead
  // of the default neutral card. Restraint matters here: pass this on
  // at most one card per grid (see dashboard/page.tsx), never on every
  // card, or the "one dramatic element" reads as decoration instead of
  // emphasis. 2026 reference-redesign addition.
  emphasis?: boolean;
}) {
  if (emphasis) {
    return (
      <div className="rounded-3xl bg-primary p-6 text-[rgb(var(--color-cta-fg))]">
        <div className="flex items-start justify-between">
          <Text variant="label" className="!text-[rgb(var(--color-cta-fg))] opacity-70">
            {label}
          </Text>
          {Icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/10">
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        <Text variant="display" className="mt-3 !text-[rgb(var(--color-cta-fg))]">
          {value}
        </Text>
        {(trend || hint) && (
          <div className="mt-1.5 flex items-center gap-2 opacity-80">
            {trend && (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium">
                {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
                {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
                {trend.direction === 'flat' && <Minus className="h-3 w-3" />}
                {trend.label}
              </span>
            )}
            {hint && <span className="text-xs">{hint}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <Text variant="label">{label}</Text>
        {Icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary dark:bg-accent/10 dark:text-accent">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <Text variant="h1" className="mt-3">
        {value}
      </Text>
      {(trend || hint) && (
        <div className="mt-1.5 flex items-center gap-2">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                trend.direction === 'up' ? 'text-success' : trend.direction === 'down' ? 'text-error' : 'text-muted'
              }`}
            >
              {trend.direction === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend.direction === 'down' && <TrendingDown className="h-3 w-3" />}
              {trend.direction === 'flat' && <Minus className="h-3 w-3" />}
              {trend.label}
            </span>
          )}
          {hint && <Text variant="caption">{hint}</Text>}
        </div>
      )}
    </Card>
  );
}
