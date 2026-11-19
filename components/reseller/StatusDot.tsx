import { STATUS_LABELS } from '@/lib/resellers';

const STATUS_DOT: Record<string, string> = {
  active: 'bg-success',
  trial: 'bg-warning',
  suspended: 'bg-error',
  cancelled: 'bg-muted',
};

// Punto de color + el estado en palabras: el color nunca va solo.
export function StatusDot({ status }: { status: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span className={'h-2 w-2 rounded-full ' + (STATUS_DOT[status] ?? 'bg-muted')} aria-hidden="true" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
