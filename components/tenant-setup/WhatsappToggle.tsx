'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// Meta's utility-template rate for Mexico, worst tier (no volume
// discount, which is where a single small business sits). Used only to
// show an order of magnitude next to the switch — the real bill comes
// from Meta, and this number should be re-checked against their rate
// card rather than trusted forever.
const MXN_PER_MESSAGE = 0.2;

// One switch, two panels: the internal team sees it on a business's page,
// the reseller sees the same thing on theirs. Both call the same action,
// which decides for itself whether the caller is allowed.
export function WhatsappToggle({
  enabled,
  sentThisMonth,
  onToggle,
  // A reseller is paying bicho for this; the internal team is paying
  // Meta. The sentence under the switch differs, the control doesn't.
  audience = 'admin',
}: {
  enabled: boolean;
  sentThisMonth: number;
  onToggle: (enabled: boolean) => Promise<void>;
  audience?: 'admin' | 'reseller';
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      await onToggle(!enabled);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar.');
    } finally {
      setSaving(false);
    }
  }

  const estimate = (sentThisMonth * MXN_PER_MESSAGE).toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  });

  return (
    <Card className="flex max-w-xl flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            enabled ? 'bg-success-soft text-success' : 'bg-elevated text-muted'
          }`}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink">Confirmación por WhatsApp</p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                enabled ? 'bg-success-soft text-success' : 'bg-elevated text-muted'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-success' : 'bg-muted'}`}
                aria-hidden="true"
              />
              {enabled ? 'Activo' : 'Apagado'}
            </span>
          </div>

          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {enabled
              ? 'Cada cita nueva le llega al cliente por WhatsApp, además del correo.'
              : 'Hoy el cliente solo recibe correo — y solo si dejó uno. Con esto activado también le llega por WhatsApp.'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-elevated px-4 py-3 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-muted">Mensajes este mes</span>
          <span className="font-semibold tabular-nums text-ink">{sentThisMonth}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-muted">
            {audience === 'reseller' ? 'Te cuesta aprox.' : 'Costo aprox. en Meta'}
          </span>
          <span className="font-semibold tabular-nums text-ink">{estimate}</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Estimado a MX$0.20 por mensaje, la tarifa de WhatsApp en México sin descuento por
          volumen. El cobro real lo hace Meta.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-error-soft px-4 py-3 text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={toggle}
        isLoading={saving}
        variant={enabled ? 'outline' : 'primary'}
      >
        {saving ? 'Guardando' : enabled ? 'Apagar WhatsApp' : 'Activar WhatsApp'}
      </Button>
    </Card>
  );
}
