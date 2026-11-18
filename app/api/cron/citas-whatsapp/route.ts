import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { correrCronCitas } from '@/lib/whatsapp/agente/avisos';

// Bot de citas por WhatsApp: libera apartados vencidos y avisa,
// recordatorios a 24 h y 2 h, y seguimiento después de la cita.
// Lógica en lib/whatsapp/agente/avisos.ts (idempotente: cada envío se
// reclama con su bandera antes de mandar).
//
// Vercel Hobby solo deja crons diarios (vercel.json). Para que el de 2 h
// salga a tiempo hay que llamarlo cada 15 min desde un cron externo con
// el mismo header — ver WHATSAPP_SETUP.md, sección 8.
//
// Mismo candado que /api/cron/recordatorios: sin CRON_SECRET rechaza todo.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const resumen = await correrCronCitas(createAdminClient(), new Date());
  if (!resumen.ok) console.error('cron citas-whatsapp', resumen.reason);
  return NextResponse.json(resumen);
}
