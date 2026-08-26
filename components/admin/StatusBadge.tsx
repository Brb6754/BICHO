type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled';

// Each status is a complete, self-contained class string (see the
// className-override cascade gotcha noted in CLAUDE.md) — never build
// this by combining a base Badge with a color override.
const STATUS_CLASSES: Record<TenantStatus, string> = {
  active: 'bg-success-soft text-success',
  trial: 'bg-warning-soft text-warning',
  suspended: 'bg-black/5 text-muted',
  cancelled: 'bg-error-soft text-error',
};

const STATUS_DOT_CLASSES: Record<TenantStatus, string> = {
  active: 'bg-success',
  trial: 'bg-warning',
  suspended: 'bg-muted',
  cancelled: 'bg-error',
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
