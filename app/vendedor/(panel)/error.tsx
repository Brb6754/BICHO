'use client';

import { Button } from '@/components/ui/Button';

// Catches anything thrown below the rep panel — including AccessError
// from lib/auth/access when someone tries to open a business that is
// not theirs.
export default function ResellerPanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="admin-shell flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <p className="text-lg font-semibold text-ink">Algo salió mal</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Puede que ese negocio no sea tuyo o que la sesión haya caducado. Vuelve a intentarlo; si sigue igual,
        escríbenos.
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
