import Link from 'next/link';
import { Lock } from 'lucide-react';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { planPermiteAgente } from '@/lib/whatsapp/agente/ruteo';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Conversaciones, type ConversacionVista } from './Conversaciones';
import { cambiarAgente, cambiarEstado, responder } from './actions';

export const dynamic = 'force-dynamic';

const TITULO = 'Recepcionista de WhatsApp';
const DESCRIPCION = 'Contesta a tus clientes por WhatsApp y agenda directo en tu agenda. Si una plática se complica, la tomas tú.';

export default async function WhatsappPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId, timezone, role } = await requireTenantStaff(slug);

  // `*`: sin db/056 corrida, las columnas nuevas simplemente no vienen.
  const { data: tenant } = await createAdminClient().from('tenants').select('*').eq('id', tenantId).single();

  if (!planPermiteAgente(tenant?.plan)) {
    return (
      <>
        <PageHeader title={TITULO} description={DESCRIPCION} />
        <Card className="mt-6 flex flex-col items-start gap-3">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <Lock className="h-4 w-4" aria-hidden="true" /> Incluido en el plan Pro
          </span>
          <p className="text-sm text-muted">Sube a Pro para prender la recepcionista y que agende por ti las 24 horas.</p>
          <Link href="/dashboard/plan" className="text-sm font-medium text-primary hover:underline">
            Ver planes
          </Link>
        </Card>
      </>
    );
  }

  const prendido = tenant?.agente_whatsapp_enabled === true;
  const migrada = tenant != null && 'agente_whatsapp_enabled' in tenant;
  const puedeCambiar = role === 'owner' || role === 'admin';

  // Lectura con la sesión del usuario: la RLS de db/056 ya limita a sus negocios; el filtro por tenant elige ESTE.
  const supabase = await createClient();
  const { data } = await supabase
    .from('whatsapp_conversaciones')
    .select('id, telefono, estado, last_message_at, historial')
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false })
    .limit(30);

  return (
    <>
      <PageHeader
        title={TITULO}
        description={DESCRIPCION}
        action={
          puedeCambiar && migrada ? (
            <form action={cambiarAgente.bind(null, slug, !prendido)}>
              <Button type="submit" variant={prendido ? 'outline' : 'primary'}>
                {prendido ? 'Apagar recepcionista' : 'Prender recepcionista'}
              </Button>
            </form>
          ) : undefined
        }
      />
      <p className="mb-6 mt-3 text-sm text-muted">
        {!migrada
          ? 'Falta correr db/056_whatsapp_agente.sql en Supabase.'
          : prendido
            ? 'Encendida: contesta los mensajes nuevos al instante.'
            : 'Apagada: nadie contesta en automático.'}
      </p>
      <Conversaciones
        conversaciones={(data ?? []) as ConversacionVista[]}
        timezone={timezone}
        acciones={{
          tomar: (id) => cambiarEstado.bind(null, slug, id, 'humano'),
          devolver: (id) => cambiarEstado.bind(null, slug, id, 'ia'),
          responder: (id) => responder.bind(null, slug, id),
        }}
      />
    </>
  );
}
