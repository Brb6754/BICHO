import { Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createService, toggleServiceActive, deleteService } from './actions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';

export default async function ServicesPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', params.slug).single();

  const { data: services } = await supabase
    .from('service_types')
    .select('id, name, duration_minutes, price_cents, requires_staff, active')
    .eq('tenant_id', tenant!.id)
    .order('created_at');

  return (
    <div>
      <Text variant="h1">Servicios</Text>
      <Text variant="body" className="mt-1 text-muted">
        El catálogo que tus clientes van a poder reservar.
      </Text>

      <Card className="mt-6">
        <form
          action={createService.bind(null, params.slug)}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-[180px] flex-1">
            <Label>Nombre</Label>
            <Input type="text" name="name" placeholder="Corte de cabello" required className="w-full" />
          </div>
          <div>
            <Label>Duración (min)</Label>
            <Input type="number" name="duration_minutes" min={1} defaultValue={30} required className="w-24" />
          </div>
          <div>
            <Label>Precio (MXN)</Label>
            <Input type="number" name="price_mxn" min={0} step="0.01" defaultValue={0} required className="w-28" />
          </div>
          <label className="flex items-center gap-2 pb-2.5 text-sm text-ink">
            <input type="checkbox" name="requires_staff" defaultChecked className="accent-primary" />
            Requiere profesional
          </label>
          <Button type="submit">Agregar</Button>
        </form>
      </Card>

      <ul className="mt-6 flex flex-col gap-3">
        {services?.map((s) => (
          <li key={s.id}>
            <Card padded={false} className="flex items-center justify-between px-6 py-4">
              <span className="flex flex-wrap items-center gap-2 text-ink">
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-muted">
                  {s.duration_minutes} min — ${(s.price_cents / 100).toFixed(2)} MXN
                </span>
                {!s.requires_staff && <Badge>sin profesional</Badge>}
                {!s.active && <Badge tone="muted">inactivo</Badge>}
              </span>
              <div className="flex gap-2">
                <form action={toggleServiceActive.bind(null, s.id, !s.active, params.slug)}>
                  <Button type="submit" variant="ghost" className="px-4 py-1.5 text-xs">
                    {s.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </form>
                <ConfirmForm
                  action={deleteService.bind(null, s.id, params.slug)}
                  confirmTitle="Borrar servicio"
                  confirmMessage={`¿Seguro que quieres borrar "${s.name}"? Esta acción no se puede deshacer.`}
                  confirmLabel="Borrar"
                  triggerClassName="px-4 py-1.5 text-xs"
                >
                  Borrar
                </ConfirmForm>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {services?.length === 0 && (
        <Card className="mt-6">
          <EmptyState
            icon={Tag}
            title="Todavía no hay servicios"
            description="Agrega el primero desde el formulario de arriba — es el catálogo que tus clientes van a poder reservar."
          />
        </Card>
      )}
    </div>
  );
}
