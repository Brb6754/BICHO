'use client';

import { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { Avatar, Chip, FiltroChips, type TonoChip } from '@/components/tenant-dash/dinero/Visual';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { formatMoney } from '@/lib/quotes/totals';

// Las facturas como tarjetas, filtradas por estado con chips de color.
// Lo que más se le pide a una factura ya hecha (el folio para el
// cliente y el PDF) va en botones grandes, no escondido en un menú.

export type FacturaFila = {
  id: string;
  uuid: string | null;
  folio: string | null;
  cliente: string;
  rfc: string | null;
  fecha: string | null;
  totalCents: number;
  status: string;
};

const ESTADO: Record<string, { texto: string; tono: TonoChip; grupo: Filtro }> = {
  stamped: { texto: 'Hecha', tono: 'success', grupo: 'hechas' },
  draft: { texto: 'Pendiente', tono: 'warning', grupo: 'pendientes' },
  error: { texto: 'No se pudo hacer', tono: 'error', grupo: 'problema' },
  cancelled: { texto: 'Cancelada', tono: 'muted', grupo: 'canceladas' },
};

type Filtro = 'todas' | 'hechas' | 'pendientes' | 'problema' | 'canceladas';

export function FacturasLista({ facturas }: { facturas: FacturaFila[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const grupo = (f: FacturaFila) => (ESTADO[f.status] ?? ESTADO.draft).grupo;
  const cuenta = (g: Filtro) => facturas.filter((f) => grupo(f) === g).length;
  const opciones = (
    [
      { id: 'todas', label: 'Todas', cuenta: facturas.length },
      { id: 'hechas', label: 'Hechas', cuenta: cuenta('hechas') },
      { id: 'pendientes', label: 'Pendientes', cuenta: cuenta('pendientes') },
      { id: 'problema', label: 'Con problema', cuenta: cuenta('problema') },
      { id: 'canceladas', label: 'Canceladas', cuenta: cuenta('canceladas') },
    ] as { id: Filtro; label: string; cuenta: number }[]
  ).filter((o) => o.id === 'todas' || o.cuenta > 0);
  const visibles = filtro === 'todas' ? facturas : facturas.filter((f) => grupo(f) === filtro);

  async function copiar(uuid: string) {
    try {
      await navigator.clipboard.writeText(uuid);
      toast('Folio fiscal copiado');
    } catch {
      toast('No se pudo copiar. Mantén presionado el folio para copiarlo.', 'error');
    }
  }

  return (
    <div className="mt-8">
      {opciones.length > 2 && <FiltroChips label="Ver facturas" opciones={opciones} valor={filtro} onChange={setFiltro} />}
      <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibles.map((f) => {
          const e = ESTADO[f.status] ?? ESTADO.draft;
          return (
            <li key={f.id} className="animate-fade-in flex flex-col rounded-3xl bg-surface p-5 ring-1 ring-border">
              <div className="flex items-start gap-3">
                <Avatar nombre={f.cliente} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold text-ink">{f.cliente}</p>
                  <p className="truncate text-[13px] text-muted">
                    {[f.folio ? `Folio ${f.folio}` : null, f.rfc, f.fecha].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Chip tono={e.tono}>{e.texto}</Chip>
              </div>
              <p className="mt-4 text-[2.25rem] font-bold leading-none tracking-tight tabular-nums text-ink">
                {formatMoney(f.totalCents)}
              </p>
              {f.status === 'stamped' && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {f.uuid ? (
                    <button
                      type="button"
                      onClick={() => copiar(f.uuid!)}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-ink ring-1 ring-border transition hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" /> Copiar folio
                    </button>
                  ) : (
                    <span />
                  )}
                  <a
                    href={`/dashboard/facturas/${f.id}/pdf`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-[rgb(var(--color-cta-fg))] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> Bajar PDF
                  </a>
                </div>
              )}
              {f.status === 'error' && (
                <p className="mt-3 text-[15px] text-ink">El SAT no la aceptó. Revisa los datos de tu cliente y hazla otra vez.</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
