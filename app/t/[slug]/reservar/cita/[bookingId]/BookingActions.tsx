'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Check } from 'lucide-react';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { tenantCtaStyle, readableFgRgb } from '@/lib/branding/colors';
import { formatTime, longDate } from '@/lib/dates/tenantTime';
import { cancelPublicBooking } from './actions';
import { RescheduleForm } from './RescheduleForm';

export function BookingActions({
  bookingId,
  slug,
  resourceId,
  serviceTypeId,
  primaryColor,
  accentColor,
  timezone,
}: {
  bookingId: string;
  slug: string;
  resourceId: string;
  serviceTypeId: string;
  primaryColor: string;
  accentColor: string;
  timezone: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'reschedule'>('idle');
  const [rescheduledTo, setRescheduledTo] = useState<string | null>(null);
  const ctaStyle = tenantCtaStyle(primaryColor, accentColor);

  if (mode === 'reschedule') {
    return (
      <RescheduleForm
        bookingId={bookingId}
        slug={slug}
        resourceId={resourceId}
        serviceTypeId={serviceTypeId}
        primaryColor={primaryColor}
        accentColor={accentColor}
        timezone={timezone}
        onCancel={() => setMode('idle')}
        onDone={(newStartsAt) => {
          setRescheduledTo(newStartsAt);
          setMode('idle');
          // The details above are server-rendered; the action already
          // revalidated this path, so a refresh shows the new time there
          // too instead of leaving the old one on screen.
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rescheduledTo && (
        <p className="animate-fade-in flex items-start gap-3 rounded-2xl bg-ink/[0.04] px-4 py-3 text-sm text-ink" role="status">
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: accentColor, color: 'rgb(' + readableFgRgb(accentColor) + ')' }}
            aria-hidden="true"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>
            Listo, tu cita ahora es el{' '}
            <strong className="font-semibold">
              {longDate(rescheduledTo, timezone)} a las {formatTime(rescheduledTo, timezone)}
            </strong>
            .
          </span>
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setMode('reschedule')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent px-5 py-3 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ ...ctaStyle, ['--tw-ring-color' as string]: accentColor }}
        >
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          Cambiar día u hora
        </button>
        <ConfirmForm
          action={async () => {
            await cancelPublicBooking(bookingId, slug);
            router.refresh();
          }}
          confirmTitle="¿Cancelar tu cita?"
          confirmMessage="Tu horario se libera para alguien más. Si después quieres volver, tendrás que agendar de nuevo."
          confirmLabel="Sí, cancelar cita"
          dismissLabel="No, conservarla"
          triggerVariant="danger"
          triggerClassName="w-full !rounded-2xl !py-3 sm:w-auto"
        >
          Cancelar cita
        </ConfirmForm>
      </div>
    </div>
  );
}
