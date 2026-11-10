import Link from 'next/link';
import type { TenantAccess } from '@/lib/billing/trial';

// Aviso de prueba/cobro arriba de cada página del panel del dueño.
// Href público (/dashboard/plan), sin prefijo /t/{slug}: ver CLAUDE.md.
export function TrialBanner({ access }: { access: TenantAccess }) {
  if (access.kind === 'active') return null;

  const dias = (n: number) => (n === 1 ? '1 día' : `${n} días`);
  const [text, urgent] =
    access.kind === 'trial'
      ? [`Te ${access.daysLeft === 1 ? 'queda' : 'quedan'} ${dias(access.daysLeft)} de prueba.`, false]
      : access.kind === 'grace'
        ? [
            access.reason === 'payment_failed'
              ? `No pudimos cobrar tu plan. En ${dias(access.daysLeft)} tu página dejará de recibir reservas.`
              : `Tu prueba terminó, activa tu plan. En ${dias(access.daysLeft)} tu página dejará de recibir reservas.`,
            true,
          ]
        : ['Tu página está en pausa y no recibe reservas nuevas. Activa tu plan para reanudarla.', true];

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ${
        urgent ? 'bg-warning-soft text-ink ring-warning/30' : 'bg-surface text-ink ring-border'
      }`}
    >
      <p>{text}</p>
      <Link
        href="/dashboard/plan"
        className="shrink-0 rounded-full bg-primary px-4 py-1.5 font-medium text-[rgb(var(--color-cta-fg))] hover:brightness-110"
      >
        Activar plan
      </Link>
    </div>
  );
}
