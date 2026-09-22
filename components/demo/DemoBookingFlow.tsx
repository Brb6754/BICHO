'use client';

import { useCallback } from 'react';
import BookingFlow from '@/components/booking/BookingFlow';
import type { Service } from '@/components/booking/types';
import { DEMO, DEMO_RESOURCES, DEMO_SERVICES, demoSlots } from './fixtures';

// The REAL booking flow, fed from fixtures.
//
// This is the whole reason BookingFlow grew `loadSlots`/`submitBooking`:
// a demo that reimplements the flow stops matching the product the week
// after it's written. Here the visitor uses the actual component — the
// five steps, the editable summary, the 14-day strip, the time groups,
// the validation — with two things swapped underneath:
//
//   loadSlots      → computed in the browser from the demo schedule,
//                    so no Supabase call and no keys required.
//   submitBooking  → resolves to a fake confirmation code. Nothing is
//                    written anywhere. A stranger clicking "Confirmar"
//                    on the public demo must not create a row in a real
//                    salon's calendar.
//
// The 700ms wait on submit isn't decoration: without it the confirmation
// appears the same frame as the click, the button's loading state never
// renders, and the flow feels faker than it is.
export function DemoBookingFlow() {
  const loadSlots = useCallback(async (service: Service) => demoSlots(service, new Date()), []);

  const submitBooking = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 700));
    // Same shape as a real booking id so the confirmation screen renders
    // its reference code exactly as it does in production.
    return { ok: true as const, bookingId: 'demo-0000-0000-0000-000000000000' };
  }, []);

  return (
    <BookingFlow
      slug={DEMO.slug}
      businessName={DEMO.name}
      services={DEMO_SERVICES}
      resources={DEMO_RESOURCES}
      timezone={DEMO.timezone}
      primaryColor={DEMO.primaryColor}
      accentColor={DEMO.accentColor}
      resourceLabel={DEMO.resourceLabel}
      location={DEMO.location}
      loadSlots={loadSlots}
      onSubmitBooking={submitBooking}
      manageUrl="/plataforma/cita"
    />
  );
}
