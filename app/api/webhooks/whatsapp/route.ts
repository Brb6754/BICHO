import { after, NextResponse } from 'next/server';
import { firmaValida, igualSeguro } from '@/lib/whatsapp/firma';
import { extraerMensajes, procesarMensaje } from '@/lib/whatsapp/agente/procesar';

// Webhook de WhatsApp Cloud API (recepcionista IA). Ver WHATSAPP_SETUP.md.

export const dynamic = 'force-dynamic';

// Verificación de Meta al dar de alta el webhook.
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('hub.mode') === 'subscribe' && igualSeguro(url.searchParams.get('hub.verify_token'), process.env.WHATSAPP_VERIFY_TOKEN)) {
    return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// @pagokit:signature-verified (firmaValida = HMAC-SHA256 + timingSafeEqual, lib/whatsapp/firma.ts)
export async function POST(request: Request) {
  // El body CRUDO: la firma se calcula sobre estos bytes exactos, y nada
  // se parsea antes de verificarla.
  const raw = await request.text();
  if (!firmaValida(raw, request.headers.get('x-hub-signature-256'), process.env.WHATSAPP_APP_SECRET)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // 200 de inmediato; el agente (que tarda segundos) corre después. Meta
  // reintenta si no recibe 200 rápido, y cada reintento sería un turno
  // de Claude de más (el dedup lo frenaría, pero mejor no provocarlo).
  const mensajes = extraerMensajes(payload);
  if (mensajes.length) {
    after(async () => {
      for (const m of mensajes) {
        await procesarMensaje(m).catch((e) => console.error('whatsapp procesar falló', { id: m.id, error: e instanceof Error ? e.name : 'unknown' }));
      }
    });
  }
  return NextResponse.json({ ok: true });
}
