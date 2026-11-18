import type { SupabaseClient } from '@supabase/supabase-js';
import { appointmentWhen } from '@/lib/dates/tenantTime';
import { esServicio } from '@/lib/meetings/kinds';
import { faltaMigracion } from '@/lib/anticipos/config';
import { liberarApartadosVencidos, type ApartadoLiberado } from '@/lib/anticipos/liberar';
import { MINIMO_DESDE_RESERVA_HORAS } from '@/lib/regresan/recordatorios';
import { primerNombre } from '@/lib/regresan/mensajes';
import { enviarInteractivo, enviarPlantillaConBotones, resumenSaliente, type Saliente } from '@/lib/whatsapp/interactivo';
import { log, type WhatsAppKind } from '@/lib/whatsapp/send';
import { toE164Mx } from '@/lib/whatsapp/phone';
import { armarId } from './flujoCita';
import { agenteDisponible, type TenantAgente } from './ruteo';
import type { Turno } from './agente';

// Lo que el bot de citas manda SIN que el cliente haya escrito: el aviso
// de apartado vencido, los recordatorios (24 h y 2 h) y el seguimiento.
// Fuera de la ventana de 24 h Meta solo deja plantillas, así que
// recordatorios y seguimiento son SIEMPRE plantilla. El aviso de vencido
// casi siempre cae dentro (el cliente apartó por el chat hace minutos):
// primero botón interactivo y, si Meta lo rechaza, la plantilla.
// Plantilla sin nombre en el entorno = `skipped` con motivo (como send.ts).
// Nunca lanza.

export type EnvioDeps = {
  interactivo?: typeof enviarInteractivo;
  plantilla?: typeof enviarPlantillaConBotones;
};

export const PLANTILLAS = {
  recordatorio: 'WHATSAPP_TEMPLATE_RECORDATORIO',
  seguimiento: 'WHATSAPP_TEMPLATE_SEGUIMIENTO',
  vencido: 'WHATSAPP_TEMPLATE_APARTADO_VENCIDO',
} as const;

type TenantAviso = Pick<TenantAgente, 'id' | 'name' | 'timezone' | 'whatsapp_phone_number_id'>;
type Estado = 'sent' | 'failed' | 'skipped';

/**
 * Deja el aviso en la conversación (una por negocio + teléfono). Además de
 * que el panel lo vea, es lo que hace que la respuesta a un botón llegue al
 * negocio correcto en el número compartido (ruteo por conversación previa).
 */
async function registrarEnConversacion(db: SupabaseClient, tenantId: string, to: string, phoneNumberId: string, contenido: string) {
  try {
    // Meta puede mandar el "from" de un celular MX como 52… o 521…: se buscan los dos.
    const variantes = to.length === 12 && to.startsWith('52') ? [to, `521${to.slice(2)}`] : [to];
    const { data } = await db.from('whatsapp_conversaciones').select('id, historial').eq('tenant_id', tenantId).in('telefono', variantes).limit(1).maybeSingle();
    const turno: Turno = { role: 'assistant', content: contenido, at: new Date().toISOString() };
    const ahora = new Date().toISOString();
    if (data) {
      const h = Array.isArray(data.historial) ? (data.historial as Turno[]) : [];
      await db
        .from('whatsapp_conversaciones')
        .update({ historial: [...h, turno].slice(-30), last_message_at: ahora, phone_number_id: phoneNumberId })
        .eq('id', data.id)
        .eq('tenant_id', tenantId);
    } else {
      await db.from('whatsapp_conversaciones').insert({ tenant_id: tenantId, telefono: to, phone_number_id: phoneNumberId, historial: [turno], last_message_at: ahora });
    }
  } catch (e) {
    console.error('whatsapp aviso: conversación no registrada', { error: e instanceof Error ? e.name : 'unknown' });
  }
}

