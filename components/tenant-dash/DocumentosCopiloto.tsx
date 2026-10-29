'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';

export type DocumentoFila = { id: string; nombre: string; tipo: string; fragmentos: number; created_at: string };

const fecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

export function DocumentosCopiloto({ documentos }: { documentos: DocumentoFila[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  async function subir(archivos: FileList | null) {
    if (!archivos?.length) return;
    setError(null);
    for (const archivo of Array.from(archivos)) {
      setSubiendo(archivo.name);
      const form = new FormData();
      form.append('archivo', archivo);
      // Ruta pública del subdominio; proxy.ts la reescribe a /t/{slug}/…
      const res = await fetch('/dashboard/copiloto/documentos/api', { method: 'POST', body: form });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(`${archivo.name}: ${j.error ?? 'no se pudo subir.'}`);
        break;
      }
    }
    setSubiendo(null);
    if (input.current) input.current.value = '';
    router.refresh();
  }

  async function borrar(d: DocumentoFila) {
    if (!confirm(`¿Quitar "${d.nombre}"? El copiloto ya no podrá consultarlo.`)) return;
    setBorrando(d.id);
    const res = await fetch(`/dashboard/copiloto/documentos/api?id=${encodeURIComponent(d.id)}`, { method: 'DELETE' });
    setBorrando(null);
    if (!res.ok) setError('No se pudo quitar el documento.');
    router.refresh();
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          subir(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center transition-colors hover:border-primary"
      >
        {subiendo ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        ) : (
          <Upload className="h-6 w-6 text-primary" aria-hidden />
        )}
        <span className="text-sm font-medium text-ink">
          {subiendo ? `Leyendo ${subiendo}…` : 'Arrastra un archivo o haz clic para elegirlo'}
        </span>
        <span className="text-xs text-muted">PDF, Word (.docx) o texto · hasta 4 MB</span>
        <input
          ref={input}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.csv"
          disabled={Boolean(subiendo)}
          onChange={(e) => subir(e.target.files)}
          className="sr-only"
        />
      </label>

      {error && <p className="text-sm text-error">{error}</p>}

      {documentos.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay documentos. El copiloto responde solo con tus datos del panel.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {documentos.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{d.nombre}</p>
                <p className="text-xs text-muted">
                  {fecha.format(new Date(d.created_at))} · {d.fragmentos} {d.fragmentos === 1 ? 'fragmento' : 'fragmentos'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => borrar(d)}
                disabled={borrando === d.id}
                aria-label={`Quitar ${d.nombre}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-error-soft hover:text-error disabled:opacity-40"
              >
                {borrando === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
