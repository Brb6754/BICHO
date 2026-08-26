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
      <p className="max-w-sm text-sm text-muted">{error.message || 'Ocurrió un error inesperado. Intenta de nuevo.'}</p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
