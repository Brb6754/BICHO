'use client';

import { useState, useTransition } from 'react';
import { Hourglass, Wallet } from 'lucide-react';
import type { ConfigAnticipo } from '@/lib/anticipos/config';
import { leerFormAnticipo, leerPesos } from '@/lib/anticiposPanel';
import { longDate } from '@/lib/dates/tenantTime';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Interruptor } from '@/components/tenant-dash/crecer/ui';
import { correrConAviso } from '@/components/tenant-dash/ui/ActionForm';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';

// "ANTICIPOS" — la vista que comparten el panel real y la demo.
//
// Con `guardar` escribe en la base (server action); sin él es la demo:
// todo responde en memoria y avisa que no se guarda nada. Un solo
// formulario con un solo "Guardar": el interruptor de arriba también se
// guarda con él, por eso los campos quedan escritos aunque lo apagues.

export type ConexionMp = { mpUserId: string; liveMode: boolean; connectedAt: string } | null;

const area =
  'w-full rounded-2xl border border-border bg-surface px-4 py-3 text-base text-ink placeholder:text-muted transition-shadow duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:opacity-60 sm:py-2.5 sm:text-sm';

const pesos = (n: number) => `$${n.toLocaleString('es-MX')}`;

export function AnticiposVista({
  slug,
  config,
  servicios,
  mp,
  timezone,
  puedeCambiar,
  guardar,
  sinInstrucciones = false,
}: {
  slug: string;
  config: ConfigAnticipo;
  servicios: { id: string; name: string; deposit_mxn?: number | null }[];
  mp: { habilitado: boolean; conexion: ConexionMp };
  timezone: string | null;
  puedeCambiar: boolean;
  /** Sin esto es la demo: nada se escribe. Puede devolver un `aviso` (guardado a medias). */
  guardar?: (fd: FormData) => Promise<{ aviso?: string } | void>;
  /** Falta db/062: «Cómo te pagan» todavía no se puede guardar. */
  sinInstrucciones?: boolean;
}) {
  const demo = !guardar;
  const [activado, setActivado] = useState(config.activado);
  const [general, setGeneral] = useState(config.montoGeneralMxn == null ? '' : String(config.montoGeneralMxn));
  const [porServicio, setPorServicio] = useState<Record<string, string>>(() =>
    Object.fromEntries(servicios.map((s) => [s.id, s.deposit_mxn == null ? '' : String(s.deposit_mxn)]))
  );
  const [enviando, startTransition] = useTransition();

  const generalMxn = leerPesos(general) ?? 0;
  // Lo que pide cada servicio, con la misma regla que lib/anticipos/config.ts (montoAnticipo).
  const cobra = (id: string) => {
    const propio = leerPesos(porServicio[id]);
    return propio == null ? generalMxn : propio;
  };

  return (
    <section id="anticipos" className="mt-10 max-w-3xl scroll-mt-24">
      <h2 className="mb-3 flex min-h-[2.75rem] items-center gap-1 text-[17px] font-semibold tracking-tight text-ink">
        Anticipos
        <HelpTip title="¿Cómo funciona el anticipo?">
          Cuando alguien agenda por WhatsApp, la recepcionista le aparta el horario y le pide el anticipo. Si no paga a
          tiempo, el horario se libera solo para alguien más. Si paga, la cita queda confirmada y en tu agenda dice
          «Anticipo pagado».
        </HelpTip>
      </h2>
      {/* Mismo estilo que ParaQue de whatsapp/Secciones.tsx. */}
      <p className="-mt-2 mb-4 text-[15px] leading-relaxed text-muted">
        Pide dinero para apartar las citas de WhatsApp, para que no te dejen plantada.
      </p>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              let aviso: string | undefined;
              const ok = await correrConAviso(
                async (datos: FormData) => {
                  if (guardar) {
                    aviso = (await guardar(datos))?.aviso;
                    return;
                  }
                  // La demo valida igual que el servidor, para que se sienta real.
                  const r = leerFormAnticipo(datos);
                  if (!r.ok) throw new Error(r.error);
                },
                fd,
                demo ? 'Listo (es una demo: aquí no se guarda nada)' : 'Anticipos guardados'
              );
              // Guardado a medias (falta db/062): este aviso reemplaza al de "guardados".
              if (ok && aviso) toast(aviso, 'error');
            });
          }}
          // Sin validación del navegador: un campo inválido escondido (anticipo apagado) bloquearía sin decir nada.
          noValidate
          className="flex flex-col gap-6"
        >
          <input type="hidden" name="activado" value={activado ? '1' : '0'} />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1 basis-64">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <span className={`h-2.5 w-2.5 rounded-full ${activado ? 'bg-success' : 'bg-ink/25'}`} aria-hidden="true" />
                {activado ? 'Pides anticipo para apartar' : 'Sin anticipo'}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {activado
                  ? 'Las citas por WhatsApp se apartan y se confirman cuando llega el pago.'
                  : 'Las citas se confirman directo, sin pedir dinero antes.'}
              </p>
            </div>
            {puedeCambiar && <Interruptor prendido={activado} etiqueta="Pedir anticipo" onToggle={setActivado} textos={['Sí', 'No']} />}
          </div>

          {/* `hidden` y no desmontar: lo escrito se guarda igual aunque lo apagues. */}
          <div hidden={!activado} className="flex flex-col gap-6 border-t border-border pt-6">
            <FormField label="Anticipo general" hint="En pesos. Lo piden todos los servicios que no tengan el suyo." optional>
              <Input
                name="monto_general"
                inputMode="numeric"
                placeholder="Ej. 150"
                value={general}
                onChange={(e) => setGeneral(e.target.value)}
                disabled={!puedeCambiar}
                className="w-full sm:w-48"
              />
            </FormField>

            {servicios.length > 0 && (
              <div>
                {/* div y no p: HelpTip trae su propio <p> adentro. */}
                <div className="flex items-center gap-1 text-[13px] font-medium text-ink">
                  Por servicio
                  <HelpTip title="¿Cómo pongo un anticipo distinto por servicio?">
                    Déjalo vacío y ese servicio pide el anticipo general. Pon otro monto si quieres que pida más o menos.
                    Pon 0 para que ese servicio no pida anticipo, por ejemplo un corte rápido.
                  </HelpTip>
                </div>
                <ul className="mt-1 divide-y divide-border rounded-2xl border border-border">
                  {servicios.map((s) => {
                    const monto = cobra(s.id);
                    return (
                      <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <label htmlFor={`dep-${s.id}`} className="block truncate text-[15px] font-medium text-ink">
                            {s.name}
                          </label>
                          <p className="text-[13px] text-muted">{monto > 0 ? `Pide ${pesos(monto)}` : 'Sin anticipo'}</p>
                        </div>
                        <Input
                          id={`dep-${s.id}`}
                          name={`servicio:${s.id}`}
                          inputMode="numeric"
                          placeholder="General"
                          aria-describedby={`dep-${s.id}-ayuda`}
                          value={porServicio[s.id] ?? ''}
                          onChange={(e) => setPorServicio((p) => ({ ...p, [s.id]: e.target.value }))}
                          disabled={!puedeCambiar}
                          className="w-24 shrink-0 text-right"
                        />
                        <span id={`dep-${s.id}-ayuda`} className="sr-only">
                          Vacío usa el anticipo general; 0 es sin anticipo.
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <FormField label="Tiempo para pagar" hint="En minutos, de 5 a 120. Si no paga, el horario se libera.">
                <Input
                  name="apartado_min"
                  type="number"
                  min={5}
                  max={120}
                  defaultValue={config.minutosApartado}
                  disabled={!puedeCambiar}
                  className="w-full"
                />
              </FormField>
              <FormField label="Puede reagendar hasta" hint="Horas antes de la cita, conservando su anticipo. Con menos, lo decides tú.">
                <Input
                  name="reagendar_horas"
                  type="number"
                  min={0}
                  max={720}
                  defaultValue={config.plazoReagendarHoras}
                  disabled={!puedeCambiar}
                  className="w-full"
                />
              </FormField>
            </div>

            <FormField
              label="Cómo te pagan"
              hint={
                sinInstrucciones
                  ? 'Todavía no se puede guardar: falta correr db/062. Lo demás sí se guarda.'
                  : 'Se lo mandamos a tu clienta cuando aparta. Lo puede ver cualquiera que reserve: pon solo datos para recibir dinero, nunca contraseñas.'
              }
              optional
            >
              <textarea
                name="instrucciones"
                rows={3}
                maxLength={500}
                placeholder="Ej. Transferencia a la CLABE 0123 4567 8901 2345 67 a nombre de Ana López. O en efectivo en el local."
                defaultValue={config.instrucciones ?? ''}
                disabled={!puedeCambiar}
                className={area}
              />
            </FormField>

            <FormField label="Tu política" hint="Se la decimos a tu cliente cuando le pedimos el anticipo." optional>
              <textarea
                name="politica"
                rows={3}
                maxLength={500}
                placeholder="Ej. El anticipo se descuenta del total. Si cancelas con menos de 24 horas, no se devuelve."
                defaultValue={config.politica ?? ''}
                disabled={!puedeCambiar}
                className={area}
              />
            </FormField>
          </div>

          {puedeCambiar ? (
            <Button type="submit" isLoading={enviando} className="self-start max-sm:w-full">
              {enviando ? 'Guardando…' : 'Guardar anticipos'}
            </Button>
          ) : (
            <p className="text-sm text-muted">Solo el dueño o un administrador cambia los anticipos.</p>
          )}
        </form>
      </Card>

      <CobroEnLinea slug={slug} mp={mp} timezone={timezone} puedeCambiar={puedeCambiar} demo={demo} />
    </section>
  );
}

function CobroEnLinea({
  slug,
  mp,
  timezone,
  puedeCambiar,
  demo,
}: {
  slug: string;
  mp: { habilitado: boolean; conexion: ConexionMp };
  timezone: string | null;
  puedeCambiar: boolean;
  demo: boolean;
}) {
  const [conexion, setConexion] = useState(mp.conexion);
  const boton =
    'inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-sm:w-full';

  if (!mp.habilitado) {
    return (
      <Card className="mt-4">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Hourglass className="h-4 w-4 shrink-0" aria-hidden="true" />
          Cobro en línea: próximamente
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Por ahora, cuando alguien aparta, la recepcionista le manda lo que escribiste en «Cómo te pagan». Cuando te
          pague, márcalo en la cita con «Ya pagó» (en tu agenda o en el inicio) para que no se libere.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4 flex flex-col gap-4">
      <div>
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
          {conexion ? 'Mercado Pago conectado' : 'Cobra el anticipo con Mercado Pago'}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {conexion
            ? `Cuenta ${conexion.mpUserId}, conectada el ${longDate(conexion.connectedAt, timezone).toLowerCase()}${conexion.liveMode ? '' : ' (en modo de prueba)'}. La recepcionista manda un link de pago con cada apartado.`
            : 'Conéctalo y la recepcionista manda un link de pago con cada apartado.'}{' '}
          El dinero llega directo a tu cuenta de Mercado Pago; bicho no lo toca.
        </p>
      </div>
      {puedeCambiar &&
        (demo ? (
          <button
            type="button"
            onClick={() => {
              setConexion(conexion ? null : { mpUserId: '123456789', liveMode: true, connectedAt: new Date().toISOString() });
              toast('Es una demo: aquí no se conecta nada.');
            }}
            className={`${boton} self-start ${conexion ? 'border border-border text-ink hover:bg-ink/[0.04]' : 'bg-primary text-[rgb(var(--color-cta-fg))] shadow-sm hover:brightness-110'}`}
          >
            {conexion ? 'Desconectar' : 'Conectar Mercado Pago'}
          </button>
        ) : conexion ? (
          <form method="post" action="/api/mercadopago/oauth/disconnect" className="self-start max-sm:w-full">
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" className={`${boton} border border-border text-ink hover:bg-ink/[0.04]`}>
              Desconectar
            </button>
          </form>
        ) : (
          // Navegación completa a propósito: es una ruta de API que manda a Mercado Pago.
          <a
            href={`/api/mercadopago/oauth/start?slug=${encodeURIComponent(slug)}`}
            className={`${boton} self-start bg-primary text-[rgb(var(--color-cta-fg))] shadow-sm hover:brightness-110`}
          >
            Conectar Mercado Pago
          </a>
        ))}
    </Card>
  );
}
