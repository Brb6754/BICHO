import type { SupabaseClient } from '@supabase/supabase-js';
import { formatFolio } from '@/lib/quotes/totals';
import { enviarPlantilla } from '@/lib/whatsapp/media';
import { cotizaDisponible, type TenantAgente } from '@/lib/whatsapp/agente/ruteo';

// Seguimiento de cotizaciones mandadas por WhatsApp que llevan 48 h sin
// respuesta. Una sola vez por cotización (quotes.seguimiento_enviado_at).
//
// Pasadas las 24 h desde el último mensaje del cliente, Meta solo deja
// mandar PLANTILLAS aprobadas: el nombre va en
// WHATSAPP_TEMPLATE_SEGUIMIENTO_COTIZACION (texto sugerido en
// WHATSAPP_SETUP.md). Sin esa variable no se manda nada.
//
// Idempotente: cada cotización se RECLAMA (seguimiento_enviado_at) antes
// de mandar; dos corridas encimadas no duplican. Si Meta rechaza el
// envío se libera, para que una plantilla mal configurada no queme el
// único seguimiento.

export const SEGUIMIENTO_HORAS = 48;
// Más vieja que esto ya no se persigue: escribirle a alguien a las dos semanas es spam.
export const SEGUIMIENTO_MAX_DIAS = 7;

type Fila = { id: string; tenant_id: string; folio: number; customer_name: string; whatsapp_telefono: string | null; sent_at: string };
type Turno = { role: string; at?: string };

export async function correrSeguimiento(
  db: SupabaseClient,
  ahora: Date = new Date(),
  enviar: typeof enviarPlantilla = enviarPlantilla
): Promise<{ plantilla: boolean; revisadas: number; enviadas: number }> {
  const plantilla = process.env.WHATSAPP_TEMPLATE_SEGUIMIENTO_COTIZACION;
  if (!plantilla) return { plantilla: false, revisadas: 0, enviadas: 0 };

  const hace = (h: number) => new Date(ahora.getTime() - h * 3_600_000).toISOString();
  const { data, error } = await db
    .from('quotes')
    .select('id, tenant_id, folio, customer_name, whatsapp_telefono, sent_at')
    .eq('origen', 'whatsapp')
    .in('status', ['sent', 'viewed'])
    .is('seguimiento_enviado_at', null)
    .lt('sent_at', hace(SEGUIMIENTO_HORAS))
    .gt('sent_at', hace(SEGUIMIENTO_MAX_DIAS * 24))
    .limit(200);
  if (error) throw new Error(`seguimiento: consulta falló code=${error.code}`);
  const filas = (data ?? []) as Fila[];
  if (!filas.length) return { plantilla: true, revisadas: 0, enviadas: 0 };

  const { data: ts } = await db.from('tenants').select('*').in('id', [...new Set(filas.map((f) => f.tenant_id))]);
  const tenants = new Map(((ts ?? []) as TenantAgente[]).map((t) => [t.id, t]));

  let enviadas = 0;
  for (const q of filas) {
    const t = tenants.get(q.tenant_id);
    // El add-on pudo apagarse después de cotizar; y se contesta desde el número propio del negocio.
    if (!t || !cotizaDisponible(t, false) || !t.whatsapp_phone_number_id || !q.whatsapp_telefono) continue;

    // "Sin respuesta": si el cliente escribió después de recibir la cotización, ya hay plática; no se le persigue.
    const { data: conv } = await db
      .from('whatsapp_conversaciones')
      .select('historial')
      .eq('tenant_id', q.tenant_id)
      .eq('telefono', q.whatsapp_telefono)
      .maybeSingle();
    const historial = (Array.isArray(conv?.historial) ? conv.historial : []) as Turno[];
    if (historial.some((h) => h.role === 'user' && h.at && h.at > q.sent_at)) continue;

    const { data: reclamada } = await db
      .from('quotes')
      .update({ seguimiento_enviado_at: ahora.toISOString() })
      .eq('id', q.id)
      .eq('tenant_id', q.tenant_id)
      .is('seguimiento_enviado_at', null)
      .select('id');
    if (!reclamada?.length) continue;

    const r = await enviar(t.whatsapp_phone_number_id, q.whatsapp_telefono, plantilla, [q.customer_name.split(' ')[0] || q.customer_name, t.name, formatFolio(q.folio)]);
    if (r.ok) {
      enviadas++;
    } else {
      console.error('seguimiento: plantilla rechazada', { quote: q.id, error: r.error });
      await db.from('quotes').update({ seguimiento_enviado_at: null }).eq('id', q.id).eq('tenant_id', q.tenant_id);
    }
  }
  return { plantilla: true, revisadas: filas.length, enviadas };
}
