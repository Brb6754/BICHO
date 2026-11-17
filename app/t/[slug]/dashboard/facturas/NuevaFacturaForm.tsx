'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleCheck, FileText } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { facturarCotizacion } from './actions';

// HACER UNA FACTURA, en el idioma de ella y no en el del SAT.
//
// Los catálogos del SAT van recortados a lo que de verdad usa un negocio
// de servicios: la lista entera son decenas de claves que nadie de este
// giro va a elegir, y el PAC valida contra el catálogo vigente de todos
// modos. El nombre va primero y la clave entre paréntesis: la dueña
// busca "Gastos en general", su contador busca "G03", y los dos la
// encuentran.
//
// Los regímenes van separados por tipo de persona. NO es cosmético: un
// RFC de 13 caracteres es persona física y un régimen de persona moral
// lo rechaza el PAC con "el campo customer.tax_system no tiene un valor
// permitido" — verificado contra la API, 601 con XAXX010101000 devuelve
// 400. Ofrecer la combinación imposible y dejar que reviente al timbrar
// es trabajo que la pantalla puede ahorrarle a quien factura.
const REGIMENES: { clave: string; texto: string; fisica: boolean; moral: boolean }[] = [
  { clave: '616', texto: 'Sin obligaciones fiscales (616)', fisica: true, moral: true },
  { clave: '626', texto: 'RESICO (626)', fisica: true, moral: false },
  { clave: '612', texto: 'Actividad empresarial y profesional (612)', fisica: true, moral: false },
  { clave: '605', texto: 'Sueldos y salarios (605)', fisica: true, moral: false },
  { clave: '606', texto: 'Arrendamiento (606)', fisica: true, moral: false },
  { clave: '621', texto: 'Incorporación fiscal (621)', fisica: true, moral: false },
  { clave: '608', texto: 'Demás ingresos (608)', fisica: true, moral: false },
  { clave: '601', texto: 'General de ley, personas morales (601)', fisica: false, moral: true },
  { clave: '603', texto: 'Personas morales sin fines de lucro (603)', fisica: false, moral: true },
  { clave: '620', texto: 'Sociedades cooperativas de producción (620)', fisica: false, moral: true },
  { clave: '623', texto: 'Opcional para grupos de sociedades (623)', fisica: false, moral: true },
];

const USOS = [
  ['G03', 'Gastos en general (G03) · lo más común'],
  ['D01', 'Gastos médicos o dentales (D01)'],
  ['G01', 'Compra de mercancía para revender (G01)'],
  ['S01', 'No la va a deducir (S01)'],
];

const FORMAS_PAGO = [
  ['03', 'Transferencia'],
  ['01', 'Efectivo'],
  ['04', 'Tarjeta de crédito'],
  ['28', 'Tarjeta de débito'],
  ['99', 'Todavía no me paga'],
];

export type CotizacionFacturable = {
  id: string;
  folio: string;
  customerName: string;
  total: string;
};

