'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { planPermiteAgente } from '@/lib/whatsapp/agente/ruteo';
import { enviarTexto } from '@/lib/whatsapp/texto';
import { COLUMNAS_QUOTE_FACTURA, timbrarYEnviar, type QuoteFactura } from '@/lib/whatsapp/cotiza/facturar';

// Acciones del panel de la recepcionista. Cada una prueba membresía
// (requireTenantStaff) y filtra por tenant_id: un id de conversación de
// otro negocio no matchea nada.

const VENTANA_MS = 24 * 60 * 60 * 1000;
const FALTA = 'Esto todavía no está activo en tu cuenta. Escríbenos y lo activamos.';

export async function cambiarAgente(slug: string, prender: boolean) {
  const { tenantId, role } = await requireTenantStaff(slug);
  if (role !== 'owner' && role !== 'admin') throw new Error('Solo el dueño o un administrador puede cambiar esto.');
  const db = createAdminClient();
  if (prender) {
    const { data: t } = await db.from('tenants').select('plan').eq('id', tenantId).single();
    if (!planPermiteAgente(t?.plan)) throw new Error('La recepcionista de WhatsApp viene en el plan Pro.');
  }
  const { error } = await db.from('tenants').update({ agente_whatsapp_enabled: prender }).eq('id', tenantId);
  // 42703/PGRST204 = falta db/056_whatsapp_agente.sql.
  if (error) throw new Error(error.code === '42703' || error.code === 'PGRST204' ? FALTA : 'No se pudo guardar. Inténtalo otra vez.');
  revalidatePath(`/t/${slug}/dashboard/whatsapp`);
}

export async function cambiarEstado(slug: string, conversacionId: string, estado: 'ia' | 'humano') {
  const { tenantId } = await requireTenantStaff(slug);
  const { error } = await createAdminClient()
    .from('whatsapp_conversaciones')
    .update({ estado })
    .eq('id', conversacionId)
    .eq('tenant_id', tenantId);
  if (error) throw new Error('No se pudo cambiar la plática. Inténtalo otra vez.');
  revalidatePath(`/t/${slug}/dashboard/whatsapp`);
}

// Contestar a mano una conversación tomada. Texto libre: solo dentro de
// las 24 h desde el último mensaje del cliente (regla de Meta).
export async function responder(slug: string, conversacionId: string, formData: FormData) {
  const texto = String(formData.get('texto') ?? '').trim().slice(0, 2000);
  if (!texto) return;
  const { tenantId } = await requireTenantStaff(slug);
  const db = createAdminClient();
  const { data: c } = await db
    .from('whatsapp_conversaciones')
    .select('id, telefono, phone_number_id, historial')
    .eq('id', conversacionId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!c) throw new Error('Esa plática ya no existe.');

  const historial = (Array.isArray(c.historial) ? c.historial : []) as { role: string; content: string; at?: string }[];
  const ultimoCliente = [...historial].reverse().find((t) => t.role === 'user')?.at;
  if (!ultimoCliente || Date.now() - new Date(ultimoCliente).getTime() > VENTANA_MS) {
    throw new Error('Pasaron más de 24 horas desde el último mensaje de esta persona y WhatsApp ya no deja escribirle desde aquí. Escríbele desde tu teléfono.');
  }

  const envio = await enviarTexto(c.phone_number_id, c.telefono, texto);
  if (!envio.ok) throw new Error('WhatsApp no dejó mandar el mensaje. Inténtalo otra vez.');
  await db
    .from('whatsapp_conversaciones')
    .update({ historial: [...historial, { role: 'assistant', content: texto, at: new Date().toISOString(), humano: true }].slice(-30) })
    .eq('id', c.id)
    .eq('tenant_id', tenantId);
  revalidatePath(`/t/${slug}/dashboard/whatsapp`);
}

// ── Cotiza por WhatsApp (db/057) ─────────────────────────────────────

const faltaColumna = (code?: string) => code === '42703' || code === 'PGRST204';

