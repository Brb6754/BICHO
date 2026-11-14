import { Bot, MessageCircle, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

// La lista de conversaciones de la recepcionista. La usan el panel real
// y la demo (/panel/whatsapp); en la demo no hay acciones y los botones
// se ven pero no envían nada.

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
      <Card>
        <EmptyState
          icon={MessageCircle}
          title="Todavía no hay conversaciones"
          description="Cuando un cliente escriba por WhatsApp, aquí verás lo que platicó con la recepcionista."
        />
      </Card>
    );
  }

  const fmt = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone ?? 'America/Mexico_City' });

  return (
    <ul className="space-y-3">
      {conversaciones.map((c) => {
        const ultimo = c.historial[c.historial.length - 1];
        return (
          <li key={c.id}>
            <Card padded={false}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-5">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{telefonoBonito(c.telefono)}</span>
                    <span className="block truncate text-sm text-muted">{ultimo?.content ?? 'Sin mensajes'}</span>
                  </span>
                  <span className="hidden text-xs text-muted sm:block">{fmt.format(new Date(c.last_message_at))}</span>
                  <Badge tone={c.estado === 'humano' ? 'danger' : 'default'}>{c.estado === 'humano' ? 'Tú contestas' : 'IA'}</Badge>
                </summary>
                <div className="space-y-2 border-t border-border px-5 py-4">
                  {c.historial.map((t, i) => (
                    <p
                      key={i}
                      className={`flex max-w-[85%] gap-2 rounded-2xl px-3 py-2 text-sm ${
                        t.role === 'user' ? 'bg-ink/[0.05] text-ink' : 'ml-auto bg-primary/10 text-ink'
                      }`}
                    >
                      {t.role === 'assistant' &&
                        (t.humano ? <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-label="Tú" /> : <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-label="IA" />)}
                      <span className="whitespace-pre-wrap">{t.content}</span>
                    </p>
                  ))}
                  <div className="flex flex-wrap items-center gap-2 pt-3">
                    {c.estado === 'ia' ? (
                      <form action={acciones?.tomar(c.id)}>
                        <Button type="submit" variant="outline" disabled={!acciones}>
                          Tomar conversación
                        </Button>
                      </form>
                    ) : (
                      <>
                        <form action={acciones?.responder(c.id)} className="flex min-w-0 flex-1 gap-2">
                          <input
                            name="texto"
                            required
                            maxLength={2000}
                            placeholder="Escribe tu respuesta…"
                            aria-label="Respuesta"
                            disabled={!acciones}
                            className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink"
                          />
                          <Button type="submit" disabled={!acciones}>
                            Enviar
                          </Button>
                        </form>
                        <form action={acciones?.devolver(c.id)}>
                          <Button type="submit" variant="outline" disabled={!acciones}>
                            Devolver a IA
                          </Button>
                        </form>
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