async function avisar(
  db: SupabaseClient,
  t: TenantAviso,
  telefono: string | null,
  aviso: {
    kind: WhatsAppKind;
    bookingId: string;
    /** Dentro de la ventana de 24 h; si falla, se cae a la plantilla. */
    interactivo?: Exclude<Saliente, { tipo: 'texto' }>;
    plantilla: { env: string; variables: string[]; payloads: string[]; resumen: string };
  },
  deps: EnvioDeps
): Promise<Estado> {
  const to = toE164Mx(telefono ?? '');
  const phoneNumberId = t.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const registro = (status: Estado, error?: string) =>
    log({ tenantId: t.id, bookingId: aviso.bookingId, kind: aviso.kind, toPhone: to ?? telefono ?? '', status, error: error?.slice(0, 500) ?? null }, db);
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !phoneNumberId) {
    await registro('skipped', 'WhatsApp no configurado en la plataforma');
    return 'skipped';
  }
  if (!to) {
    await registro('skipped', 'Teléfono no utilizable');
    return 'skipped';
  }

  if (aviso.interactivo) {
    const r = await (deps.interactivo ?? enviarInteractivo)(phoneNumberId, to, aviso.interactivo);
    if (r.ok) {
      await registro('sent');
      await registrarEnConversacion(db, t.id, to, phoneNumberId, resumenSaliente(aviso.interactivo));
      return 'sent';
    }
  }

  const nombre = process.env[aviso.plantilla.env];
  if (!nombre) {
    await registro('skipped', `Falta la plantilla ${aviso.plantilla.env}`);
    return 'skipped';
  }
  const r = await (deps.plantilla ?? enviarPlantillaConBotones)(phoneNumberId, to, nombre, aviso.plantilla.variables, aviso.plantilla.payloads);
  await registro(r.ok ? 'sent' : 'failed', r.error);
  if (r.ok) await registrarEnConversacion(db, t.id, to, phoneNumberId, aviso.plantilla.resumen);
  return r.ok ? 'sent' : 'failed';
}

/** "Tu apartado venció" con botón para buscar otro horario. */
export async function avisarLiberado(db: SupabaseClient, t: TenantAviso, l: ApartadoLiberado, deps: EnvioDeps = {}): Promise<Estado> {
  const nombre = primerNombre(l.nombre ?? '') || 'Hola';
  const servicio = l.servicio ?? 'tu cita';
  const cuando = appointmentWhen(l.startsAt, t.timezone);
  const cuerpo = `${nombre}, el horario que te apartamos en ${t.name} (${servicio}, ${cuando}) se liberó porque no se recibió el anticipo a tiempo. ¿Quieres buscar otro?`;
  return avisar(
    db,
    t,
    l.telefono,
    {
      kind: 'cancelled',
      bookingId: l.id,
      interactivo: { tipo: 'botones', texto: cuerpo, botones: [{ id: armarId({ a: 'c' }), titulo: 'Buscar otro horario' }] },
      plantilla: { env: PLANTILLAS.vencido, variables: [nombre, t.name, servicio, cuando], payloads: [armarId({ a: 'c' })], resumen: cuerpo },
    },
    deps
  );
}

/** Barrido perezoso de UN negocio (webhook): libera vencidos y avisa a cada cliente. */
export async function barrerYAvisar(db: SupabaseClient, t: TenantAviso, now: Date = new Date(), deps: EnvioDeps = {}): Promise<number> {
  try {
    const liberados = await liberarApartadosVencidos(db, now, t.id);
    for (const l of liberados) await avisarLiberado(db, t, l, deps);
    return liberados.length;
  } catch (e) {
    console.error('whatsapp barrido falló', { error: e instanceof Error ? e.name : 'unknown' });
    return 0;
  }
}

// ── Cron ────────────────────────────────────────────────────────────

const HORA = 3_600_000;

type FilaCita = {
  id: string;
  tenant_id: string;
  starts_at: string;
  ends_at?: string;
  created_at?: string | null;
  status: string;
  kind?: string | null;
  deposit_status?: string | null;
  reminder_sent_at?: string | null;
  reminder_24h_sent_at?: string | null;
  reminder_2h_sent_at?: string | null;
  followup_sent_at?: string | null;
  customers?: { name?: string | null; phone?: string | null } | null;
  service_types?: { name?: string | null } | null;
  tenants?: TenantAgente | null;
};

const SELECT_CITA = '*, customers(name, phone), service_types(name), tenants!inner(*)';

