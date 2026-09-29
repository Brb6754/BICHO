'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { markBookingAttendance } from './actions';

// How an appointment that has already happened gets closed out.
//
// Shown only on bookings whose end time has passed: "¿vino?" is not a
// question you can answer about tomorrow, and offering it there would
// let an owner mark a week of future appointments as completed and
// quietly break their own agenda.
//
// Two buttons and no menu. This is the single most repeated action in
// the product — it happens once per appointment, every appointment,
// forever — so it costs one tap, and the answer is visible in the row
// immediately afterwards rather than behind a confirmation.
export function AttendanceButtons({
  bookingId,
  slug,
  customerName,
}: {
  bookingId: string;
  slug: string;
  customerName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<null | 'came' | 'missed'>(null);
  const [error, setError] = useState<string | null>(null);

  async function mark(attended: boolean) {
    setPending(attended ? 'came' : 'missed');
    setError(null);
    const result = await markBookingAttendance(bookingId, slug, attended);
    setPending(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    // The row re-renders as completed/no-show from the server, so there
    // is no local copy of the status here to drift out of sync.
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          isLoading={pending === 'came'}
          disabled={pending !== null}
          onClick={() => mark(true)}
          className="px-3 py-1.5 text-xs"
          aria-label={`${customerName} sí vino`}
        >
          {pending !== 'came' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          Vino
        </Button>
        <Button
          type="button"
          variant="danger"
          isLoading={pending === 'missed'}
          disabled={pending !== null}
          onClick={() => mark(false)}
          className="px-3 py-1.5 text-xs"
          aria-label={`${customerName} no vino`}
        >
          {pending !== 'missed' && <X className="h-3.5 w-3.5" aria-hidden="true" />}
          No vino
        </Button>
      </div>
      {error && (
        <p role="alert" className="max-w-[16rem] text-right text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
