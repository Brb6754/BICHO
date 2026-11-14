// Mensaje de texto libre por la Graph API. Solo se puede mandar dentro de
// la ventana de 24 h desde el último mensaje del cliente — fuera de ella
// Meta exige plantilla (eso es lib/whatsapp/send.ts). El agente siempre
// contesta a un mensaje recién llegado, así que siempre está dentro.
//
// `phoneNumberId` es el número por el que entró el mensaje: se contesta
// desde ese mismo, sea el de la plataforma o el propio del negocio.

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? 'v21.0';
const MAX_TEXTO = 4096; // límite de Meta para type=text

export async function enviarTexto(phoneNumberId: string, to: string, texto: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN no configurado' };
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: texto.slice(0, MAX_TEXTO) },
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: String(body?.error?.message ?? `HTTP ${res.status}`) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' };
  }
}
