import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus, MapPin } from 'lucide-react';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { DemoNote } from '@/components/demo/DemoNote';
import { DEMO, DEMO_SERVICES } from '@/components/demo/fixtures';
import { BusinessMark } from '@/components/tenant-dash/BusinessMark';
import { addDaysKey, appointmentWhen, dayKey, instantFromLocal } from '@/lib/dates/tenantTime';
import { tenantColorCssVars, tenantGlassBackground } from '@/lib/branding/colors';

export const metadata: Metadata = {
  title: 'Mi cita · demo — bicho',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// The third screen of the product: what the CUSTOMER gets from the
// confirmation link — their appointment, with the option to move or
// cancel it without calling anyone.
//
// It exists in the demo because the confirmation screen's main button
// pointed at a tenant subdomain URL for a business that doesn't exist,
// so the demo ended on a 404 at its most important moment. Now it ends
// on the real feature.
//
// The appointment shown is the one the demo flow lets you book
// (tomorrow, 10:00, corte y peinado) rather than whatever you actually
// picked — there's no server holding your choice, and inventing one
// from a query string would be a lie of a different kind. The note says
// so plainly.
export default function DemoBookingManagePage() {
  const now = new Date();
  const service = DEMO_SERVICES[0];
  const startsAt = instantFromLocal(addDaysKey(dayKey(now, DEMO.timezone), 1), '10:00', DEMO.timezone);

  return (
    <>
      <DemoBanner current="reservar" />

      <main
        className="force-light relative min-h-screen overflow-hidden bg-paper"
        style={
          tenantColorCssVars(
            DEMO.primaryColor,
            DEMO.secondaryColor,
            DEMO.accentColor
          ) as React.CSSProperties
        }
      >
        <div className="mx-auto max-w-2xl px-5 pb-20 pt-10 sm:px-6 sm:pt-14">
          <header className="flex items-center gap-3.5">
            <BusinessMark name={DEMO.name} color={DEMO.primaryColor} />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-ink">{DEMO.name}</h1>
              <p className="truncate text-sm text-muted">{DEMO.tagline}</p>
            </div>
          </header>

          <div
            className="mt-8 rounded-3xl p-6 sm:p-8"
            style={{
              background: tenantGlassBackground(DEMO.primaryColor, DEMO.accentColor, 3),
              boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 12px 32px -12px rgba(16,24,40,0.12)',
            }}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: DEMO.accentColor }}
                aria-hidden="true"
              />
              Confirmada
            </span>

            <h2 className="mt-3 text-xl font-bold text-ink">Tu cita</h2>

            <dl className="mt-5 flex flex-col divide-y divide-border border-y border-border">
              {[
                ['Servicio', service.name],
                ['Cuándo', appointmentWhen(startsAt, DEMO.timezone)],
                ['Duración', `${service.duration_minutes} min`],
                ['Atiende', 'Daniela'],
                ['Dónde', DEMO.location],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="text-sm font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex flex-col gap-2.5">
              <span className="inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-full bg-primary/40 px-6 text-sm font-semibold text-[rgb(var(--color-cta-fg))]">
                Cambiar la hora
              </span>
              <span className="inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-full border border-border px-6 text-sm font-medium text-muted">
                Cancelar la cita
              </span>
              <a
                href="#"
                aria-disabled="true"
                className="pointer-events-none inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-medium text-muted"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Agregar a mi calendario
              </a>
            </div>
          </div>

          <DemoNote>
            En el producto real esta pantalla es la que recibe el cliente en su
            correo: puede mover su cita a otro horario libre o cancelarla sin
            llamar a nadie, y el cambio aparece al instante en la agenda del
            negocio. Aquí los botones están apagados porque no hay una cita de
            verdad detrás.
          </DemoNote>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {DEMO.location}
          </p>

          <p className="mt-6 text-center text-sm">
            <Link
              href="/plataforma/panel/calendar"
              className="font-medium text-ink underline underline-offset-4"
            >
              Ver cómo le llega al negocio
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
