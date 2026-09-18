'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { createReseller, updateReseller, type ResellerInput } from './actions';

// One form for registering a rep and for editing one later: the fields
// are the same, only the action differs. `initial` present = edit mode.
export function ResellerForm({
  resellerId,
  initial,
}: {
  resellerId?: string;
  initial?: ResellerInput;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ResellerInput>(
    initial ?? {
      name: '',
      email: '',
      phone: '',
      zone: '',
      wholesalePriceMxn: 0,
      defaultRetailPriceMxn: 0,
      billingDay: 1,
      notes: '',
    }
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof ResellerInput>(key: K, value: ResellerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setMessage(null);

    if (resellerId) {
      const result = await updateReseller(resellerId, form);
      setSubmitting(false);
      setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: 'Guardado' });
      if (!result.error) router.refresh();
      return;
    }

    const result = await createReseller(form);
    setSubmitting(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    router.push(`/vendedores/${result.resellerId}`);
    router.refresh();
  }

  return (
    <Card className="flex max-w-md flex-col gap-4">
      <div>
        <Label htmlFor="rep-name">Nombre</Label>
        <Input
          id="rep-name"
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="María Fernanda Ruiz"
          className="w-full"
        />
      </div>

      <div>
        <Label htmlFor="rep-email">Correo</Label>
        <Input
          id="rep-email"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted">Para contactarla. El acceso al panel se crea aparte, abajo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rep-phone">Teléfono</Label>
          <Input
            id="rep-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="rep-zone">Zona</Label>
          <Input
            id="rep-zone"
            type="text"
            value={form.zone}
            onChange={(e) => set('zone', e.target.value)}
            placeholder="Durango centro"
            className="w-full"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rep-wholesale">Le cobras por negocio activo (MXN al mes)</Label>
          <Input
            id="rep-wholesale"
            type="number"
            min={0}
            max={100000}
            step={10}
            value={form.wholesalePriceMxn}
            onChange={(e) => set('wholesalePriceMxn', Number(e.target.value))}
            className="w-full"
          />
          <p className="mt-1 text-xs text-muted">Tu precio mayorista. Él revende al precio que quiera.</p>
        </div>
        <div>
          <Label htmlFor="rep-billing-day">Día de cobro</Label>
          <Input
            id="rep-billing-day"
            type="number"
            min={1}
            max={28}
            step={1}
            value={form.billingDay}
            onChange={(e) => set('billingDay', Number(e.target.value))}
            className="w-full"
          />
          <p className="mt-1 text-xs text-muted">Del 1 al 28, para que exista todos los meses.</p>
        </div>
      </div>

      <div>
        <Label htmlFor="rep-default-retail">Precio de venta sugerido (MXN al mes)</Label>
        <Input
          id="rep-default-retail"
          type="number"
          min={0}
          max={100000}
          step={10}
          value={form.defaultRetailPriceMxn}
          onChange={(e) => set('defaultRetailPriceMxn', Number(e.target.value))}
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted">
          Solo rellena su formulario al dar de alta un negocio. El precio real lo fija él, negocio por negocio.
        </p>
      </div>

      <div>
        <Label htmlFor="rep-notes">Notas internas</Label>
        <textarea
          id="rep-notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-base text-ink transition-shadow duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 sm:py-2.5 sm:text-sm"
        />
      </div>

      {message && (
        <p
          className={`rounded-2xl p-3 text-sm ${message.ok ? 'bg-success-soft text-success' : 'bg-error-soft text-error'}`}
          role="status"
        >
          {message.text}
        </p>
      )}

      <Button type="button" onClick={handleSubmit} isLoading={submitting}>
        {submitting ? 'Guardando' : resellerId ? 'Guardar cambios' : 'Registrar vendedor'}
      </Button>
    </Card>
  );
}
