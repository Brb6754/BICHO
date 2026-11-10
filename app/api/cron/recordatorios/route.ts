import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendBookingConfirmation } from '@/lib/email/sendBookingConfirmation';
import { sendBookingWhatsApp } from '@/lib/whatsapp/send';
import { tenantManageBookingUrl } from '@/lib/urls';
import { esServicio } from '@/lib/meetings/kinds';
import { tocaRecordatorio, ventanaRecordatorio } from '@/lib/regresan/recordatorios';

// Recordatorio automático de cita (módulo "Clientes que regresan").
//
// Lo llama Vercel Cron (vercel.json) una vez al día. Vercel manda
// `Authorization: Bearer $CRON_SECRET` cuando esa variable existe en el
// proyecto; sin ella este endpoint rechaza TODO (falla cerrado), así que
// nadie de fuera puede dispararlo para mandar mensajes cobrados.
//
// Canal: WhatsApp si el negocio tiene el extra prendido Y existe la
// plantilla aprobada de recordatorio (WHATSAPP_TEMPLATE_REMINDER). Sin
// esa plantilla NO se intenta: send.ts caería a la de confirmación y la
// clienta leería "cita confirmada" otra vez. Si WhatsApp no sale, correo
// (si la clienta dejó uno).
//
// Idempotente: cada cita se reclama (reminder_sent_at) ANTES de mandar.
// Dos corridas encimadas no duplican un mensaje.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Fila = {
  id: string;
  tenant_id: string;
  starts_at: string;
  created_at: string | null;
  status: string;
  kind?: string | null;
  reminder_sent_at: string | null;
  customers: { name: string; phone: string | null; email: string | null } | null;
  service_types: { name: string } | null;
  tenants: {
    name: string;
    slug: string;
    timezone: string | null;
    accent_color: string | null;
    whatsapp_enabled?: boolean | null;
    regresan_enabled?: boolean | null;
  } | null;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const now = new Date();
  const { desde, hasta } = ventanaRecordatorio(now);
  const db = createAdminClient();

  const { data, error } = await db
    .from('bookings')
    .select('*, customers(name, phone, email), service_types(name), tenants!inner(*)')
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .eq('tenants.regresan_enabled', true)
    .gt('starts_at', desde)
    .lte('starts_at', hasta)
    .order('starts_at')
    .limit(500);

  if (error) {
    // 42703 / PGRST: db/046 no está corrida. No es un error del cron.
    console.error('cron recordatorios: consulta falló', error);
    return NextResponse.json({ ok: false, reason: 'Falta correr db/046_clientes_regresan.sql o la consulta falló.' });
  }

  const plantillaWa = Boolean(process.env.WHATSAPP_TEMPLATE_REMINDER);
  const resumen = { revisadas: 0, whatsapp: 0, correo: 0, sinCanal: 0 };

  for (const cita of (data ?? []) as unknown as Fila[]) {
    if (!cita.tenants?.regresan_enabled || !esServicio(cita) || !tocaRecordatorio(cita, now)) continue;
    resumen.revisadas += 1;

    // Reclamar antes de mandar: si otra corrida ya la tomó, no hay filas.
    const { data: reclamada } = await db
      .from('bookings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', cita.id)
      .eq('tenant_id', cita.tenant_id)
      .is('reminder_sent_at', null)
      .select('id');
    if (!reclamada?.length) continue;

    const t = cita.tenants;
    const nombre = cita.customers?.name ?? 'Cliente';
    const servicio = cita.service_types?.name ?? 'tu cita';
    const manageUrl = tenantManageBookingUrl(t.slug, cita.id);

    if (t.whatsapp_enabled && plantillaWa && cita.customers?.phone) {
      const r = await sendBookingWhatsApp({
        tenantId: cita.tenant_id,
        tenantName: t.name,
        whatsappEnabled: true,
        bookingId: cita.id,
        customerPhone: cita.customers.phone,
        customerName: nombre,
        serviceName: servicio,
        startsAt: cita.starts_at,
        timezone: t.timezone,
        manageUrl,
        kind: 'reminder',
      });
      if (r.status === 'sent') {
        resumen.whatsapp += 1;
        continue;
      }
    }

    if (cita.customers?.email) {
      await sendBookingConfirmation({
        customerEmail: cita.customers.email,
        customerName: nombre,
        businessName: t.name,
        serviceName: servicio,
        startsAt: cita.starts_at,
        manageUrl,
        accentColor: t.accent_color ?? undefined,
        timezone: t.timezone,
        kind: 'reminder',
      });
      resumen.correo += 1;
      continue;
    }

    // Sin WhatsApp utilizable ni correo: no hay a dónde mandarlo. Se
    // queda marcada para no reintentar cada día una cita sin canal.
    resumen.sinCanal += 1;
  }

  return NextResponse.json({ ok: true, ...resumen });
}
