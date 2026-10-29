'use client';

import { useRef, useState } from 'react';
import { ArrowUp, Database, FileSearch, FileText, Loader2 } from 'lucide-react';

// El chat del copiloto. Deliberadamente NO es una burbuja de mensajería:
// es el lenguaje del panel — la pregunta como encabezado, la respuesta
// como texto, y debajo, plegable, lo que el copiloto consultó. Ese
// "Consultó: select …" es lo importante: el dueño ve de dónde salió
// cada cifra.

type Herramienta = { name: 'consultar_sql' | 'buscar_en_notas' | 'buscar_en_documentos'; input: string; ok: boolean; filas?: number };
type Mensaje = { pregunta: string; respuesta: string; herramientas: Herramienta[]; estado: 'pensando' | 'listo' | 'error' };

const SUGERENCIAS = [
  '¿Qué cotizaciones están enviadas y vencen esta semana?',
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
      actualizar((m) => ({ ...m, estado: 'error', respuesta: e instanceof Error ? e.message : 'Algo falló.' }));
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {mensajes.length === 0 && (
        <div>
          <p className="text-sm text-muted">Prueba con una de estas:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGERENCIAS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => preguntar(s)}
                className="rounded-full border border-border bg-surface px-4 py-2 text-left text-sm text-ink transition-colors hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {mensajes.map((m, i) => (
        <article key={i} className="border-b border-border pb-8 last:border-0">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{m.pregunta}</h2>
          <div
            className={`mt-3 whitespace-pre-wrap text-[15px] leading-relaxed ${m.estado === 'error' ? 'text-error' : 'text-ink'}`}
          >
            {m.respuesta}
            {m.estado === 'pensando' && !m.respuesta && (
              <span className="inline-flex items-center gap-2 text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Consultando tus datos…
              </span>
            )}
          </div>
          {m.herramientas.length > 0 && (
            <details className="mt-4 rounded-xl border border-border bg-surface">
              <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-muted hover:text-ink">
                Cómo lo averiguó · {m.herramientas.length} {m.herramientas.length === 1 ? 'paso' : 'pasos'}
              </summary>
              <ol className="flex flex-col gap-3 border-t border-border px-4 py-3">
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
                      {{ consultar_sql: 'Consultó', buscar_en_notas: 'Buscó en notas', buscar_en_documentos: 'Buscó en documentos' }[h.name]}
                      <span className={h.ok ? '' : 'text-error'}>
                        · {h.ok ? `${h.filas ?? 0} resultados` : 'falló'}
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
        </article>
      ))}
      <div ref={fin} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          preguntar(texto);
        }}
        className="sticky bottom-4 flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm"
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
          placeholder="¿Cuánto llevo cotizado este mes?"
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-ink placeholder:text-muted focus:outline-none sm:text-sm"
        />
        <button
          type="submit"
          disabled={ocupado || !texto.trim()}
          aria-label="Preguntar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-secondary text-[rgb(var(--color-cta-fg))] disabled:opacity-40"
        >
          {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
