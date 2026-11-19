'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { TenantAccess } from '@/lib/billing/trial';

// Aviso de prueba/cobro arriba de cada página del panel del dueño.
// Href público (/dashboard/plan), sin prefijo /t/{slug}: ver CLAUDE.md.
//
// Tres cosas en una línea, sin asustar: cuánto le queda, qué pasa al
// terminar y que nada se borra. Durante la prueba el botón es de contorno
// ("Ver mi plan"): con 12 días por delante, un "Activar" morado en cada
// pantalla se lee como cobro.
export function TrialBanner({ access }: { access: TenantAccess }) {
  const pathname = usePathname();
  // En Mi plan ya está todo esto, más grande: repetirlo arriba es ruido.
  if (access.kind === 'active' || pathname?.endsWith('/dashboard/plan')) return null;

  const dias = (n: number) => (n === 1 ? '1 día' : `${n} días`);
  const text =
    access.kind === 'trial'
      ? `Te ${access.daysLeft === 1 ? 'queda' : 'quedan'} ${dias(access.daysLeft)} de prueba gratis. Al terminar eliges tu plan para seguir recibiendo citas; no se te cobra nada solo.`
      : access.kind === 'grace'
        ? access.reason === 'payment_failed'
          ? `No pudimos cobrar tu plan. Tu página sigue recibiendo citas ${dias(access.daysLeft)} más; resuélvelo antes para que no se pause.`
          : `Tu prueba terminó. Tu página sigue recibiendo citas ${dias(access.daysLeft)} más; activa tu plan para que no se pause.`
        : 'Tu página está en pausa y no recibe citas nuevas. Tus clientes y citas siguen guardados: activa tu plan y vuelve al momento.';
  const urgent = access.kind !== 'trial';

  return (
    <div
      role={urgent ? 'alert' : 'status'}
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ${
        urgent ? 'bg-warning-soft text-ink ring-warning/30' : 'bg-surface text-ink ring-border'
      }`}
    >
      <p className="min-w-0 flex-1 basis-64 leading-relaxed">{text}</p>
      <Link
        href="/dashboard/plan"
        className={`inline-flex min-h-[2.75rem] shrink-0 items-center rounded-full px-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-sm:w-full max-sm:justify-center ${
          urgent
            ? 'bg-primary text-[rgb(var(--color-cta-fg))] hover:brightness-110'
            : 'border border-border text-ink hover:bg-ink/[0.04]'
        }`}
      >
        {!urgent ? 'Ver mi plan' : access.kind === 'grace' && access.reason === 'payment_failed' ? 'Resolver mi pago' : 'Activar mi plan'}
      </Link>
    </div>
  );
}
