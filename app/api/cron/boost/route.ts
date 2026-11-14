import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { correrHorasFlojas } from '@/lib/boost/motor';

// Boost de clientes → horas flojas (lib/boost/motor.ts): huecos libres en
// las próximas horas se ofrecen con descuento a clientas que suelen
// reservar en esa franja y aceptaron promociones.
//
// Igual que /api/cron/recordatorios: Vercel manda `Authorization: Bearer
// $CRON_SECRET`; sin esa variable se rechaza TODO (falla cerrado), así
// que nadie de fuera puede dispararlo para mandar plantillas cobradas.
// Idempotente: cada clienta se reclama antes de mandar (anti-spam de días).

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    return NextResponse.json(await correrHorasFlojas(createAdminClient()));
  } catch (e) {
    console.error('cron boost falló', { error: e instanceof Error ? e.message : 'unknown' });
    return NextResponse.json({ error: 'falló' }, { status: 500 });
  }
}
