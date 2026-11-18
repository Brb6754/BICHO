'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Copy, Download, FileText } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { Avatar, Pasos } from '@/components/tenant-dash/dinero/Visual';
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

const PASOS = ['Qué vas a facturar', 'Datos de tu cliente', 'Uso y pago'];

const OPCION =
  'flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const opcion = (activa: boolean) =>
  `${OPCION} ${activa ? 'bg-primary/[0.08] ring-2 ring-primary' : 'bg-surface ring-border hover:bg-ink/[0.03]'}`;

function Marca({ activa }: { activa: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ${activa ? 'bg-primary ring-primary text-[rgb(var(--color-cta-fg))]' : 'ring-ink/20'}`}
    >
      {activa && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}

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
  const [paso, setPaso] = useState(0);
  const [quoteId, setQuoteId] = useState(inicial);
  const [rfc, setRfc] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxSystem, setTaxSystem] = useState('616');
  const [zip, setZip] = useState('');
  const [usoCfdi, setUsoCfdi] = useState('G03');
  const [paymentForm, setPaymentForm] = useState('03');
  const [errores, setErrores] = useState<Errores>({});

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
  const [exito, setExito] = useState<{ uuid: string | null; total: number; invoiceId: string } | null>(null);

  const cotizacion = cotizaciones.find((c) => c.id === quoteId);

  function irA(n: number) {
    setPaso(n);
    setError(null);
    // El asistente vive en la misma página: al cambiar de paso, arriba.
    document.getElementById('asistente-factura')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // Lo que se puede revisar antes de molestar al SAT, con el error junto
  // al campo y sin borrar nada de lo escrito.
  function revisarCliente() {
    const e: Errores = {};
    if (!tipoPersona) e.rfc = 'El RFC tiene 13 letras y números si es persona, o 12 si es empresa. Revísalo.';
    if (!legalName.trim()) e.legalName = 'Escribe el nombre tal como viene en su constancia del SAT.';
    if (zip.length !== 5) e.zip = 'El código postal tiene 5 números. Es el de su constancia.';
    setErrores(e);
    if (Object.keys(e).length === 0) irA(2);
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
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast('Factura hecha');
    setExito({ uuid: res.uuid, total: res.total, invoiceId: res.invoiceId });
    router.refresh();
  }

  async function copiarFolio(uuid: string) {
    try {
      await navigator.clipboard.writeText(uuid);
      toast('Folio fiscal copiado');
    } catch {
      toast('No se pudo copiar. Mantén presionado el folio para copiarlo.', 'error');
    }
  }

  if (exito) {
    return (
      <div className="animate-fade-in rounded-3xl bg-surface p-6 text-center ring-1 ring-border sm:p-8">
        <span className="mx-auto flex w-fit">
          <span className="animate-pop-in flex h-16 w-16 items-center justify-center rounded-full bg-success text-white">
            <Check className="h-9 w-9" strokeWidth={3} aria-hidden="true" />
          </span>
        </span>
        <p className="mt-4 text-[1.5rem] font-bold tracking-tight text-ink">Factura hecha</p>
        <p className="mt-1 text-[2.5rem] font-bold leading-none tabular-nums text-ink">
          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(exito.total / 100)}
        </p>
        <p className="mt-2 text-[15px] text-muted">El SAT ya la tiene registrada.</p>
        {exito.uuid && (
          <p className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center break-all text-[13px] text-muted">
            Folio fiscal: {exito.uuid}
            <HelpTip title="¿Qué es el folio fiscal?">
              Es el número único con el que el SAT identifica esta factura. Tu cliente lo puede usar para buscarla en el
              portal del SAT.
            </HelpTip>
          </p>
        )}
        <div className="mx-auto mt-5 grid max-w-md gap-2 sm:grid-cols-2">
          {exito.uuid && (
            <button
              type="button"
              onClick={() => copiarFolio(exito.uuid!)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-ink ring-1 ring-border transition hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Copy className="h-4 w-4" aria-hidden="true" /> Copiar folio
            </button>
          )}
          <a
            href={`/dashboard/facturas/${exito.invoiceId}/pdf`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-[rgb(var(--color-cta-fg))] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Bajar PDF
          </a>
        </div>
        <Button variant="outline" className="mt-3 min-h-11" onClick={() => router.push('/dashboard/facturas')}>
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
    <div id="asistente-factura" className="scroll-mt-24 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7">
      <Pasos actual={paso} nombres={PASOS} />

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (paso === 0) irA(1);
          else if (paso === 1) revisarCliente();
          else emitir();
        }}
        className="mt-6"
      >
        {paso === 0 && (
          <fieldset key="p0" className="animate-fade-in min-w-0">
            <legend className="text-[19px] font-semibold tracking-tight text-ink">¿Qué cotización vas a facturar?</legend>
            <p className="mt-1 text-[15px] text-muted">Solo salen las que tu cliente ya aceptó.</p>
            <div className="mt-4 flex flex-col gap-2">
              {cotizaciones.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={quoteId === c.id}
                  onClick={() => setQuoteId(c.id)}
                  className={opcion(quoteId === c.id)}
                >
                  <Avatar nombre={c.customerName} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold text-ink">{c.customerName}</span>
                    <span className="block text-[13px] text-muted">Cotización #{c.folio}</span>
                  </span>
                  <span className="shrink-0 text-[17px] font-bold tabular-nums text-ink">{c.total}</span>
                  <Marca activa={quoteId === c.id} />
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {paso === 1 && (
          <fieldset key="p1" className="animate-fade-in min-w-0 flex flex-col gap-4">
            <legend className="text-[19px] font-semibold tracking-tight text-ink">Datos de tu cliente</legend>
            <div className="-mt-2 flex flex-wrap items-center text-[15px] text-muted">
              Cópialos de su constancia de situación fiscal.
              <HelpTip title="¿Qué es la constancia?" label="¿Qué es?">
                Es el papel del SAT con su RFC, su nombre y su código postal. Si no la tienes, pídesela por WhatsApp: casi
                todos la tienen en PDF.
              </HelpTip>
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
                    className="h-12 w-full text-[17px] uppercase"
                    autoFocus
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
                  className="h-12 w-full text-[17px]"
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
                className="h-12 w-full text-[17px]"
              />
            </FormField>

            <div>
              <FormField
                label="Tipo de contribuyente"
                hint={tipoPersona ? 'Solo salen los que aplican a ese RFC.' : 'Escribe el RFC y se quedan solo los que aplican.'}
              >
                <Select value={regimenValido} onChange={(e) => setTaxSystem(e.target.value)} className="h-12 w-full text-[16px]">
                  {regimenes.map((r) => (
                    <option key={r.clave} value={r.clave}>
                      {r.texto}
                    </option>
                  ))}
                </Select>
              </FormField>
              <HelpTip title="¿Qué es el tipo de contribuyente?" label="¿Cuál elijo?">
                Es la forma en que tu cliente paga impuestos (el SAT le dice «régimen fiscal»). Viene en su constancia,
                abajo, en «Regímenes». Si es un empleado que solo quiere deducir, casi siempre es «Sueldos y salarios». Si
                no tiene ninguno, «Sin obligaciones fiscales».
              </HelpTip>
            </div>
          </fieldset>
        )}

        {paso === 2 && (
          <div key="p2" className="animate-fade-in flex flex-col gap-6">
            <fieldset className="min-w-0">
              <legend className="flex items-center text-[19px] font-semibold tracking-tight text-ink">
                ¿Para qué la usa tu cliente?
                <HelpTip title="¿Para qué la usa?">
                  Es para qué va a usar la factura (el SAT le dice «uso del CFDI»). Si no sabe, «Gastos en general» sirve
                  casi siempre. Consultorios: «Gastos médicos o dentales» le sirve en su declaración anual.
                </HelpTip>
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {USOS.map(([v, t]) => (
                  <button key={v} type="button" aria-pressed={usoCfdi === v} onClick={() => setUsoCfdi(v)} className={opcion(usoCfdi === v)}>
                    <Marca activa={usoCfdi === v} />
                    <span className="text-[15px] font-medium text-ink">{t}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="text-[19px] font-semibold tracking-tight text-ink">¿Cómo te pagó?</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {FORMAS_PAGO.map(([v, t]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={paymentForm === v}
                    onClick={() => setPaymentForm(v)}
                    className={`inline-flex min-h-12 items-center rounded-full px-5 text-[15px] font-medium ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      paymentForm === v ? 'bg-primary text-[rgb(var(--color-cta-fg))] ring-primary' : 'bg-surface text-ink ring-border hover:bg-ink/[0.03]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>

            {cotizacion && (
              <div className="rounded-2xl bg-ink/[0.04] p-5">
                <p className="text-[15px] font-semibold text-ink">Revisa antes de hacerla</p>
                <dl className="mt-3 flex flex-col gap-2 text-[15px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">Para</dt>
                    <dd className="text-right font-medium text-ink">{legalName.trim()}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">RFC</dt>
                    <dd className="font-medium tabular-nums text-ink">{rfcLimpio}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                    <dt className="text-muted">Total</dt>
                    <dd className="text-[1.75rem] font-bold leading-none tabular-nums text-ink">{cotizacion.total}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[16px] font-medium leading-relaxed text-ink/80">
                  Ya hecha no se puede cambiar; si algo sale mal, se cancela y se hace otra.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-2xl bg-error-soft px-4 py-3 text-[15px] leading-relaxed text-error">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap-reverse items-center justify-between gap-3 border-t border-border pt-5">
          {paso > 0 ? (
            <Button type="button" variant="outline" onClick={() => irA(paso - 1)} className="min-h-12 max-sm:w-full" disabled={enviando}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Atrás
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={!quoteId} isLoading={enviando} className="min-h-12 text-[15px] font-semibold max-sm:w-full">
            {paso < 2 ? (
              <>
                Siguiente <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            ) : enviando ? (
              'Haciendo la factura…'
            ) : (
              'Sí, hacer la factura'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
