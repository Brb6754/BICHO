import type { Metadata } from 'next';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { AgendaList } from '@/components/tenant-dash/AgendaList';
import { DemoNote } from '@/components/demo/DemoNote';
import { DEMO, demoBookings } from '@/components/demo/fixtures';

export const metadata: Metadata = {
  title: 'Agenda · demo — bicho',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Mirrors app/t/[slug]/dashboard/calendar/page.tsx. The real page also
// carries NewBookingForm (book someone in by hand) and per-row
// Reagendar/Cancelar — all three write to Postgres through Server
// Actions, so they're described here instead of faked. A button that
// looks live and silently does nothing is worse than one that isn't
// there.
export default function DemoAgendaPage() {
  const now = new Date();
  const bookings = demoBookings(now)
    .filter((b) => new Date(b.ends_at) >= new Date(now.getTime() - 12 * 60 * 60 * 1000))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const active = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={
          active > 0
            ? `${active} ${active === 1 ? 'cita confirmada' : 'citas confirmadas'} de hoy en adelante.`
            : 'Todas tus citas, de hoy en adelante, en el orden del día.'
        }
      />

      <DemoNote>
        En el panel real, cada cita se puede reagendar o cancelar desde aquí, y
        hay un formulario para agendar a mano a quien llame o llegue al local.
        En la demo esos botones no aparecen porque escribirían en una base de
        datos real.
      </DemoNote>

      <div className="mt-8">
        <AgendaList
          bookings={bookings}
          timezone={DEMO.timezone}
          now={now}
          emptyTitle="No hay citas próximas"
          emptyHint="En cuanto un cliente reserve desde tu página, va a aparecer aquí agrupada por día."
        />
      </div>
    </div>
  );
}
