import { Inbox } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { EmptyState } from '@/components/ui/EmptyState';
import { DemoRequestList, type DemoRequest } from './DemoRequestList';

export const dynamic = 'force-dynamic';

// Same defensive read as /admin/vendedores: a section whose table isn't
// there yet should say so, not throw. This one has already earned it —
// PostgREST served this table for one request and then stopped seeing
// it, which is what a stale schema cache looks like from the outside.
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  return /could not find the table|does not exist/i.test(error.message ?? '');
}

// The leads that come in from /demo on the marketing site. Everything
// here is a real person who typed their phone number into a form, so the
// list is built to be acted on — call, write, mark — rather than
// admired: no charts, no funnel, no conversion rate computed from four
// rows.
export default async function DemoRequestsPage() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (isMissingTable(error)) {
    return (
      <div>
        <Text variant="h1">Solicitudes de demo</Text>
        <Card className="mt-6 max-w-xl">
          <p className="text-sm font-medium text-ink">Falta correr la migración</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Esta sección necesita la tabla <code className="font-mono text-xs">demo_requests</code>.
            Corre <code className="font-mono text-xs">db/019_demo_requests.sql</code> en el SQL
            Editor de Supabase y recarga. Si ya la corriste, PostgREST puede seguir con el esquema
            viejo en caché: corre <code className="font-mono text-xs">notify pgrst, &apos;reload schema&apos;;</code>{' '}
            ahí mismo.
          </p>
        </Card>
      </div>
    );
  }

  const requests = (data ?? []) as DemoRequest[];
  const pending = requests.filter((r) => r.status === 'new').length;
  const contacted = requests.filter((r) => r.status === 'contacted').length;
  const won = requests.filter((r) => r.status === 'won').length;

  return (
    <div>
      <div>
        <Text variant="h1">Solicitudes de demo</Text>
        <Text variant="body" className="mt-1 text-muted">
          Lo que llega del formulario de la página. Lo más nuevo primero.
        </Text>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Sin contactar</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{pending}</p>
          <p className="mt-1 text-xs text-muted">
            {pending === 0 ? 'Vas al corriente' : 'Te están esperando'}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Contactadas</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{contacted}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Cerradas</p>
          <p className="mt-1.5 text-3xl font-semibold tabular-nums text-ink">{won}</p>
          <p className="mt-1 text-xs text-muted">
            {requests.length} {requests.length === 1 ? 'solicitud' : 'solicitudes'} en total
          </p>
        </Card>
      </div>

      <Card className="mt-8" padded={false}>
        {requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Todavía no hay solicitudes"
            description="Cuando alguien llene el formulario de /demo, aparece aquí con su teléfono y su correo."
          />
        ) : (
          <DemoRequestList requests={requests} />
        )}
      </Card>
    </div>
  );
}
