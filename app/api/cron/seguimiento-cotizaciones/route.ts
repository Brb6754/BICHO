import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { correrSeguimiento } from '@/lib/whatsapp/cotiza/seguimiento';

// Seguimiento de cotizaciones de WhatsApp sin respuesta (lib/whatsapp/cotiza/seguimiento.ts).
//
// Lo llama Vercel Cron (vercel.json) una vez al día. Igual que
// /api/cron/recordatorios: Vercel manda `Authorization: Bearer
// $CRON_SECRET`; sin esa variable se rechaza TODO (falla cerrado), así
// que nadie de fuera puede dispararlo para mandar plantillas cobradas.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json(await correrSeguimiento(createAdminClient()));
  } catch (e) {
    console.error('seguimiento cotizaciones falló', { error: e instanceof Error ? e.message : 'unknown' });
    return NextResponse.json({ error: 'falló' }, { status: 500 });
  }
}
