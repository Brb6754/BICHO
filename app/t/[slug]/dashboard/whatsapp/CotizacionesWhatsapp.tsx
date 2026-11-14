import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatFolio, formatMoney } from '@/lib/quotes/totals';
import { ETIQUETA_FACTURA, estadoCotizaWA, type EstadoCotizaWA } from '@/lib/whatsapp/cotiza/estado';

// Las cotizaciones que armó el agente por WhatsApp, con su estado y, si
// pidieron factura, los datos fiscales que se leyeron. La usan el panel
// real y la demo (/panel/whatsapp, sin acciones).

export type CotizacionWA = {
  id: string;
  folio: number;
  customer_name: string;
  whatsapp_telefono: string | null;
  status: string;
  seguimiento_enviado_at: string | null;
  factura_estado: string | null;
  created_at: string;
  total_cents: number;
  receptor_rfc: string | null;
  receptor_razon_social: string | null;
  receptor_regimen: string | null;
  receptor_codigo_postal: string | null;
  receptor_uso_cfdi: string | null;
};

const ESTADO: Record<EstadoCotizaWA, { texto: string; tone: 'default' | 'muted' | 'danger' | 'inverse' }> = {
  enviada: { texto: 'Enviada', tone: 'muted' },
  seguimiento: { texto: 'Seguimiento enviado', tone: 'muted' },
  aceptada: { texto: 'Aceptada', tone: 'default' },
  facturada: { texto: 'Facturada', tone: 'inverse' },
  rechazada: { texto: 'Rechazada', tone: 'danger' },
  vencida: { texto: 'Vencida', tone: 'muted' },
  borrador: { texto: 'Borrador', tone: 'muted' },
};

function telefonoBonito(t: string | null) {
  if (!t) return '';
  const local = t.slice(-10);
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export function CotizacionesWhatsapp({
  cotizaciones,
  timezone,
  aprobar,
}: {
  cotizaciones: CotizacionWA[];
  timezone: string | null;
  /** Sin esto (demo) el botón de aprobar no se pinta. */
  aprobar?: (id: string) => (fd: FormData) => Promise<void>;
}) {
  if (!cotizaciones.length) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title="Todavía no hay cotizaciones por WhatsApp"
          description="Cuando un cliente pida precio por WhatsApp, aquí verás la cotización que se le mandó y en qué va."
        />
      </Card>
    );
  }
  const fmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: timezone ?? 'America/Mexico_City' });

  return (
    <ul className="space-y-3">
      {cotizaciones.map((q) => {
        const estado = ESTADO[estadoCotizaWA(q)];
        const factura = q.factura_estado && q.factura_estado !== 'timbrada' ? ETIQUETA_FACTURA[q.factura_estado] : null;
        return (
          <li key={q.id}>
            <Card padded={false}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-5">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">
                    {formatFolio(q.folio)} · {q.customer_name}
                  </span>
                  <span className="block text-sm text-muted">
                    {telefonoBonito(q.whatsapp_telefono)} · {fmt.format(new Date(q.created_at))} · {formatMoney(q.total_cents)}
                  </span>
                </span>
                {factura && <Badge tone={q.factura_estado === 'error' ? 'danger' : 'default'}>{factura}</Badge>}
                <Badge tone={estado.tone}>{estado.texto}</Badge>
              </div>
              {q.receptor_rfc && q.factura_estado && (
                <div className="border-t border-border px-5 py-4">
                  <p className="text-xs font-medium text-muted">Datos fiscales que dio el cliente</p>
                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div className="flex gap-2"><dt className="text-muted">RFC</dt><dd className="font-medium text-ink">{q.receptor_rfc}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted">Régimen</dt><dd className="text-ink">{q.receptor_regimen}</dd></div>
                    <div className="flex gap-2 sm:col-span-2"><dt className="text-muted">Razón social</dt><dd className="text-ink">{q.receptor_razon_social}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted">C.P.</dt><dd className="text-ink">{q.receptor_codigo_postal}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted">Uso CFDI</dt><dd className="text-ink">{q.receptor_uso_cfdi}</dd></div>
                  </dl>
                  {aprobar && (q.factura_estado === 'por_aprobar' || q.factura_estado === 'error') && (
                    <div className="mt-4">
                      <ConfirmForm
                        action={aprobar(q.id)}
                        confirmTitle={`Timbrar la factura de ${formatFolio(q.folio)}`}
                        confirmMessage="Se emite un CFDI real con estos datos y se le manda al cliente por WhatsApp (si escribió en las últimas 24 h; si no, descárgala en Facturas)."
                        confirmLabel="Timbrar"
                        triggerVariant="primary"
                      >
                        {q.factura_estado === 'error' ? 'Reintentar timbrado' : 'Aprobar y timbrar'}
                      </ConfirmForm>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
