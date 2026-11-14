'use client';

import { useState } from 'react';
import { formatoPesos, pesosACentavos } from '@/lib/caja/resumen';
import { formatoTasa, isrMensualResico } from '@/lib/resico/isr';

// La misma cuenta que la calculadora del panel (components/tenant-dash/
// ResicoGuia.tsx), con la piel de la landing: aquí no hay Caja que precargar.
export function CalculadoraResico() {
  const [ingresos, setIngresos] = useState('');
  const cents = pesosACentavos(ingresos);
  const calculo = cents === null ? null : isrMensualResico(cents);

  return (
    <div className="not-prose mt-8 rounded-[24px] bg-[#F5F3FC] p-6 sm:p-8">
      <h3 className="!mt-0 text-lg font-semibold text-[#140F2E]">¿Cuánto ISR pagaría este mes?</h3>
      <p className="!mt-2 text-[15px] text-[#4A4370]">
        Escribe lo que cobraste en el mes con factura (incluida la global), <strong>sin IVA</strong>.
      </p>
      <label htmlFor="resico-publico" className="mt-5 block text-sm font-semibold text-[#140F2E]">
        Ingresos del mes
      </label>
      <input
        id="resico-publico"
        inputMode="decimal"
        placeholder="Por ejemplo 32,000"
        value={ingresos}
        onChange={(e) => setIngresos(e.target.value)}
        aria-describedby="resico-resultado"
        className="mt-2 h-12 w-full rounded-xl border border-[#140F2E]/20 bg-white px-4 text-[16px] text-[#140F2E] focus:border-[#5B34E8] focus:outline-none focus:ring-2 focus:ring-[#5B34E8]/30 sm:max-w-xs"
      />
      <div id="resico-resultado" aria-live="polite">
        {ingresos.trim() !== '' && cents === null && (
          <p className="!mt-3 text-sm font-medium text-[#B42318]">Escribe una cantidad válida, por ejemplo 32000 o 32,000.50.</p>
        )}
        {calculo && !calculo.ok && (
          <p className="!mt-4 rounded-xl bg-white p-4 text-sm text-[#140F2E]">
            Esa cantidad pasa de $3,500,000: con esos ingresos ya no te toca el RESICO. Habla con un contador.
          </p>
        )}
        {calculo?.ok && cents !== null && (
          <div className="mt-4 rounded-xl bg-white p-4">
            <p className="!mt-0 text-sm text-[#6A6488]">ISR estimado del mes</p>
            <p className="!mt-1 text-3xl font-bold tabular-nums text-[#140F2E]">{formatoPesos(calculo.isrCents)}</p>
            <p className="!mt-1 text-sm text-[#4A4370]">
              Tasa de {formatoTasa(calculo.tasaBps)} sobre {formatoPesos(cents)}. En RESICO la tasa se aplica a todo lo del mes, no por partes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
