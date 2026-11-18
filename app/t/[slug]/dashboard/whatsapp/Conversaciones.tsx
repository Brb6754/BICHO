import { ChevronRight, MessageCircle, UserRound } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/tenant-dash/ui/ActionForm';
import { Burbuja, FondoChat } from '@/components/tenant-dash/crecer/ui';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

// La lista de pláticas de la recepcionista. La usan el panel real y la
// demo (/panel/whatsapp); en la demo no hay acciones y los botones se ven
// pero no envían nada.

export type ConversacionVista = {
  id: string;
  telefono: string;
  estado: 'ia' | 'humano';
  last_message_at: string;
  historial: { role: 'user' | 'assistant'; content: string; humano?: boolean }[];
};

export type Acciones = {
  tomar: (id: string) => () => Promise<void>;
  devolver: (id: string) => () => Promise<void>;
  responder: (id: string) => (fd: FormData) => Promise<void>;
};

function telefonoBonito(t: string) {
  const local = t.length >= 10 ? t.slice(-10) : t;
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : t;
}

export function Conversaciones({
  conversaciones,
  timezone,
  acciones,
}: {
  conversaciones: ConversacionVista[];
  timezone: string | null;
  acciones?: Acciones;
}) {
  if (!conversaciones.length) {
    return (
      <Card padded={false}>
        <EmptyState
          icon={MessageCircle}
          title="Todavía no hay pláticas"
          description="Cuando una clienta escriba a tu WhatsApp, aquí ves todo lo que platicó con la recepcionista."
          why="Así sabes qué le contestaron y puedes entrar tú cuando haga falta."
        />
      </Card>
    );
  }

  const fmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone ?? 'America/Mexico_City' });
  // Primero las que esperan tu respuesta (las tomaste tú y la clienta
  // escribió al último), luego las que contestas tú, luego el resto.
  const peso = (c: ConversacionVista) => (c.estado === 'humano' ? (c.historial.at(-1)?.role === 'user' ? 2 : 1) : 0);
  const orden = [...conversaciones].sort((a, b) => peso(b) - peso(a) || b.last_message_at.localeCompare(a.last_message_at));

  return (
    <ul className="space-y-3">
      {orden.map((c) => {
        const ultimo = c.historial[c.historial.length - 1];
        const cuando = fmt.format(new Date(c.last_message_at));
        const teToca = peso(c) === 2;
        return (
          <li key={c.id}>
            <Card padded={false}>
              <details className="group">
                <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-center gap-3 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#D9FDD3] text-[#3D6216]" aria-hidden="true">
                    <UserRound className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[16px] font-semibold tabular-nums text-ink">{telefonoBonito(c.telefono)}</span>
                      <span className="shrink-0 text-[13px] text-muted">{cuando}</span>
                    </span>
                    <span className="block truncate text-[15px] text-muted">{ultimo?.content ?? 'Sin mensajes'}</span>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
                        teToca ? 'bg-warning-soft text-warning' : c.estado === 'humano' ? 'bg-ink/[0.07] text-ink' : 'bg-success-soft text-success'
                      }`}
                    >
                      {teToca ? 'Te toca contestar' : c.estado === 'humano' ? 'Contestas tú' : 'La atiende la recepcionista'}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
                </summary>
                <div className="border-t border-border p-3 sm:p-4">
                  <FondoChat>
                    {c.historial.map((t, i) => (
                      <Burbuja key={i} mia={t.role === 'assistant'} autor={t.role === 'assistant' ? (t.humano ? 'Tú' : 'Recepcionista') : undefined}>
                        {t.content}
                      </Burbuja>
                    ))}
                  </FondoChat>
                  <div className="flex flex-wrap items-center gap-2 pt-3">
                    {c.estado === 'ia' ? (
                      acciones ? (
                        <ActionForm action={acciones.tomar(c.id)} success="Listo: en esta plática contestas tú">
                          <SubmitButton variant="outline">Contestar yo</SubmitButton>
                        </ActionForm>
                      ) : (
                        <Button type="button" variant="outline" disabled>
                          Contestar yo
                        </Button>
                      )
                    ) : (
                      <>
                        {acciones ? (
                          <ActionForm action={acciones.responder(c.id)} success="Mensaje enviado" className="flex min-w-0 flex-1 basis-64 gap-2">
                            <input
                              name="texto"
                              required
                              maxLength={2000}
                              placeholder="Escribe tu respuesta…"
                              aria-label="Tu respuesta"
                              className="min-h-[2.75rem] min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <SubmitButton pending="Enviando…">Enviar</SubmitButton>
                          </ActionForm>
                        ) : (
                          <div className="flex min-w-0 flex-1 basis-64 gap-2">
                            <input
                              disabled
                              placeholder="Escribe tu respuesta…"
                              aria-label="Tu respuesta"
                              className="min-h-[2.75rem] min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-ink"
                            />
                            <Button type="button" disabled>
                              Enviar
                            </Button>
                          </div>
                        )}
                        {acciones ? (
                          <ActionForm action={acciones.devolver(c.id)} success="La recepcionista sigue con esta plática">
                            <SubmitButton variant="outline">Regresársela a la recepcionista</SubmitButton>
                          </ActionForm>
                        ) : (
                          <Button type="button" variant="outline" disabled>
                            Regresársela a la recepcionista
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </details>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
