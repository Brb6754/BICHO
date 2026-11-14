// Notas de voz → texto. APAGADO a propósito: el repo no tiene proveedor de
// speech-to-text y elegirlo (costo, privacidad del audio, dónde corre) es
// decisión de Bruno. Mientras devuelva null, el agente contesta "por ahora
// escríbeme tu mensaje" y el audio ni siquiera se descarga.
//
// Para prenderlo: implementar esta función con el proveedor elegido y
// poner TRANSCRIPCION_ACTIVA en true. procesar.ts ya la llama con los bytes
// del audio (OGG/Opus, lo que manda WhatsApp) y usa el texto como si el
// cliente lo hubiera escrito.

export const TRANSCRIPCION_ACTIVA = false;

export async function transcribir(audio: ArrayBuffer, mime: string): Promise<string | null> {
  void audio;
  void mime;
  return null;
}
