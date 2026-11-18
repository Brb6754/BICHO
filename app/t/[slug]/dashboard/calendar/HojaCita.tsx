'use client';

import Link from 'next/link';
import { Check, MessageCircle, Wallet, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { toast } from '@/components/tenant-dash/ui/Toast';
import type { AgendaBooking } from '@/components/tenant-dash/AgendaList';
import { appointmentWhen, formatTime, minutesBetween } from '@/lib/dates/tenantTime';
import { ESTADOS } from '@/lib/agenda/calendario';
import { primerNombre, waLink } from '@/lib/regresan/mensajes';
import { cancelBooking } from './actions';
import { RescheduleButton } from './RescheduleButton';
import { AttendanceButtons } from './AttendanceButtons';

// El detalle de una cita: lo que se abre al tocar su bloque en el
// calendario. Una hoja abajo en el teléfono (Modal), con las acciones que
// ya existían en la lista —Mover, Cancelar, Vino / No vino— más WhatsApp
// y Cobrar.
//
// En la demo las mismas acciones cambian la cita solo en esta página y
// cada una dice que es un ejemplo: así se puede recorrer agendar →
// atender → cobrar sin escribir nada en ningún lado.

export type AccionesDemo = {
  estado: (id: string, status: string, aviso: string) => void;
  cobrar: (id: string) => void;
  cobrada: boolean;
};

const grande = 'min-h-12 w-full px-5 !text-base font-semibold';
const enlace =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-base font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2';

export function HojaCita({
  cita,
  persona,
  timezone,
  ahora,
  slug,
  negocio,
  cajaHref,
  demo,
  onClose,
}: {
  cita: AgendaBooking | null;
  persona: { name: string; color: string } | null;
  timezone: string | null;
  ahora: Date;
  slug: string;
  negocio: string;
  /** null si el negocio no tiene Caja. */
  cajaHref: string | null;
  demo?: AccionesDemo;
  onClose: () => void;
}) {
  if (!cita) return null;

  const nombre = cita.customers?.name ?? 'Clienta';
  const servicio = cita.service_types?.name ?? 'Servicio';
  const status = cita.status;
  const paso = new Date(cita.ends_at) <= ahora;
  const confirmada = status === 'confirmed';
  const wa = waLink(
    cita.customers?.phone,
    `¡Hola ${primerNombre(nombre)}! Te escribo de ${negocio} por tu cita del ${appointmentWhen(cita.starts_at, timezone)}.`
  );

  return (
    <Modal open onClose={onClose} title={nombre}>
      <div className="flex flex-col gap-5">
        <dl className="grid gap-3 text-base">
          <div>
            <dt className="text-[13px] font-medium text-muted">Servicio</dt>
            <dd className="font-semibold text-ink">{servicio}</dd>
          </div>
          <div>
            <dt className="text-[13px] font-medium text-muted">Cuándo</dt>
            <dd className="text-ink">
              {appointmentWhen(cita.starts_at, timezone)} a {formatTime(cita.ends_at, timezone)}{' '}
              <span className="text-muted">({minutesBetween(cita.starts_at, cita.ends_at)} min)</span>
            </dd>
          </div>
          {persona && (
            <div>
              <dt className="text-[13px] font-medium text-muted">La atiende</dt>
              <dd className="flex items-center gap-2 text-ink">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: persona.color }} aria-hidden="true" />
                {persona.name}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-[13px] font-medium text-muted">Cómo va</dt>
            <dd>
              <EtiquetaEstado status={status} />
              {demo?.cobrada && (
                <span className="ml-2 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[15px] font-semibold text-[#14532D]">
                  Cobrada (ejemplo)
                </span>
              )}
            </dd>
          </div>
        </dl>

        {/* Antes de la cita: moverla o cancelarla. */}
        {confirmada && (!paso || demo) && (
          <div className="flex flex-col gap-2">
            {demo ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className={grande}
                  onClick={() =>
                    toast('En la demo no se mueve la cita. En tu panel eliges la hora nueva de una lista de horas libres.')
                  }
                >
                  Mover a otra hora
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className={grande}
                  onClick={() => demo.estado(cita.id, 'cancelled', 'Ejemplo: cita cancelada. No se guardó nada.')}
                >
                  Cancelar la cita
                </Button>
              </>
            ) : (
              <>
                {cita.service_type_id && cita.resource_id && (
                  <RescheduleButton
                    bookingId={cita.id}
                    slug={slug}
                    serviceId={cita.service_type_id}
                    serviceName={servicio}
                    resourceId={cita.resource_id}
                    currentStart={cita.starts_at}
                    timezone={timezone}
                  />
                )}
                <ConfirmForm
                  action={cancelBooking.bind(null, cita.id, slug)}
                  success="Cita cancelada: la hora quedó libre"
                  confirmTitle={`¿Cancelar la cita de ${nombre}?`}
                  confirmMessage={`${servicio}, ${formatTime(cita.starts_at, timezone)}. La hora vuelve a quedar libre en tu página. A ${nombre} no le avisamos nosotros: si no lo sabe, escríbele.`}
                  confirmLabel="Sí, cancelar cita"
                  dismissLabel="No, dejarla"
                  triggerClassName={grande}
                >
                  Cancelar la cita
                </ConfirmForm>
              </>
            )}
          </div>
        )}

        {/* Después de la cita: ¿vino? */}
        {confirmada && (paso || demo) && (
          <div className="flex flex-col gap-2">
            <p className="text-[15px] font-semibold text-ink">¿Vino a su cita?</p>
            {demo ? (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 flex-1 px-5 !text-base font-semibold"
                    onClick={() => demo.estado(cita.id, 'completed', 'Ejemplo: anotaste que vino. Ya puedes cobrarla.')}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Vino
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="min-h-12 flex-1 px-5 !text-base font-semibold"
                    onClick={() => demo.estado(cita.id, 'no_show', 'Ejemplo: anotaste que no vino. No se guardó nada.')}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    No vino
                  </Button>
                </div>
                {!paso && (
                  <p className="text-[13px] leading-relaxed text-muted">
                    En tu panel, Vino y No vino aparecen cuando ya pasó la hora de la cita.
                  </p>
                )}
              </>
            ) : (
              <AttendanceButtons bookingId={cita.id} slug={slug} customerName={nombre} />
            )}
            {cajaHref && (
              <p className="text-[13px] leading-relaxed text-muted">Al tocar Vino, su cobro aparece en Caja.</p>
            )}
          </div>
        )}

        {/* Ya vino: cobrar. */}
        {status === 'completed' &&
          cajaHref &&
          (demo ? (
            <Button
              type="button"
              className={grande}
              disabled={demo.cobrada}
              onClick={() => demo.cobrar(cita.id)}
            >
              <Wallet className="h-5 w-5" aria-hidden="true" />
              {demo.cobrada ? 'Ya está cobrada' : 'Cobrar'}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href={`${cajaHref}?cita=${cita.id}`}
                className={`${enlace} bg-primary text-[rgb(var(--color-cta-fg))]`}
              >
                <Wallet className="h-5 w-5" aria-hidden="true" />
                Cobrar en Caja
              </Link>
              <p className="text-[13px] leading-relaxed text-muted">
                Su cobro ya está en Caja con el precio del servicio. Ahí lo cambias si te pagó otra cantidad.
              </p>
            </div>
          ))}

        {(wa || demo) &&
          (demo ? (
            <button
              type="button"
              onClick={() =>
                toast('En la demo no abrimos WhatsApp. En tu panel se abre el chat con tu clienta y un mensaje listo.')
              }
              className={`${enlace} bg-[#177a41] text-white hover:brightness-110`}
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Escribirle por WhatsApp
            </button>
          ) : (
            <a href={wa!} target="_blank" rel="noreferrer" className={`${enlace} bg-[#177a41] text-white hover:brightness-110`}>
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Escribirle por WhatsApp
            </a>
          ))}
      </div>
    </Modal>
  );
}

const TONO_ESTADO: Record<string, string> = {
  confirmed: 'bg-primary/10 text-ink',
  completed: 'bg-[#DCFCE7] text-[#14532D]',
  no_show: 'bg-[#FEF3C7] text-[#78350F]',
  cancelled: 'bg-ink/[0.06] text-muted',
};

export function EtiquetaEstado({ status, chica = false }: { status: string; chica?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${chica ? 'px-2 py-px text-[13px]' : 'px-2.5 py-0.5 text-[15px]'} ${TONO_ESTADO[status] ?? TONO_ESTADO.confirmed}`}
    >
      {ESTADOS[status] ?? status}
    </span>
  );
}
