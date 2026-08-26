import { Armchair } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createResource, toggleResourceActive, deleteResource } from './actions';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';

export default async function ResourcesPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', params.slug).single();

  const { data: resources } = await supabase
    .from('resources')
    .select('id, name, active')
    .eq('tenant_id', tenant!.id)
    .order('created_at');

  return (
    <div>
      <Text variant="h1">Recursos</Text>
      <Text variant="body" className="mt-1 text-muted">
        Sillas, consultorios, canchas — lo que se puede reservar.
      </Text>

      <Card className="mt-6">
        <form action={createResource.bind(null, params.slug)} className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <Input type="text" name="name" placeholder="Nombre (ej. Silla 1)" required className="w-full" />
          </div>
          <Button type="submit">Agregar</Button>
        </form>
      </Card>

      <ul className="mt-6 flex flex-col gap-3">
        {resources?.map((r) => (
          <li key={r.id}>
            <Card padded={false} className="flex items-center justify-between px-6 py-4">
              <span className="flex items-center gap-3 font-medium text-ink">
                {r.name}
                {!r.active && <Badge tone="muted">inactivo</Badge>}
              </span>
              <div className="flex gap-2">
                <form action={toggleResourceActive.bind(null, r.id, !r.active, params.slug)}>
                  <Button type="submit" variant="ghost" className="px-4 py-1.5 text-xs">
                    {r.active ? 'Desactivar' : 'Activar'}
                  </Button>
                </form>
                <ConfirmForm
                  action={deleteResource.bind(null, r.id, params.slug)}
                  confirmTitle="Borrar recurso"
                  confirmMessage={`¿Seguro que quieres borrar "${r.name}"? Esta acción no se puede deshacer.`}
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
      {resources?.length === 0 && (
        <Card className="mt-6">
          <EmptyState
            icon={Armchair}
            title="Todavía no hay recursos"
            description="Agrega el primero desde el formulario de arriba — sillas, consultorios, canchas, lo que se pueda reservar."
          />
        </Card>
      )}
    </div>
  );
}
