'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { cancelPublicBooking } from './actions';
import { RescheduleForm } from './RescheduleForm';

export function BookingActions({
  bookingId,
  slug,
  resourceId,
  serviceTypeId,
  primaryColor,
  accentColor,
}: {
  bookingId: string;
  slug: string;
  resourceId: string;
  serviceTypeId: string;
  primaryColor: string;
  accentColor: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'reschedule'>('idle');
  const [rescheduledTo, setRescheduledTo] = useState<string | null>(null);

  if (rescheduledTo) {
    return (
      <p className="rounded-2xl bg-primary/10 p-4 text-center text-sm text-ink">
        Cita cambiada a{' '}
        <strong>{format(new Date(rescheduledTo), "d 'de' MMMM, h:mm a", { locale: es })}</strong>.
      </p>
    );
  }

  if (mode === 'reschedule') {
    return (
      <RescheduleForm
        bookingId={bookingId}
        slug={slug}
        resourceId={resourceId}
        serviceTypeId={serviceTypeId}
        primaryColor={primaryColor}
        accentColor={accentColor}
        onCancel={() => setMode('idle')}
        onDone={(newStartsAt) => setRescheduledTo(newStartsAt)}
      />
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button type="button" onClick={() => setMode('reschedule')}>
        Cambiar cita
      </Button>
      <ConfirmForm
        action={async (formData) => {
          await cancelPublicBooking(bookingId, slug);
          router.refresh();
        }}
        confirmTitle="Cancelar cita"
        confirmMessage="¿Seguro que quieres cancelar esta cita? Esta acción no se puede deshacer."
        confirmLabel="Cancelar cita"
      >
        Cancelar cita
      </ConfirmForm>
    </div>
  );
}
