'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// Catches errors thrown anywhere under /admin/(panel) — tenants,
// templates, settings — including the "throw on Supabase error" pattern
// just added to every Server Action in this section (createResource,
// updateTemplate, etc.), so a failed save now shows this instead of
// silently doing nothing or Next's bare fallback page.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-surface px-6 py-16 text-center">
      <p className="text-lg font-semibold text-ink">Algo salió mal.</p>
      <p className="max-w-sm text-sm text-muted">{error.message || 'Ocurrió un error inesperado.'}</p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
