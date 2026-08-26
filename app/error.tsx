'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

// Root-level error boundary — catches anything an unhandled exception in
// any page/layout not covered by a more specific error.tsx (see
// app/admin/(panel)/error.tsx and app/t/[slug]/dashboard/error.tsx for
// the two that matter most). Before this existed, any uncaught error
// anywhere in the app fell through to Next's bare unbranded fallback
// with no way for the visitor to recover without a manual reload.
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <p className="text-lg font-semibold text-ink">Algo salió mal.</p>
      <p className="max-w-sm text-sm text-muted">
        Ocurrió un error inesperado. Intenta de nuevo — si el problema sigue, contacta al equipo.
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
