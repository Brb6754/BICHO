type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

// Each status is a complete, self-contained class string (see the
// className-override cascade gotcha noted in CLAUDE.md) — never build
// this by combining a base Badge with a color override.
// Severity was mapped backwards: trial was painted warning-orange
// (a trial is a perfectly healthy state — it's the whole funnel) while
// suspended, the one state that actually needs someone to act, was a
// neutral grey that disappeared in a list. Swapped: trial reads as
// informational, suspended as the warning it is, cancelled as the
// terminal/muted state. `suspended` also stopped using a raw black/5
// fill, which was almost invisible against the panel's dark mode.
const STATUS_CLASSES: Record<TenantStatus, string> = {
  active: 'bg-success-soft text-success',
  trial: 'bg-info-soft text-info',
  suspended: 'bg-warning-soft text-warning',
  cancelled: 'bg-ink/[0.06] text-muted',
};

const STATUS_DOT_CLASSES: Record<TenantStatus, string> = {
  active: 'bg-success',
  trial: 'bg-info',
  suspended: 'bg-warning',
  cancelled: 'bg-muted',
};

const STATUS_LABELS: Record<TenantStatus, string> = {
  active: 'Activo',
  trial: 'Trial',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
};

export function StatusBadge({ status }: { status: string }) {
  const key = (status in STATUS_CLASSES ? status : 'trial') as TenantStatus;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[key]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASSES[key]}`} />
      {STATUS_LABELS[key]}
    </span>
  );
}
