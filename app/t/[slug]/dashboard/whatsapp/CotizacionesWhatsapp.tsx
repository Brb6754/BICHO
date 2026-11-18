import { FileText } from 'lucide-react';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
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

// Chips con tokens semánticos (Badge "inverse" es para fondos oscuros).
const ESTADO: Record<EstadoCotizaWA, { texto: string; clase: string }> = {
  enviada: { texto: 'Cotización enviada', clase: 'bg-ink/[0.06] text-ink' },
  seguimiento: { texto: 'Le recordamos a las 48 h', clase: 'bg-ink/[0.06] text-ink' },
  aceptada: { texto: 'Cotización aceptada', clase: 'bg-success-soft text-success' },
  facturada: { texto: 'Aceptada y con factura', clase: 'bg-success-soft text-success' },
  rechazada: { texto: 'No la aceptó', clase: 'bg-error-soft text-error' },
  vencida: { texto: 'Venció', clase: 'bg-ink/[0.06] text-muted' },
  borrador: { texto: 'Sin mandar', clase: 'bg-ink/[0.06] text-muted' },
};

/** La factura es otro paso, aparte de aceptar la cotización: se dice como tal. */
function textoFactura(e: string): string {
  if (e === 'por_aprobar') return 'Factura pendiente de aprobación';
  if (e === 'error') return ETIQUETA_FACTURA.error;
  const t = ETIQUETA_FACTURA[e] ?? e;
  return `Factura: ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}
const porAprobar = (q: CotizacionWA) => q.factura_estado === 'por_aprobar' || q.factura_estado === 'error';

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
  // Primero lo que espera algo de ti: facturas por aprobar.
  const orden = [...cotizaciones].sort((x, y) => Number(porAprobar(y)) - Number(porAprobar(x)));

  return (
    <ul className="grid gap-3 lg:grid-cols-2">
      {orden.map((q) => {
        const estado = ESTADO[estadoCotizaWA(q)];
        const factura = q.factura_estado && q.factura_estado !== 'timbrada' ? q.factura_estado : null;
        const urge = porAprobar(q);
        return (
          <li key={q.id} className={`flex flex-col overflow-hidden rounded-3xl border bg-surface shadow-sm ${urge ? 'border-warning/50' : 'border-border'}`}>
            <div className="flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-ink" aria-hidden="true">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold text-ink">{q.customer_name}</p>
                  <p className="text-[14px] text-muted">
                    {formatFolio(q.folio)} · {fmt.format(new Date(q.created_at))}
                    {q.whatsapp_telefono ? ` · ${telefonoBonito(q.whatsapp_telefono)}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-[19px] font-semibold tabular-nums text-ink">{formatMoney(q.total_cents)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-[14px] font-semibold ${estado.clase}`}>{estado.texto}</span>
                {factura && (
                  <span
                    className={`rounded-full px-3 py-1 text-[14px] font-semibold ${
                      factura === 'error' ? 'bg-error-soft text-error' : factura === 'por_aprobar' ? 'bg-warning-soft text-warning' : 'bg-ink/[0.06] text-ink'
                    }`}
                  >
                    {textoFactura(factura)}
                  </span>
                )}
              </div>
            </div>
            {q.receptor_rfc && q.factura_estado && (
              <div className={`mt-auto border-t px-4 py-4 sm:px-5 ${urge ? 'border-warning/30 bg-warning-soft' : 'border-border'}`}>
                <p className="flex items-center gap-1 text-[15px] font-semibold text-ink">
                  {urge ? 'Revisa sus datos y aprueba la factura' : 'Datos para la factura'}
                  <HelpTip title="¿Qué son estos datos?">
                    Los lee bicho de la constancia que el cliente mandó por WhatsApp. El RFC es su clave del SAT; el tipo
                    de contribuyente y «para qué la usa» son claves que pide el SAT. Revísalos antes de aprobar.
                  </HelpTip>
                </p>
                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[15px] sm:grid-cols-2">
                  <div className="flex gap-2"><dt className="text-muted">RFC</dt><dd className="font-medium text-ink">{q.receptor_rfc}</dd></div>
                  <div className="flex gap-2"><dt className="text-muted">C.P.</dt><dd className="text-ink">{q.receptor_codigo_postal}</dd></div>
                  <div className="flex gap-2 sm:col-span-2"><dt className="text-muted">Razón social</dt><dd className="text-ink">{q.receptor_razon_social}</dd></div>
                  <div className="flex gap-2 sm:col-span-2"><dt className="text-muted">Tipo de contribuyente</dt><dd className="text-ink">{conNombre(q.receptor_regimen, REGIMEN)}</dd></div>
                  <div className="flex gap-2 sm:col-span-2"><dt className="text-muted">Para qué la usa</dt><dd className="text-ink">{conNombre(q.receptor_uso_cfdi, USO)}</dd></div>
                </dl>
                {aprobar && urge && (
                  <div className="mt-4">
                    <ConfirmForm
                      action={aprobar(q.id)}
                      confirmTitle={`¿Hacer la factura de ${formatFolio(q.folio)}?`}
                      confirmMessage="Se hace una factura real ante el SAT con estos datos y se le manda al cliente por WhatsApp (si escribió en las últimas 24 horas; si no, descárgala en Facturas)."
                      confirmLabel="Sí, hacer la factura"
                      dismissLabel="Todavía no"
                      triggerVariant="primary"
                      triggerClassName="max-sm:w-full"
                    >
                      {q.factura_estado === 'error' ? 'Intentar otra vez' : 'Aprobar y hacer factura'}
                    </ConfirmForm>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
