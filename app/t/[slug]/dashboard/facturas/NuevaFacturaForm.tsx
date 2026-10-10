'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { facturarCotizacion } from './actions';

// Los catálogos del SAT, recortados a lo que de verdad usa un negocio de
// servicios. No están completos a propósito: la lista entera son
// decenas de claves que nadie de este giro va a elegir, y el PAC valida
// contra el catálogo vigente de todos modos.
// Los regímenes del SAT, separados por tipo de persona.
//
// NO es cosmético: un RFC de 13 caracteres es persona física y un
// régimen de persona moral lo rechaza el PAC con "el campo
// customer.tax_system no tiene un valor permitido" — verificado contra
// la API, 601 con XAXX010101000 devuelve 400. Ofrecer la combinación
// imposible y dejar que reviente al timbrar es trabajo que la pantalla
// puede ahorrarle a quien factura.
//
// `ambos` marca los que valen para los dos tipos.
const REGIMENES: { clave: string; texto: string; fisica: boolean; moral: boolean }[] = [
  { clave: '616', texto: '616 · Sin obligaciones fiscales', fisica: true, moral: true },
  { clave: '626', texto: '626 · RESICO', fisica: true, moral: false },
  { clave: '612', texto: '612 · Actividad empresarial y profesional', fisica: true, moral: false },
  { clave: '605', texto: '605 · Sueldos y salarios', fisica: true, moral: false },
  { clave: '606', texto: '606 · Arrendamiento', fisica: true, moral: false },
  { clave: '621', texto: '621 · Incorporación fiscal', fisica: true, moral: false },
  { clave: '608', texto: '608 · Demás ingresos', fisica: true, moral: false },
  { clave: '601', texto: '601 · General de ley personas morales', fisica: false, moral: true },
  { clave: '603', texto: '603 · Personas morales sin fines de lucro', fisica: false, moral: true },
  { clave: '620', texto: '620 · Sociedades cooperativas de producción', fisica: false, moral: true },
  { clave: '623', texto: '623 · Opcional para grupos de sociedades', fisica: false, moral: true },
];

const USOS = [
  ['G03', 'G03 · Gastos en general'],
  ['G01', 'G01 · Adquisición de mercancías'],
  ['D01', 'D01 · Honorarios médicos y dentales'],
  ['S01', 'S01 · Sin efectos fiscales'],
];

const FORMAS_PAGO = [
  ['03', '03 · Transferencia'],
  ['01', '01 · Efectivo'],
  ['04', '04 · Tarjeta de crédito'],
  ['28', '28 · Tarjeta de débito'],
  ['99', '99 · Por definir'],
];

export type CotizacionFacturable = {
  id: string;
  folio: string;
  customerName: string;
  total: string;
};

