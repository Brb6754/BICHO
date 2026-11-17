// En qué va una cotización pedida por WhatsApp, como la lee el dueño en
// el panel. Pura: la usan el panel real y la demo.

export type EstadoCotizaWA = 'enviada' | 'seguimiento' | 'aceptada' | 'facturada' | 'rechazada' | 'vencida' | 'borrador';

export function estadoCotizaWA(q: { status: string; seguimiento_enviado_at?: string | null; factura_estado?: string | null }): EstadoCotizaWA {
  if (q.factura_estado === 'timbrada') return 'facturada';
  if (q.status === 'accepted') return 'aceptada';
  if (q.status === 'declined') return 'rechazada';
  if (q.status === 'expired') return 'vencida';
  if (q.status === 'draft') return 'borrador';
  return q.seguimiento_enviado_at ? 'seguimiento' : 'enviada';
}

export const ETIQUETA_FACTURA: Record<string, string> = {
  esperando_datos: 'Esperando constancia',
  por_confirmar: 'Cliente revisando sus datos',
  por_aprobar: 'Por aprobar',
  error: 'No se pudo hacer la factura',
};
