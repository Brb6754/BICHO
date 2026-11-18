import { postMensaje } from './media';

// Mensajes interactivos de WhatsApp Cloud API: listas (hasta 10 opciones)
// y botones (hasta 3). Como el texto libre, solo dentro de la ventana de
// 24 h; fuera de ella, plantilla (`enviarPlantillaConBotones`).
// Meta rechaza el mensaje completo si una sola etiqueta se pasa del
// límite, así que aquí se recorta todo antes de mandar.
// Nunca lanza: { ok:false, error } y quien llama decide.

export const LIMITES = {
  cuerpo: 1024,
  botonLista: 20,
  filas: 10,
  tituloFila: 24,
  descripcionFila: 72,
  idFila: 200,
  botones: 3,
  tituloBoton: 20,
  idBoton: 256,
} as const;

export type Opcion = { id: string; titulo: string; descripcion?: string };

export type Saliente =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'lista'; texto: string; boton: string; filas: Opcion[] }
  | { tipo: 'botones'; texto: string; botones: Opcion[] };

export function recortar(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** El `interactive` del body de Graph para una lista o unos botones. */
export function cuerpoInteractivo(s: Exclude<Saliente, { tipo: 'texto' }>): Record<string, unknown> {
  const body = { text: recortar(s.texto, LIMITES.cuerpo) };
  if (s.tipo === 'lista') {
    return {
      type: 'list',
      body,
      action: {
        button: recortar(s.boton, LIMITES.botonLista),
        sections: [
          {
            rows: s.filas.slice(0, LIMITES.filas).map((f) => ({
              // Un id recortado sería otra opción: los ids los arma flujoCita y caben; si no, se descarta la fila.
              id: f.id,
              title: recortar(f.titulo, LIMITES.tituloFila),
              ...(f.descripcion ? { description: recortar(f.descripcion, LIMITES.descripcionFila) } : {}),
            })).filter((f) => f.id.length <= LIMITES.idFila),
          },
        ],
      },
    };
  }
  return {
    type: 'button',
    body,
    action: {
      buttons: s.botones
        .slice(0, LIMITES.botones)
        .filter((b) => b.id.length <= LIMITES.idBoton)
        .map((b) => ({ type: 'reply', reply: { id: b.id, title: recortar(b.titulo, LIMITES.tituloBoton) } })),
    },
  };
}

/** Lista o botones. El texto plano va por enviarTexto (texto.ts). */
export async function enviarInteractivo(
  phoneNumberId: string,
  to: string,
  s: Exclude<Saliente, { tipo: 'texto' }>
): Promise<{ ok: boolean; error?: string }> {
  return postMensaje(phoneNumberId, { recipient_type: 'individual', to, type: 'interactive', interactive: cuerpoInteractivo(s) });
}

/**
 * Plantilla aprobada con botones de respuesta rápida. El texto de cada
 * botón vive en Meta; aquí solo se pone su `payload` (por índice), que
 * vuelve en el webhook como `button.payload`.
 */
export async function enviarPlantillaConBotones(
  phoneNumberId: string,
  to: string,
  nombre: string,
  variables: string[],
  payloads: string[]
): Promise<{ ok: boolean; error?: string }> {
  return postMensaje(phoneNumberId, {
    to,
    type: 'template',
    template: {
      name: nombre,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? 'es_MX' },
      components: [
        { type: 'body', parameters: variables.map((v) => ({ type: 'text', text: v.slice(0, 1000) })) },
        ...payloads.map((p, i) => ({ type: 'button', sub_type: 'quick_reply', index: String(i), parameters: [{ type: 'payload', payload: p }] })),
      ],
    },
  });
}

/** Cómo se guarda un mensaje del bot en el historial (lo que ve el modelo y el panel). */
export function resumenSaliente(s: Saliente): string {
  if (s.tipo === 'texto') return s.texto;
  const ops = s.tipo === 'lista' ? s.filas : s.botones;
  return `${s.texto}\nOpciones: ${ops.map((o) => o.titulo).join(' · ')}`;
}
