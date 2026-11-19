'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { MINUTOS_EXTRA, confirmarAnticipoManual, extenderApartado, liberarApartado } from '@/lib/anticipos/manual';
import { avisarPorWhatsapp, pesosMxn } from '@/lib/anticipos/avisar';
import { avisarCitaLiberada } from '@/lib/boost/motor';

// Un apartado que la clienta pagó por transferencia o en el local: sin
// esto nadie podía marcarlo y se liberaba solo aunque ya hubiera pagado.
// Cada acción prueba membresía (requireTenantStaff) y filtra por
// tenant_id: escriben con service_role, que se salta la RLS.

function refrescar(slug: string) {
  revalidatePath(`/t/${slug}/dashboard/calendar`);
  revalidatePath(`/t/${slug}/dashboard`);
}

export async function marcarAnticipoPagado(slug: string, bookingId: string) {
  const { tenantId, userId } = await requireTenantStaff(slug);
  const db = createAdminClient();
  const r = await confirmarAnticipoManual(db, { tenantId, bookingId, userId });
  if (!r.ok) {
    throw new Error(
      r.motivo === 'liberada'
        ? 'Ese apartado ya se liberó y la hora pudo tomarla alguien más. Agéndala otra vez desde la agenda.'
        : r.motivo === 'no_encontrada' || r.motivo === 'sin_anticipo'
          ? 'Esa cita ya no tiene un anticipo pendiente.'
          : 'No se pudo guardar. Inténtalo otra vez.'
    );
  }
  refrescar(slug);
  if (r.yaEstaba) return;

  // El comprobante sale solo si la recepcionista de WhatsApp está prendida: es su conversación.
  const { data: t } = await db.from('tenants').select('*').eq('id', tenantId).maybeSingle();
  if ((t as { agente_whatsapp_enabled?: boolean } | null)?.agente_whatsapp_enabled === true) {
    const monto = r.montoMxn ?? 0;
    after(() =>
      avisarPorWhatsapp(
        db,
        { tenantId, bookingId },
        (c) => `Recibimos tu anticipo${monto ? ` de ${pesosMxn(monto)}` : ''} para ${c.servicio} el ${c.cuando}. Tu cita queda confirmada.`,
        '[anticipo-manual]'
      )
    );
  }
}

export async function darMasTiempoAnticipo(slug: string, bookingId: string) {
  const { tenantId } = await requireTenantStaff(slug);
  const r = await extenderApartado(createAdminClient(), { tenantId, bookingId, minutos: MINUTOS_EXTRA });
  if (!r.ok) {
    throw new Error(r.motivo === 'no_pendiente' ? 'Ese apartado ya no está esperando pago.' : 'No se pudo guardar. Inténtalo otra vez.');
  }
  refrescar(slug);
}

export async function liberarAnticipo(slug: string, bookingId: string) {
  const { tenantId } = await requireTenantStaff(slug);
  const db = createAdminClient();
  const r = await liberarApartado(db, { tenantId, bookingId });
  if (!r.ok) {
    throw new Error(r.motivo === 'no_pendiente' ? 'Ese apartado ya no está esperando pago.' : 'No se pudo liberar. Inténtalo otra vez.');
  }
  // Igual que cancelar: el hueco quedó libre, avisa a la lista VIP de Boost.
  after(() => avisarCitaLiberada(db, tenantId, bookingId));
  refrescar(slug);
}
