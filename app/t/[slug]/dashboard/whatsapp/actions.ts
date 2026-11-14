'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { planPermiteAgente } from '@/lib/whatsapp/agente/ruteo';
import { enviarTexto } from '@/lib/whatsapp/texto';

// Acciones del panel de la recepcionista. Cada una prueba membresía
// (requireTenantStaff) y filtra por tenant_id: un id de conversación de
// otro negocio no matchea nada.

const VENTANA_MS = 24 * 60 * 60 * 1000;

export async function cambiarAgente(slug: string, prender: boolean) {
  const { tenantId, role } = await requireTenantStaff(slug);
  if (role !== 'owner' && role !== 'admin') throw new Error('Solo el dueño o un administrador puede cambiar esto.');
  const db = createAdminClient();
  if (prender) {
    const { data: t } = await db.from('tenants').select('plan').eq('id', tenantId).single();
    if (!planPermiteAgente(t?.plan)) throw new Error('La recepcionista de WhatsApp viene en el plan Pro.');
  }
  const { error } = await db.from('tenants').update({ agente_whatsapp_enabled: prender }).eq('id', tenantId);
  if (error) throw new Error(error.code === '42703' || error.code === 'PGRST204' ? 'Falta correr db/056_whatsapp_agente.sql.' : 'No se pudo guardar.');
  revalidatePath(`/t/${slug}/dashboard/whatsapp`);
}

export async function cambiarEstado(slug: string, conversacionId: string, estado: 'ia' | 'humano') {
  const { tenantId } = await requireTenantStaff(slug);
  const { error } = await createAdminClient()
    .from('whatsapp_conversaciones')
    .update({ estado })
    .eq('id', conversacionId)
    .eq('tenant_id', tenantId);
  if (error) throw new Error('No se pudo cambiar la conversación.');
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
  if (!c) throw new Error('Conversación no encontrada.');

  const historial = (Array.isArray(c.historial) ? c.historial : []) as { role: string; content: string; at?: string }[];
  const ultimoCliente = [...historial].reverse().find((t) => t.role === 'user')?.at;
  if (!ultimoCliente || Date.now() - new Date(ultimoCliente).getTime() > VENTANA_MS) {
    throw new Error('Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp solo permite plantillas.');
  }

  const envio = await enviarTexto(c.phone_number_id, c.telefono, texto);
  if (!envio.ok) throw new Error('WhatsApp no aceptó el mensaje.');
  await db
    .from('whatsapp_conversaciones')
    .update({ historial: [...historial, { role: 'assistant', content: texto, at: new Date().toISOString(), humano: true }].slice(-30) })
    .eq('id', c.id)
    .eq('tenant_id', tenantId);
  revalidatePath(`/t/${slug}/dashboard/whatsapp`);
}
