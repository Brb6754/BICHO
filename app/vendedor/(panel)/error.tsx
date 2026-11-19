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
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          Reintentar
        </Button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- carga completa a propósito: una navegación suave puede caer en el mismo render roto. */}
        <a
          href="/"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-ink hover:bg-ink/[0.04]"
        >
          Ir a mis negocios
        </a>
      </div>
    </div>
  );
}
