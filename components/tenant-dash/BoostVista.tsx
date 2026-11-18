import { BellRing, CalendarCheck, CalendarHeart, CalendarX2, Clock3, ExternalLink, HandCoins, MessageCircle, Send } from 'lucide-react';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { ActionForm, SubmitButton } from '@/components/tenant-dash/ui/ActionForm';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Anillo, Avatar, DeslizadorAviso, DeslizadorDescuento, Interruptor, PasosIlustrados } from '@/components/tenant-dash/crecer/ui';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';
import { DIAS, FRANJAS, formatoPesos, type ResultadosBoost } from '@/lib/boost/reglas';

// "Llena tus huecos" (Boost de clientes). La usan el panel real
// (/dashboard/boost, con acciones) y la demo pública (/panel/boost, sin
// acciones: los controles se mueven en pantalla pero no mandan nada).
// Server component; lo que se mueve vive en crecer/ui.
//
// Orden: lo que llevas este mes (lo que ella viene a ver), cómo funciona
// (plegado cuando ya lo usa), los dos interruptores, las reglas con
// ejemplos y quién está apuntada.

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

const PASOS = [
  { icono: <CalendarX2 />, titulo: 'Se libera un horario', texto: 'Alguien cancela, o en unas horas tienes un hueco vacío.' },
  { icono: <Send />, titulo: 'Les avisamos por WhatsApp', texto: 'Solo a clientas que se apuntaron o aceptaron promociones.' },
  { icono: <CalendarCheck />, titulo: 'La primera lo aparta', texto: 'Reserva desde tu página y la cita cae sola en tu agenda.' },
];