export function NuevaFacturaForm({
  slug,
  cotizaciones,
  preseleccion,
}: {
  slug: string;
  cotizaciones: CotizacionFacturable[];
  preseleccion?: string;
}) {
  const router = useRouter();
  const [quoteId, setQuoteId] = useState(preseleccion ?? cotizaciones[0]?.id ?? '');
  const [rfc, setRfc] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxSystem, setTaxSystem] = useState('616');
  const [zip, setZip] = useState('');
  const [usoCfdi, setUsoCfdi] = useState('G03');
  const [paymentForm, setPaymentForm] = useState('03');

  const rfcLimpio = rfc.trim().toUpperCase().replace(/\s+/g, '');
  const tipoPersona = rfcLimpio.length === 13 ? 'fisica' : rfcLimpio.length === 12 ? 'moral' : null;
  const regimenes = REGIMENES.filter(
    (r) => tipoPersona === null || (tipoPersona === 'fisica' ? r.fisica : r.moral)
  );

  // Si el RFC cambia de tipo y el régimen elegido deja de valer, se
  // reemplaza por el primero válido en vez de mandarlo y que el PAC lo
  // rechace.
  const regimenValido = regimenes.some((r) => r.clave === taxSystem)
    ? taxSystem
    : (regimenes[0]?.clave ?? '616');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{ uuid: string | null; total: number } | null>(null);

  async function emitir() {
    if (enviando) return;
    setEnviando(true);
    setError(null);

    const res = await facturarCotizacion(slug, quoteId, {
      // El RFC en mayúsculas sin espacios: la gente lo teclea como
      // puede, y el SAT lo quiere de una sola forma.
      receptor: {
        rfc: rfcLimpio,
        legalName: legalName.trim(),
        taxSystem: regimenValido,
        zip: zip.trim(),
      },
      usoCfdi,
      paymentForm,
    });

    setEnviando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setExito({ uuid: res.uuid, total: res.total });
    router.refresh();
  }

  if (exito) {
    return (
      <div className="rounded-2xl bg-success-soft p-6 ring-1 ring-border">
        <p className="text-[15px] font-semibold text-ink">Factura timbrada</p>
        <p className="mt-2 text-sm text-ink">
          Total ${(exito.total / 100).toFixed(2)} MXN
        </p>
        {exito.uuid && (
          <p className="mt-1 break-all text-[13px] text-muted">Folio fiscal {exito.uuid}</p>
        )}
        <Button className="mt-4" onClick={() => router.push('/dashboard/facturas')}>
          Ver mis facturas
        </Button>
      </div>
    );
  }

  if (cotizaciones.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm font-medium text-ink">No hay cotizaciones por facturar</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
          Solo se pueden facturar las que el cliente ya aceptó y que todavía no tienen factura.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="f-quote" className="mb-1.5 block text-xs font-medium text-muted">
          Qué se factura
        </label>
        <Select
          id="f-quote"
          value={quoteId}
          onChange={(e) => setQuoteId(e.target.value)}
          className="w-full"
        >
          {cotizaciones.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.folio} · {c.customerName} · {c.total}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="f-rfc" className="mb-1.5 block text-xs font-medium text-muted">
            RFC de quien recibe
          </label>
          <Input
            id="f-rfc"
            value={rfc}
            onChange={(e) => setRfc(e.target.value)}
            placeholder="XAXX010101000"
            maxLength={13}
            className="w-full uppercase"
          />
        </div>
        <div>
          <label htmlFor="f-zip" className="mb-1.5 block text-xs font-medium text-muted">
            Código postal
          </label>
          <Input
            id="f-zip"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
            placeholder="34000"
            maxLength={5}
            inputMode="numeric"
            className="w-full"
          />
          {/* La causa número uno de rechazo del SAT, y no es evidente. */}
          <p className="mt-1 text-xs text-muted">El de su constancia. Si no coincide, el SAT la rechaza.</p>
        </div>
      </div>

      <div>
        <label htmlFor="f-name" className="mb-1.5 block text-xs font-medium text-muted">
          Razón social
        </label>
        <Input
          id="f-name"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          placeholder="PUBLICO EN GENERAL"
          maxLength={160}
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted">Sin el régimen al final (nada de &ldquo;S.A. de C.V.&rdquo; si su constancia no lo trae).</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="f-regimen" className="mb-1.5 block text-xs font-medium text-muted">
            Régimen fiscal
          </label>
          <Select
            id="f-regimen"
            value={regimenValido}
            onChange={(e) => setTaxSystem(e.target.value)}
            className="w-full"
          >
            {regimenes.map((r) => (
              <option key={r.clave} value={r.clave}>
                {r.texto}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            {tipoPersona === 'fisica'
              ? 'Persona física, por el RFC de 13 caracteres.'
              : tipoPersona === 'moral'
                ? 'Persona moral, por el RFC de 12 caracteres.'
                : 'Escribe el RFC y se filtran los que aplican.'}
          </p>
        </div>
        <div>
          <label htmlFor="f-uso" className="mb-1.5 block text-xs font-medium text-muted">
            Uso del CFDI
          </label>
          <Select id="f-uso" value={usoCfdi} onChange={(e) => setUsoCfdi(e.target.value)} className="w-full">
            {USOS.map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-pago" className="mb-1.5 block text-xs font-medium text-muted">
            Forma de pago
          </label>
          <Select id="f-pago" value={paymentForm} onChange={(e) => setPaymentForm(e.target.value)} className="w-full">
            {FORMAS_PAGO.map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-error-soft px-4 py-3 text-sm text-error">{error}</p>
      )}

      <div>
        <Button onClick={emitir} isLoading={enviando} disabled={!quoteId}>
          {enviando ? 'Timbrando…' : 'Timbrar factura'}
        </Button>
        <p className="mt-2 text-xs text-muted">
          Una cotización solo puede facturarse una vez. Revisa los datos antes de timbrar.
        </p>
      </div>
    </div>
  );
}
