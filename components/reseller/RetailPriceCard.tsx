'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { formatMxn } from '@/lib/resellers';
import { toast } from '@/components/tenant-dash/ui/Toast';
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
  const [error, setError] = useState<string | null>(null);

  const parsed = value.trim() === '' ? null : Number(value);
  const valid = parsed === null || (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100000);
  const margin = parsed === null ? null : parsed - wholesalePrice;
  const losing = billable && margin != null && margin < 0;
  const dirty = (currentPrice ?? null) !== parsed;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !dirty) return;
    setSaving(true);
    setError(null);
    const result = await setTenantRetailPrice(tenantId, parsed);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast('Precio guardado');
    router.refresh();
  }

  return (
    <Card className="max-w-md">
      <form noValidate onSubmit={save} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="retail-price" tone="ink">
          Lo que le cobras al mes
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted" aria-hidden="true">
            $
          </span>
          <Input
            id="retail-price"
            type="number"
            min={0}
            max={100000}
            step={10}
            inputMode="numeric"
            enterKeyHint="done"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={!valid}
            className="w-full pl-8"
            placeholder="700"
          />
        </div>
        <p className={`mt-1.5 text-xs leading-relaxed ${valid ? 'text-muted' : 'text-error'}`}>
          {valid
            ? 'En pesos. Tú se lo cobras directamente; bicho no le cobra nada al negocio.'
            : 'Pon un monto entre 0 y 100,000 pesos.'}
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
          <span className={`font-semibold tabular-nums ${losing ? 'text-error' : 'text-ink'}`}>
            {margin == null ? '—' : `${formatMxn(billable ? margin : (parsed ?? 0))} / mes`}
          </span>
        </div>
        {losing && (
          <p className="mt-2 text-xs font-medium leading-relaxed text-error">
            Con este precio pierdes dinero: le pagas a bicho más de lo que cobras.
          </p>
        )}
        {!billable && (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Este negocio todavía no está activo: no te cuesta nada, y normalmente tampoco te paga aún.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-2xl bg-error-soft p-3 text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" isLoading={saving} disabled={!dirty || !valid}>
        {saving ? 'Guardando…' : 'Guardar precio'}
      </Button>
      </form>
    </Card>
  );
}
