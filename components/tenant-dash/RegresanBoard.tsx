'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, Mail, MessageCircle, Star, UserRoundX } from 'lucide-react';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { mailtoLink, waLink } from '@/lib/regresan/mensajes';

// La pantalla de "Clientes que regresan", separada de la página para
// que el panel real y la demo pública (/panel/regresan) dibujen lo mismo.
//
// Ningún botón manda nada: abre WhatsApp (wa.me) o el correo con el texto
// listo para que el dueño lo revise y lo envíe él. Envío masivo
// automático = número baneado.

export type FilaRegresan = {
  key: string;
  name: string;
  phone: string | null;
  email?: string | null;
  /** "Hace 7 semanas · Retoque de uñas" */
  detalle: string;
  mensaje: string;
};

export type ProximoRecordatorio = {
  id: string;
  name: string;
  cuando: string;
  estado: 'enviado' | 'pendiente' | 'sin-canal';
};

/** El "¿qué es esto?" del encabezado, compartido por el panel y la demo. */
export function AyudaRegresan() {
  return (
    <HelpTip title="¿Esto manda mensajes solo?">
      Solo el recordatorio de cita, un día antes. Lo demás lo mandas tú: tocas «Escribirle», revisas el mensaje y se
      abre tu WhatsApp con el texto listo. Nadie recibe mensajes en masa y tu número no corre riesgo.
    </HelpTip>
  );
}

const ESTADO_LABEL: Record<ProximoRecordatorio['estado'], string> = {
  enviado: 'Recordatorio enviado',
  pendiente: 'Se manda solo',
  'sin-canal': 'Sin correo ni WhatsApp',
};

