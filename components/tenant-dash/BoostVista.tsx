import { CalendarHeart, Zap } from 'lucide-react';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';
import { COSTO_ESTIMADO_MXN, DIAS, FRANJAS, formatoPesos, type ResultadosBoost } from '@/lib/boost/reglas';

// La vista de Boost de clientes. La usan el panel real (/dashboard/boost,
// con acciones) y la demo pública (/panel/boost, sin acciones: los
// controles se ven igual pero no mandan nada). Server component.

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

function Interruptor({ prendido, etiqueta, accion }: { prendido: boolean; etiqueta: string; accion?: Accion }) {
  const boton = (
    <Button type={accion ? 'submit' : 'button'} variant={prendido ? 'outline' : 'primary'}>
      {prendido ? `Apagar ${etiqueta}` : `Prender ${etiqueta}`}
    </Button>
  );
  return accion ? <form action={accion}>{boton}</form> : boton;
}

function Estado({ prendido }: { prendido: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
      <span className={`h-2 w-2 rounded-full ${prendido ? '' : 'bg-ink/25'}`} style={prendido ? { background: VIOLETA } : undefined} aria-hidden="true" />
      {prendido ? 'Prendida' : 'Apagada'}
    </span>
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
  /** Algo que el dueño tiene que saber antes de todo (migración, WhatsApp sin conectar). */
  aviso?: string | null;
  /** Sin acciones = demo: los controles se ven, no envían. */
  acciones?: { vip: Accion; flojas: Accion; guardar: Accion };
}) {
  const pct = Math.min(100, Math.round((usados / tope) * 100));
  const activas = contactos.filter((c) => !c.baja).length;
  const cifras = [
    { dt: 'Huecos ofrecidos', dd: String(resultados.huecosOfrecidos) },
    { dt: 'Huecos llenados', dd: String(resultados.huecosLlenados) },
    { dt: 'Recuperado', dd: formatoPesos(resultados.recuperadoCents) },
    {
      dt: 'Costo de mensajes',
      dd: `≈ ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(resultados.costoEstimadoMxn)}`,
    },
  ];

  return (
    <div className="mt-6 space-y-12">
      {aviso && <p className="rounded-2xl bg-warning-soft px-4 py-3 text-sm text-ink">{aviso}</p>}

      <section aria-labelledby="boost-mes">
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="boost-mes" className="text-[15px] font-semibold text-ink">
              Mensajes usados este mes
            </h2>
            <p className="text-[15px] font-semibold tabular-nums text-ink">
              {usados} <span className="font-normal text-muted">/ {tope}</span>
            </p>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={tope}
            aria-valuenow={usados}
            aria-label="Mensajes usados este mes"
          >
            <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: VIOLETA }} />
          </div>
          <p className="mt-2 text-xs text-muted">Se renuevan el día 1. Al llegar al tope, Boost deja de mandar hasta el mes siguiente.</p>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-4">
            {cifras.map((c) => (
              <div key={c.dt} className="min-w-0">
                <dt className="text-xs font-medium text-muted">{c.dt}</dt>
                <dd className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-ink">{c.dd}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Recuperado = suma del precio de las citas que salieron de Boost este mes y no se cancelaron. El costo es una estimación
            (≈ MX${COSTO_ESTIMADO_MXN.vip.toFixed(2)} por aviso y ≈ MX${COSTO_ESTIMADO_MXN.flojas.toFixed(2)} por promoción, tarifa de Meta), no tu factura.
          </p>
        </Card>
      </section>

      <section aria-label="Lista VIP de cancelaciones">
        <SectionHeading title="Lista VIP de cancelaciones" meta={activas} action={<Interruptor prendido={vipPrendido} etiqueta="lista VIP" accion={acciones?.vip} />} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Estado prendido={vipPrendido} />
          <a href={linkPublico} target="_blank" rel="noreferrer" className="text-sm font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            Ver dónde se apuntan
          </a>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Tus clientas se apuntan en tu página de reservas con su teléfono y el permiso para escribirles. Cuando se cancela una cita, le
          avisamos por WhatsApp a quien le acomoda ese horario, sin descuento. La primera que lo aparta se lo queda; a las demás les decimos
          que ya lo ganaron.
        </p>

        {contactos.length === 0 ? (
          <Card className="mt-5" padded={false}>
            <EmptyState
              icon={CalendarHeart}
              title="Nadie se ha apuntado todavía"
              description={vipPrendido ? 'Comparte tu página de reservas: abajo del calendario aparece "Avísame si se libera algo".' : 'Prende la lista VIP para que aparezca en tu página de reservas.'}
            />
          </Card>
        ) : (
          <Card className="mt-5" padded={false}>
            <ul className="divide-y divide-border">
              {contactos.map((c) => (
                <li key={c.id} className={`grid gap-1 px-5 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-4 ${c.baja ? 'opacity-60' : ''}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{c.nombre}</p>
                    <p className="text-xs tabular-nums text-muted">{telefonoVisible(c.telefono)}</p>
                  </div>
                  <p className="truncate text-sm text-ink">{c.servicio ?? 'Cualquier servicio'}</p>
                  <p className="text-sm text-muted">{cuandoPuede(c)}</p>
                  <p className="text-xs font-medium text-muted sm:text-right">{c.baja ? 'Se dio de baja' : c.promos ? 'Acepta promociones' : 'Solo avisos'}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section aria-label="Horas flojas">
        <SectionHeading title="Horas flojas" action={<Interruptor prendido={flojasPrendido} etiqueta="horas flojas" accion={acciones?.flojas} />} />
        <Estado prendido={flojasPrendido} />
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Una vez al día revisamos los huecos libres de las próximas horas y se los ofrecemos con descuento a clientas que suelen venir a esa
          hora y aceptaron promociones. El descuento solo vale 20 minutos y cada clienta recibe como mucho una promoción por semana. Pasada la
          ventana, el link sigue sirviendo, pero a precio normal.
        </p>

        <Card className="mt-5">
          <form action={acciones?.guardar} className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="boost-descuento">Descuento máximo</Label>
              <div className="flex items-center gap-2">
                <Input id="boost-descuento" name="descuento" type="number" min={5} max={50} step={1} defaultValue={config.descuento} className="w-24 tabular-nums" />
                <span className="text-sm text-muted">%</span>
              </div>
              <p className="text-xs text-muted">Tu precio piso: nunca damos más descuento que este.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="boost-aviso">Avisar con</Label>
              <div className="flex items-center gap-2">
                <Input id="boost-aviso" name="aviso" type="number" min={1} max={12} step={1} defaultValue={config.aviso} className="w-24 tabular-nums" />
                <span className="text-sm text-muted">horas de anticipación</span>
              </div>
              <p className="text-xs text-muted">Solo se ofrecen huecos que empiezan dentro de ese margen.</p>
            </div>
            <fieldset className="flex flex-col gap-2 sm:col-span-2">
              <legend className="mb-2 text-sm font-medium text-ink">Días permitidos</legend>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <label
                    key={d}
                    className="cursor-pointer select-none rounded-full border border-border px-3.5 py-1.5 text-sm text-ink transition-colors has-[:checked]:border-transparent has-[:checked]:bg-primary has-[:checked]:text-[rgb(var(--color-cta-fg))] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40"
                  >
                    <input type="checkbox" name="dias" value={d} defaultChecked={config.dias.includes(d)} className="sr-only" />
                    {DIAS[d]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="boost-desde">Desde</Label>
              <Select id="boost-desde" name="desde" defaultValue={config.desde} className="w-full">
                {HORAS.slice(0, 24).map((h) => (
                  <option key={h} value={h}>
                    {etiquetaHora(h)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="boost-hasta">Hasta</Label>
              <Select id="boost-hasta" name="hasta" defaultValue={config.hasta} className="w-full">
                {HORAS.slice(1).map((h) => (
                  <option key={h} value={h}>
                    {etiquetaHora(h)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type={acciones ? 'submit' : 'button'} variant="secondary">
                <Zap className="h-4 w-4" aria-hidden="true" /> Guardar horas flojas
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </div>
  );
}
