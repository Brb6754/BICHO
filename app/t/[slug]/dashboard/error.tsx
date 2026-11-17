'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// Catches errors thrown anywhere under a tenant's /dashboard — resources,
// services, schedule, calendar — including the "throw on Supabase error"
// pattern just added to every Server Action there, so a failed
// save/delete now shows this instead of silently doing nothing.
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-surface px-6 py-16 text-center">
      <p className="text-lg font-semibold text-ink">Algo salió mal.</p>
      {/* En producción Next cambia el mensaje por uno genérico en inglés
          ("An error occurred in the Server Components render…"): ese no se
          le enseña a la dueña. Los nuestros vienen en español. */}
      <p className="max-w-sm text-sm text-muted">
        {!error.message || /Server Components render|omitted in production/i.test(error.message)
          ? 'No pudimos completar lo que pediste. Revisa tu internet e inténtalo de nuevo.'
          : error.message}
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