/** Prender el add-on: dueño/admin, plan Pro y cotizaciones prendidas. El número propio lo revisa el webhook. */
export async function cambiarCotiza(slug: string, prender: boolean) {
  const { tenantId, role } = await requireTenantStaff(slug);
  if (role !== 'owner' && role !== 'admin') throw new Error('Solo el dueño o un administrador puede cambiar esto.');
  const db = createAdminClient();
  if (prender) {
    const { data: t } = await db.from('tenants').select('*').eq('id', tenantId).single();
    if (!planPermiteAgente(t?.plan)) throw new Error('Cotiza por WhatsApp va sobre el plan Pro.');
    if (t?.quotes_enabled !== true) throw new Error('Primero hay que prender Cotizaciones en tu panel. Escríbenos si no la ves.');
  }
  const { error } = await db.from('tenants').update({ cotiza_whatsapp_enabled: prender }).eq('id', tenantId);
  if (error) throw new Error(faltaColumna(error.code) ? FALTA : 'No se pudo guardar. Inténtalo otra vez.'); // falta db/057
  revalidatePath(`/t/${slug}/dashboard/whatsapp`);
}

export async function cambiarConfirmarFacturas(slug: string, valor: boolean) {
  const { tenantId, role } = await requireTenantStaff(slug);
  if (role !== 'owner' && role !== 'admin') throw new Error('Solo el dueño o un administrador puede cambiar esto.');
  const { error } = await createAdminClient().from('tenants').update({ cotiza_confirmar_facturas: valor }).eq('id', tenantId);
  if (error) throw new Error(faltaColumna(error.code) ? FALTA : 'No se pudo guardar. Inténtalo otra vez.'); // falta db/057
  revalidatePath(`/t/${slug}/dashboard/whatsapp`);
}

/**
 * El dueño aprueba una factura que el cliente ya confirmó por WhatsApp:
 * se timbra y, si el cliente escribió en las últimas 24 h, se le mandan
 * PDF y XML. Mismo tope de timbres y misma protección contra doble CFDI
 * que el panel de Facturas (lib/billing/timbrar.ts).
 */
export async function aprobarFactura(slug: string, quoteId: string) {
  const { tenantId, timezone } = await requireTenantStaff(slug);
  const db = createAdminClient();
  const { data: t } = await db.from('tenants').select('facturacion_enabled').eq('id', tenantId).single();
  if (t?.facturacion_enabled !== true) throw new Error('Para hacer facturas necesitas tener Facturas prendidas en tu plan.');

  const { data: quote } = await db
    .from('quotes')
    .select(COLUMNAS_QUOTE_FACTURA)
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)
    .eq('origen', 'whatsapp')
    .in('factura_estado', ['por_aprobar', 'error'])
    .maybeSingle();
  if (!quote) throw new Error('Esa factura ya se hizo o ya no está pendiente.');

  // Solo dentro de la ventana de 24 h se pueden mandar archivos.
  const { data: conv } = await db
    .from('whatsapp_conversaciones')
    .select('phone_number_id, historial')
    .eq('tenant_id', tenantId)
    .eq('telefono', quote.whatsapp_telefono ?? '')
    .maybeSingle();
  const historial = (Array.isArray(conv?.historial) ? conv.historial : []) as { role: string; at?: string }[];
  const ultimoCliente = [...historial].reverse().find((h) => h.role === 'user')?.at;
  const dentro = !!ultimoCliente && Date.now() - new Date(ultimoCliente).getTime() < VENTANA_MS;

  const r = await timbrarYEnviar(db, { tenantId, timezone, quote: quote as QuoteFactura, phoneNumberId: dentro ? (conv?.phone_number_id ?? null) : null });
  revalidatePath(`/t/${slug}/dashboard/whatsapp`);
  revalidatePath(`/t/${slug}/dashboard/facturas`);
  if (!r.ok) throw new Error(r.error);
}
