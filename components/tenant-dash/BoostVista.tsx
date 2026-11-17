import { BellRing, CalendarHeart, Clock3, ExternalLink } from 'lucide-react';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { ActionForm, SubmitButton } from '@/components/tenant-dash/ui/ActionForm';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';
import { DIAS, FRANJAS, formatoPesos, type ResultadosBoost } from '@/lib/boost/reglas';

// "Llena tus huecos" (Boost de clientes). La usan el panel real
// (/dashboard/boost, con acciones) y la demo pública (/panel/boost, sin
// acciones: los controles se ven igual pero no mandan nada). Server component.
//
// Orden: primero QUÉ hace cada herramienta y si está prendida (lo que se
// vende), luego quién está en la lista, luego las reglas de las horas
// flojas, y hasta el final las cifras del mes.

export type ContactoVista = {
  id: string;
  nombre: string;
  telefono: string;
  servicio: string | null;
  dias: number[];
  franjas: string[];
  promos: boolean;
  baja: boolean;
};

export type ConfigFlojas = { descuento: number; aviso: number; dias: number[]; desde: number; hasta: number };

type Accion = (formData: FormData) => void | Promise<void>;

const VIOLETA = COLOR_MODULO.boost;
const HORAS = Array.from({ length: 25 }, (_, h) => h);
const etiquetaHora = (h: number) => (h === 0 ? '12 a. m.' : h < 12 ? `${h} a. m.` : h === 12 ? '12 p. m.' : h === 24 ? '12 a. m. (fin del día)' : `${h - 12} p. m.`);

function telefonoVisible(t: string): string {
  const d = t.slice(-10);
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : t;
}

function cuandoPuede(c: ContactoVista): string {
  const dias = c.dias.length && c.dias.length < 7 ? c.dias.map((d) => DIAS[d]).join(', ') : 'Cualquier día';
  const franjas = c.franjas.length && c.franjas.length < 3 ? c.franjas.map((f) => FRANJAS.find((x) => x.id === f)?.label.split(' (')[0] ?? f).join(', ').toLowerCase() : 'a cualquier hora';
  return `${dias}, ${franjas}`;
}

/** El "¿qué es esto?" del encabezado, compartido por el panel y la demo. */
export function AyudaBoost() {
  return (
    <HelpTip title="¿Qué es Boost?">
      Es el nombre de este extra. Usa a las clientas que ya te conocen para llenar los horarios que se quedan vacíos:
      les escribimos por WhatsApp desde bicho, con su permiso, y ellas apartan desde tu página de reservas.
    </HelpTip>
  );
}

function Interruptor({ prendido, que, accion }: { prendido: boolean; que: string; accion?: Accion }) {
  const texto = prendido ? 'Apagar' : 'Prender';
  if (!accion) {
    return (
      <Button type="button" variant={prendido ? 'outline' : 'primary'} className="max-sm:w-full">
        {texto}
      </Button>
    );
  }
  return (
    <ActionForm action={accion} success={prendido ? `${que}: apagado` : `${que}: prendido`} className="max-sm:w-full">
      <SubmitButton variant={prendido ? 'outline' : 'primary'} className="max-sm:w-full" pending={prendido ? 'Apagando…' : 'Prendiendo…'}>
        {texto}
      </SubmitButton>
    </ActionForm>
  );
}

function Estado({ prendido }: { prendido: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
      <span className={`h-2 w-2 rounded-full ${prendido ? '' : 'bg-ink/25'}`} style={prendido ? { background: VIOLETA } : undefined} aria-hidden="true" />
      {prendido ? 'Prendido' : 'Apagado'}
    </span>
  );
}

function Herramienta({
  icono: Icono,
  titulo,
  valor,
  como,
  prendido,
  accion,
}: {
  icono: typeof BellRing;
  titulo: string;
  valor: string;
  como: string;
  prendido: boolean;
  accion?: Accion;
}) {
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/[0.06] text-ink" aria-hidden="true">
          <Icono className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-snug tracking-tight text-ink">{titulo}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">{valor}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted">{como}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Estado prendido={prendido} />
        <Interruptor prendido={prendido} que={titulo} accion={accion} />
      </div>
    </Card>
  );
}

