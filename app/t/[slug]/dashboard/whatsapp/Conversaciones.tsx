import { Bot, ChevronRight, MessageCircle, UserRound } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/tenant-dash/ui/ActionForm';
import { Badge } from '@/components/ui/Badge';
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

  return (
    <ul className="space-y-3">
      {conversaciones.map((c) => {
        const ultimo = c.historial[c.historial.length - 1];
        const cuando = fmt.format(new Date(c.last_message_at));
        return (
          <li key={c.id}>
            <Card padded={false}>
              <details className="group">
                <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center gap-3 px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold tabular-nums text-ink">{telefonoBonito(c.telefono)}</span>
                    <span className="block truncate text-sm text-muted">{ultimo?.content ?? 'Sin mensajes'}</span>
                    <span className="block text-[13px] text-muted sm:hidden">{cuando}</span>
                  </span>
                  <span className="hidden text-[13px] text-muted sm:block">{cuando}</span>
                  <Badge tone={c.estado === 'humano' ? 'inverse' : 'muted'}>{c.estado === 'humano' ? 'Contestas tú' : 'Recepcionista'}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
                </summary>
                <div className="space-y-2 border-t border-border px-4 py-4 sm:px-5">
                  {c.historial.map((t, i) => (
                    <p
                      key={i}
                      className={`flex max-w-[85%] gap-2 rounded-2xl px-3 py-2 text-[15px] leading-relaxed ${
                        t.role === 'user' ? 'bg-ink/[0.05] text-ink' : 'ml-auto bg-primary/10 text-ink'
                      }`}
                    >
                      {t.role === 'assistant' &&
                        (t.humano ? (
                          <UserRound className="mt-1 h-3.5 w-3.5 shrink-0" aria-label="Tú" />
                        ) : (
                          <Bot className="mt-1 h-3.5 w-3.5 shrink-0" aria-label="Recepcionista" />
                        ))}
                      <span className="whitespace-pre-wrap">{t.content}</span>
                    </p>
                  ))}
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
                              className="min-h-[2.75rem] min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
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