function FilaMensaje({
  fila,
  accion,
  asunto,
  demo,
}: {
  fila: FilaRegresan;
  accion: string;
  asunto: string;
  demo: boolean;
}) {
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState(fila.mensaje);
  const wa = waLink(fila.phone, texto);

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{fila.name}</p>
          <p className="line-clamp-2 text-sm text-muted">{fila.detalle}</p>
        </div>
        {fila.phone || fila.email ? (
          <Button variant={abierta ? 'outline' : 'primary'} onClick={() => setAbierta((v) => !v)} aria-expanded={abierta}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {abierta ? 'Cerrar' : accion}
          </Button>
        ) : (
          <span className="text-sm text-muted">Sin teléfono</span>
        )}
      </div>

      {abierta && (
        <div className="mt-3">
          <Label htmlFor={`msg-${fila.key}`}>Mensaje (puedes editarlo antes de mandarlo)</Label>
          <textarea
            id={`msg-${fila.key}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-[15px] leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {wa &&
              (demo ? (
                <span className="inline-flex min-h-[2.75rem] items-center rounded-full border border-border px-4 text-sm text-muted">
                  En la demo no se abre WhatsApp
                </span>
              ) : (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-[rgb(var(--color-cta-fg))] shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Abrir WhatsApp
                </a>
              ))}
            {fila.email && !demo && (
              <a
                href={mailtoLink(fila.email, asunto, texto)}
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-ink hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Por correo
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Vacio(props: React.ComponentProps<typeof EmptyState>) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 [&>div]:py-10">
      <EmptyState {...props} />
    </div>
  );
}

export function RegresanBoard({
  negocio,
  semanas,
  canal,
  proximos,
  inactivas,
  resenas,
  tieneLinkResena,
  demo = false,
  ajustes,
}: {
  negocio: string;
  semanas: number;
  canal: 'whatsapp' | 'correo';
  proximos: ProximoRecordatorio[];
  inactivas: FilaRegresan[];
  resenas: FilaRegresan[];
  tieneLinkResena: boolean;
  demo?: boolean;
  ajustes?: React.ReactNode;
}) {
  return (
    <div className="mt-8 flex flex-col gap-10">
      <section>
        <SectionHeading title="Clientas que no han vuelto" meta={inactivas.length} />
        <p className="-mt-1 mb-3 text-sm text-muted">
          Su última cita fue hace más de {semanas} {semanas === 1 ? 'semana' : 'semanas'} y no tienen nada agendado.
          Un mensaje a tiempo es la venta más barata que vas a hacer hoy.
        </p>
        {inactivas.length === 0 ? (
          <Vacio
            icon={UserRoundX}
            title="Nadie lleva tanto tiempo sin venir"
            description={`Cuando una clienta pase ${semanas} ${semanas === 1 ? 'semana' : 'semanas'} sin agendar, aparece aquí con un mensaje listo para mandarle.`}
            why="Recuperar a una clienta que ya te conoce cuesta mucho menos que conseguir una nueva."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {inactivas.map((f) => (
              <FilaMensaje key={f.key} fila={f} accion="Escribirle" asunto={`Te extrañamos en ${negocio}`} demo={demo} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading title="Pide tu reseña de Google" meta={tieneLinkResena ? resenas.length : undefined} />
        <p className="-mt-1 mb-3 text-sm text-muted">
          Quien vino esta semana. Pedirla el mismo día o al siguiente es cuando más reseñas se consiguen.
        </p>
        {!tieneLinkResena ? (
          <Vacio
            icon={Star}
            title="Falta tu link de reseñas de Google"
            description="Con él, aquí te aparece quién vino esta semana y un mensaje listo para pedirle su reseña."
            why="Más reseñas = sales más arriba cuando alguien busca un salón en Google Maps."
            action={
              ajustes ? (
                <a
                  href="#regresan-resena"
                  className="ui-btn inline-flex min-h-[2.75rem] items-center rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  Pegar mi link
                </a>
              ) : undefined
            }
          />
        ) : resenas.length === 0 ? (
          <Vacio
            icon={Star}
            title="Nadie ha venido en los últimos 7 días"
            description="Cuando una clienta venga a su cita, aparece aquí en cuanto pasa su cita, con el mensaje listo."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {resenas.map((f) => (
              <FilaMensaje key={f.key} fila={f} accion="Pedir reseña" asunto={`¿Cómo te fue en ${negocio}?`} demo={demo} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading title="Recordatorio de cita" />
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-4 sm:px-5">
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted">
            Un día antes de cada cita le llega un recordatorio a tu clienta por{' '}
            <span className="font-medium text-ink">{canal === 'whatsapp' ? 'WhatsApp' : 'correo'}</span>
            {canal === 'correo' && ' (si dejó su correo al reservar)'}. No tienes que hacer nada.
          </p>
        </div>
        {proximos.length > 0 && (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {proximos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-ink">{p.name}</p>
                  <p className="text-sm text-muted">{p.cuando}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    p.estado === 'enviado'
                      ? 'bg-success-soft text-success'
                      : p.estado === 'sin-canal'
                        ? 'bg-warning-soft text-warning'
                        : 'bg-ink/[0.06] text-muted'
                  }`}
                >
                  {ESTADO_LABEL[p.estado]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ajustes}
    </div>
  );
}

export function AjustesRegresan({
  semanas,
  linkResena,
  onGuardar,
}: {
  semanas: number;
  linkResena: string;
  onGuardar: (input: { semanas: string; linkResena: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ semanas: String(semanas), linkResena });
  const [error, setError] = useState<{ campo: 'semanas' | 'link' | null; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const r = await onGuardar(form).catch(() => ({ ok: false as const, error: 'No se pudo guardar. Revisa tu internet e inténtalo otra vez.' }));
    setGuardando(false);
    if (r.ok) {
      toast('Ajustes guardados');
      router.refresh();
    } else {
      // El error se dice junto al campo que lo causó; lo escrito se queda.
      setError({ campo: /semana/i.test(r.error) ? 'semanas' : /link|https/i.test(r.error) ? 'link' : null, texto: r.error });
      toast(r.error, 'error');
    }
  }

  return (
    <section>
      <SectionHeading title="Ajustes de esta sección" />
      <form onSubmit={guardar} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface px-4 py-5 sm:px-5">
        <FormField
          label="¿Cuántas semanas sin venir para avisarte?"
          hint="Ejemplo: 6. Si alguien pasa ese tiempo sin agendar, aparece arriba en «no han vuelto»."
          error={error?.campo === 'semanas' ? error.texto : null}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={52}
            required
            value={form.semanas}
            onChange={(e) => setForm({ ...form, semanas: e.target.value })}
            className="w-28"
          />
        </FormField>
        <FormField
          label="Tu link de reseñas de Google"
          hint="En tu Perfil de Negocio de Google toca «Pedir reseñas» y copia el link."
          error={error?.campo === 'link' ? error.texto : null}
          optional
        >
          <Input
            id="regresan-resena"
            type="url"
            inputMode="url"
            placeholder="https://g.page/r/…/review"
            value={form.linkResena}
            onChange={(e) => setForm({ ...form, linkResena: e.target.value })}
            className="w-full scroll-mt-24"
          />
        </FormField>
        {error && !error.campo && (
          <p role="alert" className="rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error">
            {error.texto}
          </p>
        )}
        <div>
          <Button type="submit" isLoading={guardando} className="max-sm:w-full">
            {guardando ? 'Guardando…' : 'Guardar ajustes'}
          </Button>
        </div>
      </form>
    </section>
  );
}
