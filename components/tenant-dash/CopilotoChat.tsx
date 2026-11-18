'use client';

import { useRef, useState } from 'react';
import { ArrowUp, Database, FileSearch, FileText, Loader2, Sparkles } from 'lucide-react';

// El chat del copiloto, con burbujas: la pregunta de ella a la derecha
// con el color del negocio, la respuesta a la izquierda y, plegable
// dentro de la respuesta, lo que el copiloto consultó (de dónde salió
// cada cifra). Las preguntas de ejemplo son chips grandes.

type Herramienta = { name: 'consultar_sql' | 'buscar_en_notas' | 'buscar_en_documentos'; input: string; ok: boolean; filas?: number };
type Mensaje = { pregunta: string; respuesta: string; herramientas: Herramienta[]; estado: 'pensando' | 'listo' | 'error' };

// Preguntas de ejemplo que se tocan: la primera vez nadie sabe qué
// preguntarle a un chat. Mezcla de agenda (lo de todos los días) y lo
// del plan Pro (cotizaciones, reuniones), todo lo que el copiloto lee.
const SUGERENCIAS = [
  '¿Cuántas citas tuve esta semana?',
  '¿Qué servicio me piden más este mes?',
  '¿Qué clientas no han vuelto en dos meses?',
  '¿Qué cotizaciones vencen esta semana?',
  '¿Qué reuniones tengo mañana y con quién?',
  '¿Quién se quejó del precio?',
];