function Herramienta({
  icono: Icono,
  titulo,
  valor,
  ayuda,
  prendido,
  accion,
}: {
  icono: typeof BellRing;
  titulo: string;
  valor: string;
  ayuda: React.ReactNode;
  prendido: boolean;
  accion?: Accion;
}) {
  return (
    <article className={`flex h-full flex-col gap-4 rounded-3xl border bg-surface p-5 shadow-sm transition-colors sm:p-6 ${prendido ? 'border-success/40' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${VIOLETA}1a`, color: VIOLETA }} aria-hidden="true">
          <Icono className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 text-[18px] font-semibold leading-snug tracking-tight text-ink">
            {titulo}
            {ayuda}
          </h3>
          <p className="mt-1 text-[15px] leading-relaxed text-muted">{valor}</p>
        </div>
      </div>
      <div className="mt-auto border-t border-border pt-4">
        {accion ? (
          <ActionForm action={accion} success={prendido ? `${titulo}: apagado` : `${titulo}: prendido`}>
            <Interruptor type="submit" prendido={prendido} etiqueta={titulo} />
          </ActionForm>
        ) : (
          <Interruptor prendido={prendido} etiqueta={titulo} />
        )}
      </div>
    </article>
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
  const activas = contactos.filter((c) => !c.baja).length;
  const cifras = [
    { icono: MessageCircle, dt: 'Horarios ofrecidos', dd: String(resultados.huecosOfrecidos) },
    { icono: CalendarCheck, dt: 'Citas que se llenaron', dd: String(resultados.huecosLlenados) },
    { icono: HandCoins, dt: 'Dinero recuperado', dd: formatoPesos(resultados.recuperadoCents) },
  ];
  const nada = !vipPrendido && !flojasPrendido;

  return (
    <div className="mt-8 space-y-10">
      {aviso && <p className="rounded-2xl bg-warning-soft px-4 py-3 text-[15px] leading-relaxed text-ink">{aviso}</p>}

      <section aria-labelledby="boost-mes">
        <h2 id="boost-mes" className="mb-4 flex items-center gap-1 text-[17px] font-semibold tracking-tight text-ink">
          Lo que llevas este mes
          <HelpTip title="¿Qué es el dinero recuperado?">
            Lo que valen las citas que salieron de estos avisos y no se cancelaron. Vienen {tope} mensajes de WhatsApp
            incluidos al mes y se renuevan el día 1; si se acaban, los avisos esperan al mes siguiente.
          </HelpTip>
        </h2>
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex items-center gap-4 rounded-3xl border border-border bg-surface p-5 lg:flex-col lg:justify-center lg:px-8">
            <Anillo valor={usados} tope={tope} color={VIOLETA} etiqueta="Mensajes de WhatsApp usados este mes" />
            <p className="text-[15px] leading-snug text-ink lg:text-center">
              <span className="font-semibold">Mensajes usados</span>
              <span className="block text-muted">Te quedan {Math.max(0, tope - usados)}</span>
            </p>
          </div>
          <dl className="grid gap-3 min-[460px]:grid-cols-3">
            {cifras.map((c) => (
              <div key={c.dt} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-surface p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `${VIOLETA}1a`, color: VIOLETA }} aria-hidden="true">
                  <c.icono className="h-5 w-5" />
                </span>
                <div className="mt-auto min-w-0">
                  <dd className="truncate text-[2rem] font-semibold leading-none tabular-nums tracking-tight text-ink">{c.dd}</dd>
                  <dt className="mt-2 text-[15px] text-muted">{c.dt}</dt>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <details className="group rounded-3xl border border-border bg-surface p-4 sm:p-5" open={nada}>
        <summary className="flex min-h-[2.75rem] cursor-pointer list-none items-center justify-between gap-3 text-[17px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
          ¿Cómo funciona?
          <span className="text-[15px] font-medium text-muted group-open:hidden">Ver los 3 pasos</span>
          <span className="hidden text-[15px] font-medium text-muted group-open:inline">Ocultar</span>
        </summary>
        <div className="mt-4">
          <PasosIlustrados pasos={PASOS} color={VIOLETA} />
        </div>
      </details>

      <section aria-labelledby="boost-herramientas">
        <h2 id="boost-herramientas" className="sr-only">
          Las dos herramientas
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Herramienta
            icono={BellRing}
            titulo="Lista VIP"
            valor="Si alguien cancela, avisamos a las clientas que querían ese horario."
            ayuda={
              <HelpTip title="¿Cómo funciona la lista VIP?">
                Tus clientas se apuntan en tu página de reservas con su teléfono («Avísame si se libera algo»). Cuando
                alguien cancela, les llega un aviso sin descuento y la primera que aparta se queda el lugar.
              </HelpTip>
            }
            prendido={vipPrendido}
            accion={acciones?.vip}
          />
          <Herramienta
            icono={Clock3}
            titulo="Horas flojas"
            valor="Ofrecemos con descuento los horarios que siguen vacíos pocas horas antes."
            ayuda={
              <HelpTip title="¿Cómo funcionan las horas flojas?">
                Solo a quien aceptó recibir promociones, máximo una por semana. El descuento dura 20 minutos; después el
                link sigue funcionando, a precio normal. Tú eliges el descuento máximo abajo.
              </HelpTip>
            }
            prendido={flojasPrendido}
            accion={acciones?.flojas}
          />
        </div>
      </section>

      <section aria-labelledby="boost-reglas">
        <h2 id="boost-reglas" className="mb-4 text-[17px] font-semibold tracking-tight text-ink">
          Reglas de las horas flojas
        </h2>
        <div className="rounded-3xl border border-border bg-surface p-4 sm:p-6">
          <FormBoost accion={acciones?.guardar}>
            <DeslizadorDescuento inicial={config.descuento} />
            <DeslizadorAviso inicial={config.aviso} />
            <fieldset className="flex flex-col gap-2 sm:col-span-2">
              <legend className="mb-2 text-[15px] font-medium text-ink">Días en que sí se ofrecen</legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <label
                    key={d}
                    className="flex min-h-[2.75rem] min-w-[3.25rem] cursor-pointer select-none items-center justify-center rounded-full border border-border px-4 text-[15px] font-medium text-ink transition-colors has-[:checked]:border-transparent has-[:checked]:bg-primary has-[:checked]:text-[rgb(var(--color-cta-fg))] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40"
                  >
                    <input type="checkbox" name="dias" value={d} defaultChecked={config.dias.includes(d)} className="sr-only" />
                    {DIAS[d]}
                  </label>
                ))}
              </div>
            </fieldset>
            <FormField label="Desde las">
              <Select name="desde" defaultValue={config.desde} className="w-full">
                {HORAS.slice(0, 24).map((h) => (
                  <option key={h} value={h}>
                    {etiquetaHora(h)}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Hasta las">
              <Select name="hasta" defaultValue={config.hasta} className="w-full">
                {HORAS.slice(1).map((h) => (
                  <option key={h} value={h}>
                    {etiquetaHora(h)}
                  </option>
                ))}
              </Select>
            </FormField>
          </FormBoost>
        </div>
      </section>

      <section aria-label="Clientas apuntadas">
        <SectionHeading
          title="Clientas apuntadas"
          meta={activas || undefined}
          action={
            <a
              href={linkPublico}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[2.75rem] items-center gap-1.5 text-[15px] font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Dónde se apuntan
            </a>
          }
        />

        {contactos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-5 [&>div]:py-10">
            <EmptyState
              icon={CalendarHeart}
              title="Nadie se ha apuntado todavía"
              description={
                vipPrendido
                  ? 'Comparte tu página de reservas: tus clientas verán la opción para que les avises.'
                  : 'Prende la lista VIP y la opción aparece en tu página de reservas.'
              }
              why="Cada clienta apuntada es una cita que no se pierde cuando alguien cancela."
            />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {contactos.map((c) => (
              <li key={c.id} className={`flex gap-3 rounded-3xl border border-border bg-surface p-4 ${c.baja ? 'opacity-60' : ''}`}>
                <Avatar nombre={c.nombre} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-semibold text-ink">{c.nombre}</p>
                  <p className="text-[14px] tabular-nums text-muted">{telefonoVisible(c.telefono)}</p>
                  <p className="mt-2 text-[15px] text-ink">{c.servicio ?? 'Cualquier servicio'}</p>
                  <p className="text-[14px] text-muted">{cuandoPuede(c)}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-[13px] font-semibold ${
                      c.baja ? 'bg-ink/[0.06] text-muted' : c.promos ? 'bg-success-soft text-success' : 'bg-ink/[0.06] text-ink'
                    }`}
                  >
                    {c.baja ? 'Ya no quiere avisos' : c.promos ? 'Acepta promociones' : 'Solo avisos'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FormBoost({ accion, children }: { accion?: Accion; children: React.ReactNode }) {
  const clase = 'grid gap-6 sm:grid-cols-2';
  const pie = (boton: React.ReactNode) => <div className="sm:col-span-2">{boton}</div>;
  if (!accion) {
    return (
      <form className={clase}>
        {children}
        {pie(
          <Button type="button" className="!min-h-[3rem] !text-[16px] max-sm:w-full">
            Guardar reglas
          </Button>
        )}
      </form>
    );
  }
  return (
    <ActionForm action={accion} success="Reglas guardadas" className={clase}>
      {children}
      {pie(<SubmitButton className="!min-h-[3rem] !text-[16px] max-sm:w-full">Guardar reglas</SubmitButton>)}
    </ActionForm>
  );
}
