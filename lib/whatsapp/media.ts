// Archivos por la Graph API de WhatsApp: bajar lo que manda el cliente
// (constancia en PDF o foto), mandar documentos (cotización, factura) y
// mandar una plantilla (seguimiento fuera de la ventana de 24 h).
// Nunca lanza: devuelve { ok:false, error } y quien llama decide.

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? 'v21.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
// Claude acepta imágenes de hasta 5 MB y PDF de hasta 32 MB; una constancia pesa < 1 MB.
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

type Ok<T> = { ok: true } & T;
type Falla = { ok: false; error: string };

function token(): string | null {
  return process.env.WHATSAPP_ACCESS_TOKEN || null;
}

async function errorDe(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return String(body?.error?.message ?? `HTTP ${res.status}`);
}

/** Baja un archivo que mandó el cliente: GET /{media-id} da una URL temporal que también pide el token. */
export async function descargarMedia(mediaId: string): Promise<Ok<{ bytes: ArrayBuffer; mime: string }> | Falla> {
  const t = token();
  if (!t) return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN no configurado' };
  try {
    const meta = await fetch(`${GRAPH}/${encodeURIComponent(mediaId)}`, { headers: { Authorization: `Bearer ${t}` } });
    if (!meta.ok) return { ok: false, error: await errorDe(meta) };
    const { url, mime_type, file_size } = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number };
    if (!url) return { ok: false, error: 'Meta no devolvió la URL del archivo' };
    if (file_size && file_size > MAX_MEDIA_BYTES) return { ok: false, error: 'archivo demasiado grande' };
    const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return { ok: false, error: `descarga HTTP ${res.status}` };
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_MEDIA_BYTES) return { ok: false, error: 'archivo demasiado grande' };
    return { ok: true, bytes, mime: (mime_type ?? res.headers.get('content-type') ?? '').split(';')[0] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' };
  }
}

export async function postMensaje(phoneNumberId: string, cuerpo: Record<string, unknown>): Promise<Ok<object> | Falla> {
  const t = token();
  if (!t) return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN no configurado' };
  try {
    const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...cuerpo }),
    });
    return res.ok ? { ok: true } : { ok: false, error: await errorDe(res) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' };
  }
}

export type Documento =
  | { link: string; filename: string; caption?: string }
  | { bytes: ArrayBuffer; mime: string; filename: string; caption?: string };

/**
 * Manda un documento. Con `link`, Meta lo descarga de esa URL pública (el
 * PDF de la cotización ya es público por uuid). Con `bytes` (factura: su
 * PDF/XML solo se baja con la llave del negocio), se sube primero a Meta.
 * Solo dentro de la ventana de 24 h, como cualquier mensaje libre.
 */
export async function enviarDocumento(phoneNumberId: string, to: string, doc: Documento): Promise<{ ok: boolean; error?: string }> {
  let ref: { link: string } | { id: string };
  if ('link' in doc) {
    ref = { link: doc.link };
  } else {
    const t = token();
    if (!t) return { ok: false, error: 'WHATSAPP_ACCESS_TOKEN no configurado' };
    try {
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', doc.mime);
      form.append('file', new Blob([doc.bytes], { type: doc.mime }), doc.filename);
      const res = await fetch(`${GRAPH}/${phoneNumberId}/media`, { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: form });
      if (!res.ok) return { ok: false, error: await errorDe(res) };
      const { id } = (await res.json()) as { id?: string };
      if (!id) return { ok: false, error: 'Meta no devolvió el id del archivo' };
      ref = { id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'error desconocido' };
    }
  }
  return postMensaje(phoneNumberId, { to, type: 'document', document: { ...ref, filename: doc.filename, ...(doc.caption ? { caption: doc.caption.slice(0, 1024) } : {}) } });
}

/** Plantilla aprobada en Meta (lo único que se puede mandar fuera de las 24 h). Variables posicionales {{1}}…{{n}}. */
export async function enviarPlantilla(phoneNumberId: string, to: string, nombre: string, variables: string[]): Promise<{ ok: boolean; error?: string }> {
  return postMensaje(phoneNumberId, {
    to,
    type: 'template',
    template: {
      name: nombre,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? 'es_MX' },
      components: [{ type: 'body', parameters: variables.map((v) => ({ type: 'text', text: v.slice(0, 1000) })) }],
    },
  });
}