type Errores = Partial<Record<'rfc' | 'legalName' | 'zip', string>>;

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
  const inicial = cotizaciones.some((c) => c.id === preseleccion) ? preseleccion! : (cotizaciones[0]?.id ?? '');
  const [quoteId, setQuoteId] = useState(inicial);
  const [rfc, setRfc] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxSystem, setTaxSystem] = useState('616');
  const [zip, setZip] = useState('');
  const [usoCfdi, setUsoCfdi] = useState('G03');
  const [paymentForm, setPaymentForm] = useState('03');
  const [errores, setErrores] = useState<Errores>({});
  const [revisando, setRevisando] = useState(false);

  // El RFC en mayúsculas sin espacios: la gente lo teclea como puede, y
  // el SAT lo quiere de una sola forma.
  const rfcLimpio = rfc.trim().toUpperCase().replace(/\s+/g, '');
  const tipoPersona = rfcLimpio.length === 13 ? 'fisica' : rfcLimpio.length === 12 ? 'moral' : null;
  const regimenes = REGIMENES.filter((r) => tipoPersona === null || (tipoPersona === 'fisica' ? r.fisica : r.moral));

  // Si el RFC cambia de tipo y el régimen elegido deja de valer, se
  // reemplaza por el primero válido en vez de mandarlo y que el PAC lo
  // rechace.
  const regimenValido = regimenes.some((r) => r.clave === taxSystem) ? taxSystem : (regimenes[0]?.clave ?? '616');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{ uuid: string | null; total: number } | null>(null);

  const cotizacion = cotizaciones.find((c) => c.id === quoteId);

  // Lo que se puede revisar antes de molestar al SAT, con el error junto
  // al campo y sin borrar nada de lo escrito.
  function revisar() {
    const e: Errores = {};
    if (!tipoPersona) e.rfc = 'El RFC tiene 13 letras y números si es persona, o 12 si es empresa. Revísalo.';
    if (!legalName.trim()) e.legalName = 'Escribe el nombre tal como viene en su constancia del SAT.';
    if (zip.length !== 5) e.zip = 'El código postal tiene 5 números. Es el de su constancia.';
    setErrores(e);
    setError(null);
    if (Object.keys(e).length === 0) setRevisando(true);
  }

  async function emitir() {
    if (enviando) return;
    setEnviando(true);
    setError(null);

    const res = await facturarCotizacion(slug, quoteId, {
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
    setRevisando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast('Factura hecha');
    setExito({ uuid: res.uuid, total: res.total });
    router.refresh();
  }

  if (exito) {
    return (
      <div className="rounded-3xl bg-success-soft p-6 ring-1 ring-border">
        <p className="flex items-center gap-2 text-[17px] font-semibold text-ink">
          <CircleCheck className="h-5 w-5 text-success" aria-hidden="true" /> Factura hecha
        </p>
        <p className="mt-2 text-[15px] text-ink">
          Por{' '}
          <span className="font-semibold tabular-nums">
            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(exito.total / 100)}
          </span>
          . El SAT ya la tiene registrada.
        </p>
        {exito.uuid && (
          <p className="mt-2 flex flex-wrap items-center break-all text-[13px] text-muted">
            Folio fiscal: {exito.uuid}
            <HelpTip title="¿Qué es el folio fiscal?">
              Es el número único con el que el SAT identifica esta factura. Tu cliente lo puede usar para buscarla en el
              portal del SAT.
            </HelpTip>
          </p>
        )}
        <Button className="mt-4 min-h-11" onClick={() => router.push('/dashboard/facturas')}>
          Ver mis facturas
        </Button>
      </div>
    );
  }

  if (cotizaciones.length === 0) {
    return (
      <div className="rounded-3xl bg-surface ring-1 ring-border">
        <EmptyState
          icon={FileText}
          title="No tienes cotizaciones por facturar"
          description="Se factura una cotización que tu cliente ya aceptó y que todavía no tiene factura."
          why="Así la factura sale con los mismos conceptos y precios que le ofreciste, sin volver a escribirlos."
          action={
            <Link
              href="/dashboard/cotizaciones"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
            >
              Ir a mis cotizaciones
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        revisar();
      }}
      className="flex flex-col gap-8"
    >
      <section className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold tracking-tight text-ink">1. ¿Qué vas a facturar?</h2>
        <FormField label="Cotización aceptada">
          <Select value={quoteId} onChange={(e) => setQuoteId(e.target.value)} className="w-full">
            {cotizaciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customerName} · {c.total} · #{c.folio}
              </option>
            ))}
          </Select>
        </FormField>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">2. Datos de tu cliente</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Cópialos de su <span className="font-medium text-ink">constancia de situación fiscal</span> (el papel del SAT
            con su RFC). Si no la tienes, pídesela por WhatsApp: casi todos la tienen en PDF.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FormField
              label="RFC"
              error={errores.rfc}
              hint={
                tipoPersona === 'fisica'
                  ? 'Es de una persona (13 caracteres).'
                  : tipoPersona === 'moral'
                    ? 'Es de una empresa (12 caracteres).'
                    : 'La clave del SAT de quien recibe la factura.'
              }
            >
              <Input
                value={rfc}
                onChange={(e) => setRfc(e.target.value)}
                placeholder="Ej. GOMA850101AB1"
                maxLength={13}
                autoCapitalize="characters"
                autoComplete="off"
                error={Boolean(errores.rfc)}
                className="w-full uppercase"
              />
            </FormField>
            <HelpTip title="¿Qué es el RFC?" label="¿Qué es el RFC?">
              Es la clave con la que el SAT identifica a tu cliente. Tiene 13 letras y números si es una persona (ej.
              GOMA850101AB1) o 12 si es una empresa. Viene arriba en su constancia de situación fiscal.
            </HelpTip>
          </div>

          <FormField label="Código postal" error={errores.zip} hint="El de su constancia. Si no coincide, el SAT la rechaza.">
            <Input
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej. 34000"
              maxLength={5}
              inputMode="numeric"
              autoComplete="postal-code"
              error={Boolean(errores.zip)}
              className="w-full"
            />
          </FormField>
        </div>

        <FormField
          label="Nombre o razón social"
          error={errores.legalName}
          hint="Igualito a su constancia, sin «S.A. de C.V.» si ahí no lo trae."
        >
          <Input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Ej. MARIA GOMEZ ALVAREZ"
            maxLength={160}
            autoComplete="off"
            error={Boolean(errores.legalName)}
            className="w-full"
          />
        </FormField>

        <div>
          <FormField label="Tipo de contribuyente" hint={tipoPersona ? 'Solo salen los que aplican a ese RFC.' : 'Escribe el RFC y se quedan solo los que aplican.'}>
            <Select value={regimenValido} onChange={(e) => setTaxSystem(e.target.value)} className="w-full">
              {regimenes.map((r) => (
                <option key={r.clave} value={r.clave}>
                  {r.texto}
                </option>
              ))}
            </Select>
          </FormField>
          <HelpTip title="¿Qué es el tipo de contribuyente?" label="¿Cuál elijo?">
            Es la forma en que tu cliente paga impuestos (el SAT le dice «régimen fiscal»). Viene en su constancia, abajo,
            en «Regímenes». Si es un empleado que solo quiere deducir, casi siempre es «Sueldos y salarios». Si no tiene
            ninguno, «Sin obligaciones fiscales».
          </HelpTip>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[17px] font-semibold tracking-tight text-ink">3. ¿Para qué la quiere y cómo te pagó?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FormField label="¿Para qué la usa tu cliente?">
              <Select value={usoCfdi} onChange={(e) => setUsoCfdi(e.target.value)} className="w-full">
                {USOS.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            </FormField>
            <HelpTip title="¿Para qué la usa?" label="¿Cuál elijo?">
              Es para qué va a usar la factura (el SAT le dice «uso del CFDI»). Si no sabes, pregúntale; si no sabe,
              «Gastos en general» sirve casi siempre. Consultorios: «Gastos médicos o dentales» le sirve en su declaración
              anual.
            </HelpTip>
          </div>
          <FormField label="¿Cómo te pagó?">
            <Select value={paymentForm} onChange={(e) => setPaymentForm(e.target.value)} className="w-full">
              {FORMAS_PAGO.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-2xl bg-error-soft px-4 py-3 text-sm leading-relaxed text-error">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" disabled={!quoteId} className="min-h-11 max-sm:w-full">
          Revisar y hacer la factura
        </Button>
        <p className="mt-2 text-[13px] text-muted">Antes de mandarla al SAT te enseñamos un resumen para confirmar.</p>
      </div>

      {revisando && cotizacion && (
        <Modal open onClose={() => setRevisando(false)} title="¿Hacemos la factura?">
          <dl className="flex flex-col gap-2 text-[15px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Para</dt>
              <dd className="text-right font-medium text-ink">{legalName.trim()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">RFC</dt>
              <dd className="font-medium tabular-nums text-ink">{rfcLimpio}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Total</dt>
              <dd className="font-semibold tabular-nums text-ink">{cotizacion.total}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Ya hecha no se puede cambiar; si algo sale mal, se cancela y se hace otra. Revisa que el RFC y el nombre estén
            igual que en su constancia.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRevisando(false)} className="min-h-11">
              No, revisar datos
            </Button>
            <Button type="button" onClick={emitir} isLoading={enviando} className="min-h-11">
              {enviando ? 'Haciendo la factura…' : 'Sí, hacer la factura'}
            </Button>
          </div>
        </Modal>
      )}
    </form>
  );
}
