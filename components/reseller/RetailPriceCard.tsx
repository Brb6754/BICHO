'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { formatMxn } from '@/lib/resellers';
import { setTenantRetailPrice } from '@/app/admin/(panel)/vendedores/actions';

// What the rep charges THIS business. Theirs to set, and the only price
// the business ever sees — bicho's wholesale price is shown next to it
// so the rep can see the margin before saving, instead of doing the
// subtraction in their head.
export function RetailPriceCard({
  tenantId,
  currentPrice,
  wholesalePrice,
  billable,
}: {
  tenantId: string;
  currentPrice: number | null;
  wholesalePrice: number;
  billable: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentPrice != null ? String(currentPrice) : '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const parsed = value.trim() === '' ? null : Number(value);
  const valid = parsed === null || (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100000);
  const margin = parsed === null ? null : parsed - wholesalePrice;
  const dirty = (currentPrice ?? null) !== parsed;

  async function save() {
    if (!valid) return;
    setSaving(true);
    setMessage(null);
    const result = await setTenantRetailPrice(tenantId, parsed);
    setSaving(false);
    if (result.error) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setMessage({ ok: true, text: 'Precio guardado' });
    router.refresh();
  }

  return (
    <Card className="flex max-w-md flex-col gap-4">
      <div>
        <Label htmlFor="retail-price">Precio que le cobras al mes</Label>
        <Input
          id="retail-price"
          type="number"
          min={0}
          max={100000}
          step={10}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={!valid}
          className="w-full"
          placeholder="700"
        />
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Tú le cobras este monto directamente. bicho no le cobra nada al negocio.
        </p>
      </div>

      <div className="rounded-xl bg-ink/[0.04] px-4 py-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-muted">Le pagas a bicho</span>
          <span className="tabular-nums text-ink">
            {billable ? `${formatMxn(wholesalePrice)} / mes` : 'Nada todavía'}
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-4">
          <span className="text-muted">Te queda</span>
          <span className={`font-semibold tabular-nums ${margin != null && margin < 0 ? 'text-error' : 'text-ink'}`}>
            {margin == null ? '—' : `${formatMxn(billable ? margin : (parsed ?? 0))} / mes`}
          </span>
        </div>
        {!billable && (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Este negocio todavía no está activo: no te cuesta nada, y normalmente tampoco te paga aún.
          </p>
        )}
      </div>

      {message && (
        <p
          className={`rounded-2xl p-3 text-sm ${message.ok ? 'bg-success-soft text-success' : 'bg-error-soft text-error'}`}
          role="status"
        >
          {message.text}
        </p>
      )}

      <Button type="button" onClick={save} isLoading={saving} disabled={!dirty || !valid}>
        {saving ? 'Guardando' : 'Guardar precio'}
      </Button>
    </Card>
  );
}
