'use client';

import { useTransition } from 'react';
import { BadgeCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { correrConAviso } from '@/components/tenant-dash/ui/ActionForm';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { MINUTOS_EXTRA } from '@/lib/anticipos/manual';
import { darMasTiempoAnticipo, liberarAnticipo, marcarAnticipoPagado } from './anticipoActions';

// Lo que se hace con una cita apartada que espera su anticipo: "Ya pagó",
// "Dar más tiempo" y "Liberar ahora". Lo usan la hoja de la cita (agenda)
// y "Apartados por cobrar" (inicio). En la demo, `demo` cambia la cita
// solo en la página y avisa que es un ejemplo.

export type DemoAnticipo = (accion: 'pagado' | 'tiempo' | 'liberar') => void;

const pesos = (n: number) => `$${n.toLocaleString('es-MX')}`;
const BOTON = 'min-h-12 px-5 !text-base font-semibold';

export function AccionesAnticipo({
  slug,
  bookingId,
  nombre,
  montoMxn,
  demo,
  className = '',
}: {
  slug: string;
  bookingId: string;
  nombre: string;
  montoMxn: number | null | undefined;
  demo?: DemoAnticipo;
  className?: string;
}) {
  const [dando, startTransition] = useTransition();
  const monto = montoMxn ? ` de ${pesos(montoMxn)}` : '';
  const horas = MINUTOS_EXTRA % 60 === 0 ? `${MINUTOS_EXTRA / 60} h` : `${MINUTOS_EXTRA} min`;

  if (demo) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <Button type="button" variant="success" className={`${BOTON} w-full`} onClick={() => demo('pagado')}>
          <BadgeCheck className="h-5 w-5" aria-hidden="true" />
          Ya pagó
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className={BOTON} onClick={() => demo('tiempo')}>
            <Clock className="h-4 w-4" aria-hidden="true" />
            {horas} más
          </Button>
          <Button type="button" variant="danger" className={BOTON} onClick={() => demo('liberar')}>
            Liberar ahora
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <ConfirmForm
        action={marcarAnticipoPagado.bind(null, slug, bookingId)}
        success="Anticipo pagado: la cita quedó confirmada"
        confirmTitle={`¿${nombre} ya te pagó el anticipo${monto}?`}
        confirmMessage="La cita queda confirmada y ya no se libera sola. Si tienes prendida la recepcionista de WhatsApp, le mandamos su comprobante."
        confirmLabel="Sí, ya me pagó"
        dismissLabel="Todavía no"
        triggerVariant="success"
        triggerClassName={`${BOTON} w-full`}
      >
        <BadgeCheck className="h-5 w-5" aria-hidden="true" />
        Ya pagó
      </ConfirmForm>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className={BOTON}
          isLoading={dando}
          onClick={() =>
            startTransition(async () => {
              await correrConAviso(darMasTiempoAnticipo.bind(null, slug, bookingId), new FormData(), `Le diste ${horas} más para pagar`);
            })
          }
        >
          {!dando && <Clock className="h-4 w-4" aria-hidden="true" />}
          {horas} más
        </Button>
        <ConfirmForm
          action={liberarAnticipo.bind(null, slug, bookingId)}
          success="Horario liberado"
          confirmTitle={`¿Liberar el horario de ${nombre}?`}
          confirmMessage={`La cita se cancela y la hora vuelve a quedar libre en tu página. A ${nombre} no le avisamos nosotros: si no lo sabe, escríbele.`}
          confirmLabel="Sí, liberar"
          dismissLabel="No, esperar"
          triggerClassName={`${BOTON} w-full`}
        >
          Liberar ahora
        </ConfirmForm>
      </div>
    </div>
  );
}

/** Aviso de la demo para cada acción, en el mismo tono que la Agenda demo. */
export const AVISO_DEMO: Record<Parameters<DemoAnticipo>[0], string> = {
  pagado: 'Ejemplo: anticipo pagado. En tu panel la cita queda confirmada y le llega su comprobante por WhatsApp.',
  tiempo: 'Ejemplo: le diste más tiempo para pagar. No se guardó nada.',
  liberar: 'Ejemplo: horario liberado. No se guardó nada.',
};

export function avisarDemo(accion: Parameters<DemoAnticipo>[0]) {
  toast(AVISO_DEMO[accion]);
}
