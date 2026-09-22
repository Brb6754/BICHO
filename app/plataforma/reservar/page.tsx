import type { Metadata } from 'next';
import { DemoBanner } from '@/components/demo/DemoBanner';
import { DemoBookingFlow } from '@/components/demo/DemoBookingFlow';
import { DEMO } from '@/components/demo/fixtures';
import { BusinessMark } from '@/components/tenant-dash/BusinessMark';
import { tenantColorCssVars, tenantGlassBackground } from '@/lib/branding/colors';

export const metadata: Metadata = {
  title: 'Página de reservas · demo — bicho',
  description:
    'Así ve un cliente la página de reservas de un negocio en bicho: elige servicio, profesional, día y hora.',
  robots: { index: false, follow: false },
};

// What the END CUSTOMER sees — the other half of the product, and the
// half that decides whether a business buys it.
//
// Structure matches the real page's "sin plantilla" path: a compact
// identity header, then the booking card in position 2. `force-light`
// pins the surface tokens the same way the real page does, so a
// visitor whose browser is in dark mode doesn't get half-inverted
// tokens on a page that's meant to be the business's own light brand.
export default function DemoBookingPage() {
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
            className="mt-8 overflow-hidden rounded-3xl"
            style={{
              background: tenantGlassBackground(DEMO.primaryColor, DEMO.accentColor, 3),
              boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 12px 32px -12px rgba(16,24,40,0.12)',
            }}
          >
            <DemoBookingFlow />
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            Negocio de ejemplo. Puedes completar una reserva de principio a fin —
            no se guarda nada ni se manda ningún mensaje.
          </p>
        </div>
      </main>
    </>
  );
}
