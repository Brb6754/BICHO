'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { setTenantReseller } from './actions';

// Attribution seen from the business's side: who gets credited (and
// paid) for it. Lives on the tenant detail page so a business that came
// in directly can be credited later, or moved between reps.
export function ResellerPicker({
  tenantId,
  currentResellerId,
  resellers,
}: {
  tenantId: string;
  currentResellerId: string | null;
  resellers: { id: string; name: string; active: boolean }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentResellerId ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const dirty = (currentResellerId ?? '') !== value;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await setTenantReseller(tenantId, value || null);
      setMessage('Guardado');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1">
        <Select value={value} onChange={(e) => setValue(e.target.value)} className="w-full">
          <option value="">Llegó directo (sin vendedor)</option>
          {resellers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.active ? '' : ' (inactivo)'}
            </option>
          ))}
        </Select>
      </div>
      <Button type="button" variant="outline" onClick={save} isLoading={saving} disabled={!dirty}>
        {saving ? 'Guardando' : 'Guardar'}
      </Button>
      {message && <span className="text-sm text-muted">{message}</span>}
    </div>
  );
}