export function CopilotoChat() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState('');
  const ocupado = mensajes.at(-1)?.estado === 'pensando';
  const fin = useRef<HTMLDivElement>(null);

  async function preguntar(entrada: string) {
    const pregunta = entrada.trim();
    if (!pregunta || ocupado) return;
    setTexto('');
    const historial = mensajes
      .filter((m) => m.estado === 'listo')
      .flatMap((m) => [
        { role: 'user' as const, content: m.pregunta },
        { role: 'assistant' as const, content: m.respuesta },
      ]);
    historial.push({ role: 'user', content: pregunta });
    setMensajes((ms) => [...ms, { pregunta, respuesta: '', herramientas: [], estado: 'pensando' }]);
    const actualizar = (f: (m: Mensaje) => Mensaje) =>
      setMensajes((ms) => [...ms.slice(0, -1), f(ms[ms.length - 1])]);
    setTimeout(() => fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0);

    try {
      // Ruta pública del subdominio: proxy.ts la reescribe a /t/{slug}/…
      const res = await fetch('/dashboard/copiloto/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historial }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'No se pudo consultar.');
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lineas = buf.split('\n');
        buf = lineas.pop() ?? '';
        for (const l of lineas) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l);
          if (ev.type === 'text') actualizar((m) => ({ ...m, respuesta: m.respuesta + ev.delta }));
          else if (ev.type === 'tool') actualizar((m) => ({ ...m, herramientas: [...m.herramientas, ev] }));
          else if (ev.type === 'error') throw new Error(ev.message);
        }
      }
      actualizar((m) => ({ ...m, estado: 'listo' }));
    } catch (e) {
      actualizar((m) => ({
        ...m,
        estado: 'error',
        respuesta: e instanceof Error && e.message && !/fetch|JSON|network/i.test(e.message) ? e.message : 'No se pudo contestar. Revisa tu internet e inténtalo otra vez.',
      }));
    }
  }

  const chipGrande =
    'min-h-[2.75rem] rounded-full border border-border bg-surface px-4 py-2.5 text-left text-[15px] font-medium text-ink transition-[transform,background-color] duration-150 hover:bg-ink/[0.04] active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50';
  const hechas = new Set(mensajes.map((m) => m.pregunta));
  const otras = SUGERENCIAS.filter((s) => !hechas.has(s)).slice(0, 3);

  return (
    <div className="mt-8 flex flex-col gap-6">
      {mensajes.length === 0 && (
        <section aria-labelledby="copiloto-ejemplos" className="flex flex-col items-start gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-[rgb(var(--color-cta-fg))]" aria-hidden="true">
              <Sparkles className="h-5 w-5" />
            </span>
            <p className="max-w-md rounded-3xl rounded-tl-md border border-border bg-surface px-4 py-3 text-[16px] leading-relaxed text-ink">
              ¡Hola! Pregúntame lo que quieras de tu negocio. Toca una pregunta o escribe la tuya.
            </p>
          </div>
          <h2 id="copiloto-ejemplos" className="sr-only">
            Preguntas de ejemplo
          </h2>
          <div className="flex flex-wrap gap-2 sm:pl-14">
            {SUGERENCIAS.map((s) => (
              <button key={s} type="button" onClick={() => preguntar(s)} className={chipGrande}>
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      {mensajes.map((m, i) => (
        <article key={i} className="flex flex-col gap-3">
          <h2 className="animate-fade-in max-w-[85%] self-end rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-[16px] font-medium leading-relaxed text-[rgb(var(--color-cta-fg))]">
            {m.pregunta}
          </h2>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-ink" aria-hidden="true">
              <Sparkles className="h-4 w-4" />
            </span>
            <div
              className={`min-w-0 max-w-[85%] rounded-3xl rounded-tl-md border px-4 py-3 ${
                m.estado === 'error' ? 'border-error/30 bg-error-soft' : 'border-border bg-surface'
              }`}
            >
              <div className={`whitespace-pre-wrap text-[16px] leading-relaxed ${m.estado === 'error' ? 'text-error' : 'text-ink'}`} aria-live="polite">
                {m.respuesta}
                {m.estado === 'pensando' && !m.respuesta && (
                  <span className="inline-flex items-center gap-2 text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Revisando tus datos…
                  </span>
                )}
              </div>
              {m.herramientas.length > 0 && (
                <details className="mt-3 rounded-2xl bg-ink/[0.03]">
                  <summary className="flex min-h-[2.75rem] cursor-pointer items-center px-3 text-[14px] font-medium text-muted hover:text-ink">
                    Qué revisó para contestarte · {m.herramientas.length} {m.herramientas.length === 1 ? 'paso' : 'pasos'}
                  </summary>
                  <ol className="flex flex-col gap-3 border-t border-border px-3 py-3">
                    {m.herramientas.map((h, j) => (
                      <li key={j} className="text-xs">
                        <p className="flex items-center gap-1.5 font-medium text-muted">
                          {h.name === 'consultar_sql' ? (
                            <Database className="h-3.5 w-3.5" aria-hidden />
                          ) : h.name === 'buscar_en_documentos' ? (
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <FileSearch className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {{ consultar_sql: 'Revisó tus datos', buscar_en_notas: 'Buscó en tus notas', buscar_en_documentos: 'Buscó en tus documentos' }[h.name]}
                          <span className={h.ok ? '' : 'text-error'}>
                            · {h.ok ? `${h.filas ?? 0} ${h.filas === 1 ? 'resultado' : 'resultados'}` : 'no se pudo'}
                          </span>
                        </p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg bg-ink/[0.04] p-2 font-mono text-[11px] text-ink">
                          {h.input}
                        </pre>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          </div>
        </article>
      ))}

      {mensajes.length > 0 && !ocupado && otras.length > 0 && (
        <div className="flex flex-wrap gap-2 sm:pl-12" aria-label="Más preguntas">
          {otras.map((s) => (
            <button key={s} type="button" onClick={() => preguntar(s)} className={chipGrande}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div ref={fin} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          preguntar(texto);
        }}
        className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm lg:bottom-4"
      >
        <label htmlFor="copiloto-pregunta" className="sr-only">
          Tu pregunta
        </label>
        <textarea
          id="copiloto-pregunta"
          rows={1}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              preguntar(texto);
            }
          }}
          placeholder="Escribe tu pregunta…"
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-ink placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={ocupado || !texto.trim()}
          aria-label="Preguntar"
          className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-[15px] font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-40"
        >
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
          Preguntar
        </button>
      </form>
    </div>
  );
}