/** Reclama la cita (pone la bandera) ANTES de mandar: dos corridas encimadas no mandan dos mensajes cobrados. */
async function reclamar(db: SupabaseClient, c: FilaCita, flag: string, marcas: Record<string, string>): Promise<'si' | 'no' | 'sin_migracion'> {
  const { data, error } = await db.from('bookings').update(marcas).eq('id', c.id).eq('tenant_id', c.tenant_id).is(flag, null).select('id');
  if (error) return faltaMigracion(error) ? 'sin_migracion' : 'no';
  return data?.length ? 'si' : 'no';
}

export type ResumenCron = {
  ok: boolean;
  reason?: string;
  liberados: number;
  recordatorios24h: number;
  recordatorios2h: number;
  seguimientos: number;
};

/**
 * Idempotente. (a) libera apartados vencidos y avisa; (b) recordatorio a
 * 24 h y a 2 h con botones Confirmo/Reagendar; (c) seguimiento después de
 * la cita. Solo negocios con la recepcionista activa (plan Pro + switch).
 */
export async function correrCronCitas(db: SupabaseClient, now: Date = new Date(), deps: EnvioDeps = {}): Promise<ResumenCron> {
  const resumen: ResumenCron = { ok: true, liberados: 0, recordatorios24h: 0, recordatorios2h: 0, seguimientos: 0 };
  const nowIso = now.toISOString();

  // (a) Vencidos de todos los negocios.
  const liberados = await liberarApartadosVencidos(db, now);
  resumen.liberados = liberados.length;
  if (liberados.length) {
    const { data: ts } = await db.from('tenants').select('*').in('id', [...new Set(liberados.map((l) => l.tenantId))]);
    const porId = new Map(((ts ?? []) as TenantAgente[]).map((t) => [t.id, t]));
    for (const l of liberados) {
      const t = porId.get(l.tenantId);
      if (t && agenteDisponible(t)) await avisarLiberado(db, t, l, deps);
    }
  }

  // (b) Recordatorios: todo lo confirmado de aquí a 24 h.
  const { data: proximas, error } = await db
    .from('bookings')
    .select(SELECT_CITA)
    .eq('status', 'confirmed')
    .gt('starts_at', nowIso)
    .lt('starts_at', new Date(now.getTime() + 24 * HORA).toISOString())
    .order('starts_at')
    .limit(500);
  if (error) return { ...resumen, ok: false, reason: 'La consulta de citas falló.' };

  for (const c of (proximas ?? []) as FilaCita[]) {
    const t = c.tenants;
    // Un apartado sin pagar no se recuerda: o paga, o se libera.
    if (!t || !agenteDisponible(t) || !esServicio(c) || c.deposit_status === 'pending') continue;
    if (c.created_at && now.getTime() - new Date(c.created_at).getTime() < MINIMO_DESDE_RESERVA_HORAS * HORA) continue;

    const en2h = new Date(c.starts_at).getTime() <= now.getTime() + 2 * HORA;
    let flag: 'reminder_2h_sent_at' | 'reminder_24h_sent_at';
    const marcas: Record<string, string> = {};
    if (en2h && !c.reminder_2h_sent_at) {
      flag = 'reminder_2h_sent_at';
      marcas.reminder_2h_sent_at = nowIso;
      if (!c.reminder_24h_sent_at) marcas.reminder_24h_sent_at = nowIso;
    } else if (!en2h && !c.reminder_24h_sent_at && !c.reminder_sent_at) {
      // reminder_sent_at = ya le llegó el de "Clientas que regresan" (db/046): no se le manda otro.
      flag = 'reminder_24h_sent_at';
      marcas.reminder_24h_sent_at = nowIso;
    } else continue;
    // Y al revés: que el cron de "Clientas que regresan" no mande el suyo encima.
    if ('reminder_sent_at' in c && !c.reminder_sent_at) marcas.reminder_sent_at = nowIso;

    const r = await reclamar(db, c, flag, marcas);
    if (r === 'sin_migracion') return { ...resumen, ok: false, reason: 'Falta correr db/061_anticipos.sql.' };
    if (r === 'no') continue;

    const nombre = primerNombre(c.customers?.name ?? '') || 'Hola';
    const servicio = c.service_types?.name ?? 'tu cita';
    const cuando = appointmentWhen(c.starts_at, t.timezone);
    const estado = await avisar(
      db,
      t,
      c.customers?.phone ?? null,
      {
        kind: 'reminder',
        bookingId: c.id,
        plantilla: {
          env: PLANTILLAS.recordatorio,
          variables: [nombre, t.name, servicio, cuando],
          payloads: [armarId({ a: 'ok', b: c.id }), armarId({ a: 'rg', b: c.id })],
          resumen: `Recordatorio: ${servicio}, ${cuando}.\nOpciones: Confirmo · Reagendar`,
        },
      },
      deps
    );
    if (estado === 'sent') resumen[flag === 'reminder_2h_sent_at' ? 'recordatorios2h' : 'recordatorios24h'] += 1;
  }

  // (c) Seguimiento: citas que terminaron hace entre 1 h y 3 días.
  const { data: pasadas } = await db
    .from('bookings')
    .select(SELECT_CITA)
    .in('status', ['confirmed', 'completed'])
    .lt('ends_at', new Date(now.getTime() - HORA).toISOString())
    .gte('ends_at', new Date(now.getTime() - 72 * HORA).toISOString())
    .limit(500);
  const vistos = new Set<string>();
  for (const c of (pasadas ?? []) as FilaCita[]) {
    const t = c.tenants;
    if (!t || !agenteDisponible(t) || !esServicio(c) || c.followup_sent_at || c.deposit_status === 'pending') continue;
    const r = await reclamar(db, c, 'followup_sent_at', { followup_sent_at: nowIso });
    if (r === 'sin_migracion') return { ...resumen, ok: false, reason: 'Falta correr db/061_anticipos.sql.' };
    if (r === 'no') continue;
    const tel = toE164Mx(c.customers?.phone ?? '');
    // Una sola invitación por clienta: aunque haya tenido dos citas, o ya
    // tenga la siguiente agendada (entonces no hace falta invitarla).
    if (!tel || vistos.has(`${t.id}:${tel}`)) continue;
    vistos.add(`${t.id}:${tel}`);
    if (await yaAtendida(db, t.id, tel, c.id, now)) continue;

    const nombre = primerNombre(c.customers?.name ?? '') || 'Hola';
    const servicio = c.service_types?.name ?? 'tu cita';
    const estado = await avisar(
      db,
      t,
      c.customers?.phone ?? null,
      {
        // whatsapp_messages.kind no tiene 'followup' (db/021): cuenta como recordatorio.
        kind: 'reminder',
        bookingId: c.id,
        plantilla: {
          env: PLANTILLAS.seguimiento,
          variables: [nombre, t.name, servicio],
          payloads: [armarId({ a: 'c' })],
          resumen: `Seguimiento después de ${servicio}.\nOpciones: Agendar otra`,
        },
      },
      deps
    );
    if (estado === 'sent') resumen.seguimientos += 1;
  }

  return resumen;
}

/** ¿Ya tiene otra cita futura, o ya recibió un seguimiento en los últimos 30 días? */
async function yaAtendida(db: SupabaseClient, tenantId: string, tel: string, bookingId: string, now: Date): Promise<boolean> {
  // shortcut: compara teléfonos en código (customers.phone es lo que tecleó la persona); con miles de citas por negocio, mover a SQL.
  const [{ data: futuras }, { data: seguidas }] = await Promise.all([
    db.from('bookings').select('id, customers(phone)').eq('tenant_id', tenantId).eq('status', 'confirmed').gt('starts_at', now.toISOString()).limit(500),
    db.from('bookings').select('id, customers(phone)').eq('tenant_id', tenantId).gte('followup_sent_at', new Date(now.getTime() - 30 * 24 * HORA).toISOString()).limit(500),
  ]);
  type Fila = { id: string; customers?: { phone?: string | null } | null };
  const filas = [...(futuras ?? []), ...(seguidas ?? [])] as unknown as Fila[];
  return filas.some((f) => f.id !== bookingId && toE164Mx(f.customers?.phone ?? '') === tel);
}
