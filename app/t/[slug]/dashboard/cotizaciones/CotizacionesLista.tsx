'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Avatar, Chip, FiltroChips, type TonoChip } from '@/components/tenant-dash/dinero/Visual';
import { formatMoney } from '@/lib/quotes/totals';
import { QuoteRowActions } from './QuoteRowActions';

// Las cotizaciones como tarjetas: el estado en color (con su palabra) y
// el monto grande, que es lo que ella busca de un vistazo. Los chips de
// arriba filtran por estado y dicen cuántas hay en cada uno.

export type CotizacionFila = {
  id: string;
  folio: string;
  cliente: string;
  estado: string;
  totalCents: number;
  laAbrio: boolean;
};

const ESTADOS: Record<string, { texto: string; tono: TonoChip }> = {
  draft: { texto: 'Sin enviar', tono: 'muted' },
  sent: { texto: 'Enviada', tono: 'info' },
  viewed: { texto: 'La abrió', tono: 'warning' },
  accepted: { texto: 'Aceptada', tono: 'success' },
  declined: { texto: 'Rechazada', tono: 'error' },
  expired: { texto: 'Vencida', tono: 'muted' },
};
const ORDEN = ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'];

export function CotizacionesLista({ slug, cotizaciones }: { slug: string; cotizaciones: CotizacionFila[] }) {
  const [filtro, setFiltro] = useState('todas');
  const opciones = [
    { id: 'todas', label: 'Todas', cuenta: cotizaciones.length },
    ...ORDEN.map((e) => ({ id: e, label: ESTADOS[e].texto, cuenta: cotizaciones.filter((c) => c.estado === e).length })).filter(
      (o) => o.cuenta > 0
    ),
  ];
  const visibles = filtro === 'todas' ? cotizaciones : cotizaciones.filter((c) => c.estado === filtro);
  const aceptadoCents = cotizaciones.filter((c) => c.estado === 'accepted').reduce((s, c) => s + c.totalCents, 0);

  return (
    <div className="mt-8">
      {aceptadoCents > 0 && (
        <p className="mb-4 text-[15px] text-muted">
          Te han aceptado <span className="text-[17px] font-bold tabular-nums text-success">{formatMoney(aceptadoCents)}</span>
        </p>
      )}
      {opciones.length > 2 && <FiltroChips label="Ver cotizaciones" opciones={opciones} valor={filtro} onChange={setFiltro} />}
      <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibles.map((q) => {
          const e = ESTADOS[q.estado] ?? ESTADOS.draft;
          return (
            <li key={q.id} className="animate-fade-in flex flex-col rounded-3xl bg-surface p-5 ring-1 ring-border">
              <div className="flex items-start gap-3">
                <Avatar nombre={q.cliente} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold text-ink">{q.cliente}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                    <span className="tabular-nums">#{q.folio}</span>
                    {q.laAbrio && q.estado !== 'viewed' && q.estado !== 'accepted' && (
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" /> la abrió
                      </span>
                    )}
                  </p>
                </div>
                <Chip tono={e.tono}>{e.texto}</Chip>
              </div>
              <p className="mt-4 text-[2.25rem] font-bold leading-none tracking-tight tabular-nums text-ink">
                {formatMoney(q.totalCents)}
              </p>
              <div className="mt-4">
                <QuoteRowActions slug={slug} quoteId={q.id} folio={q.folio} customerName={q.cliente} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