export function BoostVista({
  usados,
  tope,
  resultados,
  vipPrendido,
  flojasPrendido,
  config,
  contactos,
  linkPublico,
  aviso,
  acciones,
}: {
  usados: number;
  tope: number;
  resultados: ResultadosBoost;
  vipPrendido: boolean;
  flojasPrendido: boolean;
  config: ConfigFlojas;
  contactos: ContactoVista[];
  linkPublico: string;
  /** Algo que el dueño tiene que saber antes de todo (falta activar, WhatsApp sin conectar). */
  aviso?: string | null;
  /** Sin acciones = demo o alguien del equipo sin permiso: los controles se ven, no envían. */
  acciones?: { vip: Accion; flojas: Accion; guardar: Accion };
}) {
  const pct = Math.min(100, Math.round((usados / tope) * 100));
  const activas = contactos.filter((c) => !c.baja).length;
  const cifras = [
    { dt: 'Horarios ofrecidos', dd: String(resultados.huecosOfrecidos) },
    { dt: 'Citas que se llenaron', dd: String(resultados.huecosLlenados) },
    { dt: 'Dinero recuperado', dd: formatoPesos(resultados.recuperadoCents) },
  ];

  return (
    <div className="mt-8 space-y-12">
      {aviso && <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm leading-relaxed text-ink">{aviso}</p>}

      <section aria-label="Las dos herramientas" className="grid gap-4 lg:grid-cols-2">
        <Herramienta
          icono={BellRing}
          titulo="Aviso de cancelación"
          valor="Cuando alguien cancela, le avisamos a las clientas que querían ese horario. La primera que lo aparta se lo queda."
          como="Ellas se apuntan en tu página de reservas con su teléfono. El aviso va sin descuento: solo les dice que se liberó un lugar."
          prendido={vipPrendido}
          accion={acciones?.vip}
        />
        <Herramienta
          icono={Clock3}
          titulo="Promo en horas flojas"
          valor="Si en las próximas horas tienes horarios vacíos, se los ofrecemos con descuento a clientas que suelen venir a esa hora."
          como="Solo a quien aceptó recibir promociones, máximo una por semana. El descuento dura 20 minutos; después el link sigue, a precio normal."
          prendido={flojasPrendido}
          accion={acciones?.flojas}
        />
      </section>

      <section aria-label="Clientas apuntadas">
        <SectionHeading title="Clientas apuntadas" meta={activas || undefined} />
        <p className="-mt-1 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-muted">
          Se apuntan solas en tu página, debajo del calendario: «Avísame si se libera algo».
          <a
            href={linkPublico}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[2.75rem] items-center gap-1.5 font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Ver dónde se apuntan
          </a>
        </p>

        {contactos.length === 0 ? (
          <Card padded={false}>
            <EmptyState
              icon={CalendarHeart}
              title="Nadie se ha apuntado todavía"
              description={
                vipPrendido
                  ? 'Comparte tu página de reservas: tus clientas verán la opción para que les avises.'
                  : 'Prende el aviso de cancelación y la opción aparece en tu página de reservas.'
              }
              why="Cada clienta apuntada es una cita que no se pierde cuando alguien cancela."
            />
          </Card>
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-border">
              {contactos.map((c) => (
                <li key={c.id} className={`grid gap-1 px-4 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-4 sm:px-5 ${c.baja ? 'opacity-60' : ''}`}>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-ink">{c.nombre}</p>
                    <p className="text-[13px] tabular-nums text-muted">{telefonoVisible(c.telefono)}</p>
                  </div>
                  <p className="text-sm text-ink">{c.servicio ?? 'Cualquier servicio'}</p>
                  <p className="text-sm text-muted">{cuandoPuede(c)}</p>
                  <p className="text-[13px] font-medium text-muted sm:text-right">{c.baja ? 'Ya no quiere avisos' : c.promos ? 'Acepta promociones' : 'Solo avisos'}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section aria-labelledby="boost-reglas">
        <h2 id="boost-reglas" className="mb-1 flex items-center gap-1 text-[17px] font-semibold tracking-tight text-ink">
          Reglas de las horas flojas
          <HelpTip title="¿Qué es una hora floja?">
            Un horario de tu agenda que sigue libre pocas horas antes. Por ejemplo: son las 11 y a las 3 no tienes a nadie.
            Aquí decides qué días y horas se pueden ofrecer y cuánto descuento como máximo.
          </HelpTip>
        </h2>
        <p className="mb-4 text-[15px] text-muted">Tú pones el límite: nunca damos más descuento que el que elijas.</p>

        <Card>
          <FormBoost accion={acciones?.guardar}>
            <FormField label="Descuento máximo, en %" hint="De 5 a 50. Ejemplo: 15. Es tu precio piso.">
              <Input name="descuento" type="number" inputMode="numeric" min={5} max={50} step={1} required defaultValue={config.descuento} className="w-28 tabular-nums" />
            </FormField>
            <FormField label="¿Cuántas horas antes avisar?" hint="De 1 a 12. Solo se ofrecen horarios que empiezan dentro de ese margen.">
              <Input name="aviso" type="number" inputMode="numeric" min={1} max={12} step={1} required defaultValue={config.aviso} className="w-28 tabular-nums" />
            </FormField>
            <fieldset className="flex flex-col gap-2 sm:col-span-2">
              <legend className="mb-2 text-[13px] font-medium text-ink">Días en que sí se ofrecen</legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <label
                    key={d}
                    className="flex min-h-[2.75rem] min-w-[2.75rem] cursor-pointer select-none items-center justify-center rounded-full border border-border px-4 text-sm text-ink transition-colors has-[:checked]:border-transparent has-[:checked]:bg-primary has-[:checked]:text-[rgb(var(--color-cta-fg))] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40"
                  >
                    <input type="checkbox" name="dias" value={d} defaultChecked={config.dias.includes(d)} className="sr-only" />
                    {DIAS[d]}
                  </label>
                ))}
              </div>
            </fieldset>
            <FormField label="Desde">
              <Select name="desde" defaultValue={config.desde} className="w-full">
                {HORAS.slice(0, 24).map((h) => (
                  <option key={h} value={h}>
                    {etiquetaHora(h)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Hasta">
              <Select name="hasta" defaultValue={config.hasta} className="w-full">
                {HORAS.slice(1).map((h) => (
                  <option key={h} value={h}>
                    {etiquetaHora(h)}
                  </option>
                ))}
              </Select>
            </FormField>
          </FormBoost>
        </Card>
      </section>

      <section aria-labelledby="boost-mes">
        <h2 id="boost-mes" className="mb-4 text-[17px] font-semibold tracking-tight text-ink">
          Lo que llevas este mes
        </h2>
        <Card>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 min-[420px]:grid-cols-3">
            {cifras.map((c) => (
              <div key={c.dt} className="min-w-0">
                <dt className="text-[13px] font-medium text-muted">{c.dt}</dt>
                <dd className="mt-1 truncate text-2xl font-semibold tabular-nums tracking-tight text-ink">{c.dd}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Dinero recuperado = lo que valen las citas que salieron de estos avisos y no se cancelaron.
          </p>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] font-medium text-ink">Mensajes de WhatsApp</p>
              <p className="text-[15px] font-semibold tabular-nums text-ink">
                {usados} <span className="font-normal text-muted">de {tope}</span>
              </p>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.07]"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={tope}
              aria-valuenow={usados}
              aria-label="Mensajes de WhatsApp usados este mes"
            >
              <div className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${pct}%`, background: VIOLETA }} />
            </div>
            <p className="mt-2 text-[13px] text-muted">Vienen {tope} incluidos al mes y se renuevan el día 1. Si se acaban, los avisos esperan al mes siguiente.</p>
          </div>
        </Card>
      </section>
    </div>
  );
}

function FormBoost({ accion, children }: { accion?: Accion; children: React.ReactNode }) {
  const clase = 'grid gap-5 sm:grid-cols-2';
  const pie = (boton: React.ReactNode) => <div className="sm:col-span-2">{boton}</div>;
  if (!accion) {
    return (
      <form className={clase}>
        {children}
        {pie(
          <Button type="button" className="max-sm:w-full">
            Guardar reglas
          </Button>
        )}
      </form>
    );
  }
  return (
    <ActionForm action={accion} success="Reglas guardadas" className={clase}>
      {children}
      {pie(<SubmitButton className="max-sm:w-full">Guardar reglas</SubmitButton>)}
    </ActionForm>
  );
}
