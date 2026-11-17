import { FileText } from 'lucide-react';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatFolio, formatMoney } from '@/lib/quotes/totals';
import { ETIQUETA_FACTURA, estadoCotizaWA, type EstadoCotizaWA } from '@/lib/whatsapp/cotiza/estado';

// Las etiquetas de la factura, sin jerga: "timbrar" no se dice en el panel.
const FACTURA: Record<string, string> = { ...ETIQUETA_FACTURA, error: 'No se pudo hacer la factura' };

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
  facturada: { texto: 'Con factura', tone: 'inverse' },
  rechazada: { texto: 'Rechazada', tone: 'danger' },
  vencida: { texto: 'Vencida', tone: 'muted' },
  borrador: { texto: 'Sin mandar', tone: 'muted' },
};

// Claves del SAT más comunes en palabras; una clave rara se muestra tal cual.
const REGIMEN: Record<string, string> = {
  '601': 'Empresa (persona moral)',
  '603': 'Asociación sin fines de lucro',
  '605': 'Asalariado',
  '606': 'Renta de inmuebles',
  '612': 'Actividad empresarial o profesional',
  '616': 'Sin obligaciones fiscales',
  '621': 'Incorporación fiscal',
  '626': 'RESICO',
};
const USO: Record<string, string> = {
  G01: 'Compra de mercancía',
  G03: 'Gastos en general',
  D01: 'Gastos médicos',
  S01: 'Sin efectos fiscales',
  CP01: 'Pagos',
};
function conNombre(clave: string | null, mapa: Record<string, string>) {
  if (!clave) return '';
  return mapa[clave] ? `${mapa[clave]} (${clave})` : clave;
}

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
      <Card padded={false}>
        <EmptyState
          icon={FileText}
          title="Todavía no hay cotizaciones por WhatsApp"
          description="Cuando un cliente pida precio por WhatsApp, aquí ves la cotización que se le mandó y en qué quedó."
          why="Sabes quién está por decidirse y a quién darle seguimiento."
        />
      </Card>
    );
  }
  const fmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: timezone ?? 'America/Mexico_City' });

  return (
    <ul className="space-y-3">
      {cotizaciones.map((q) => {
        const estado = ESTADO[estadoCotizaWA(q)];
        const factura = q.factura_estado && q.factura_estado !== 'timbrada' ? FACTURA[q.factura_estado] : null;
        return (
          <li key={q.id}>
            <Card padded={false}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-4 sm:px-5">
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
                <div className="border-t border-border px-4 py-4 sm:px-5">
                  <p className="flex items-center gap-1 text-[13px] font-medium text-muted">
                    Datos para la factura que mandó el cliente
                    <HelpTip title="¿Qué son estos datos?">
                      Los lee bicho de la constancia que el cliente mandó por WhatsApp. El RFC es su clave del SAT; el tipo
                      de contribuyente y «para qué la usa» son claves que pide el SAT. Revísalos antes de aprobar.
                    </HelpTip>
                  </p>
                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div className="flex gap-2"><dt className="text-muted">RFC</dt><dd className="font-medium text-ink">{q.receptor_rfc}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted">Tipo de contribuyente</dt><dd className="text-ink">{conNombre(q.receptor_regimen, REGIMEN)}</dd></div>
                    <div className="flex gap-2 sm:col-span-2"><dt className="text-muted">Razón social</dt><dd className="text-ink">{q.receptor_razon_social}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted">C.P.</dt><dd className="text-ink">{q.receptor_codigo_postal}</dd></div>
                    <div className="flex gap-2"><dt className="text-muted">Para qué la usa</dt><dd className="text-ink">{conNombre(q.receptor_uso_cfdi, USO)}</dd></div>
                  </dl>
                  {aprobar && (q.factura_estado === 'por_aprobar' || q.factura_estado === 'error') && (
                    <div className="mt-4">
                      <ConfirmForm
                        action={aprobar(q.id)}
                        confirmTitle={`¿Hacer la factura de ${formatFolio(q.folio)}?`}
                        confirmMessage="Se hace una factura real ante el SAT con estos datos y se le manda al cliente por WhatsApp (si escribió en las últimas 24 horas; si no, descárgala en Facturas)."
                        confirmLabel="Sí, hacer la factura"
                        dismissLabel="Todavía no"
                        triggerVariant="primary"
                      >
                        {q.factura_estado === 'error' ? 'Intentar otra vez' : 'Aprobar y hacer factura'}
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
