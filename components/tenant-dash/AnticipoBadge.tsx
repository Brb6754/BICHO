import { etiquetaAnticipo } from '@/lib/anticiposPanel';

/** "Falta anticipo · vence 16:30" o "Anticipo pagado". Nada si la cita no tiene anticipo (o falta db/061). */
export function AnticipoBadge({
  cita,
  timezone,
  chica = false,
}: {
  cita: { status: string; deposit_status?: string | null; hold_expires_at?: string | null };
  timezone: string | null;
  chica?: boolean;
}) {
  const e = etiquetaAnticipo(cita, timezone);
  if (!e) return null;
  return (
    <span
      className={`inline-block max-w-full truncate rounded-full font-semibold ${chica ? 'px-2 py-px text-[13px]' : 'px-2.5 py-0.5 text-[13px] sm:text-sm'} ${
        e.tono === 'pagado' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
      }`}
    >
      {e.texto}
    </span>
  );
}
