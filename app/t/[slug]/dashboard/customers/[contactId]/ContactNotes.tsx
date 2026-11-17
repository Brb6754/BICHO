'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { updateContact } from '../actions';
import { toast } from '@/components/tenant-dash/ui/Toast';

// Notas y etiquetas de la ficha.
//
// Guarda al salir del campo, no en cada tecla: escribir a la base en
// cada letra es ruido de red, y re-renderizar el textarea desde React
// con el cursor adentro lo manda al principio en cada pulsación — el
// mismo problema de contentEditable que este proyecto ya resolvió en el
// editor de plantillas.
export function ContactNotes({
  slug,
  contactId,
  notes,
  tags,
}: {
  slug: string;
  contactId: string;
  notes: string | null;
  tags: string[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(notes ?? '');
  const [etiquetas, setEtiquetas] = useState<string[]>(tags);
  const [nueva, setNueva] = useState('');
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'error'>('listo');
  const [error, setError] = useState<string | null>(null);

  async function guardar(patch: { notes?: string; tags?: string[] }) {
    setEstado('guardando');
    setError(null);
    const res = await updateContact(slug, contactId, patch);
    if (!res.ok) {
      setEstado('error');
      setError(res.error);
      return;
    }
    setEstado('listo');
    toast(patch.notes !== undefined ? 'Nota guardada' : 'Etiquetas guardadas');
    router.refresh();
  }

  function agregarEtiqueta() {
    const t = nueva.trim();
    if (!t || etiquetas.includes(t)) {
      setNueva('');
      return;
    }
    const siguiente = [...etiquetas, t];
    setEtiquetas(siguiente);
    setNueva('');
    guardar({ tags: siguiente });
  }

  function quitarEtiqueta(t: string) {
    const siguiente = etiquetas.filter((x) => x !== t);
    setEtiquetas(siguiente);
    guardar({ tags: siguiente });
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-semibold text-ink">Notas</h2>
        {estado === 'guardando' && <span className="text-[13px] text-muted">Guardando…</span>}
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          if ((notes ?? '') !== texto) guardar({ notes: texto });
        }}
        rows={4}
        maxLength={4000}
        placeholder="Ej. Prefiere a Renata. Alérgica al acrílico."
        className="mt-3 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 sm:text-sm"
      />
      <p className="mt-1.5 text-[13px] text-muted">
        Lo que escribas aquí se ve cada vez que abras esta ficha. Se guarda al salir del campo.
      </p>

      <h3 className="mt-6 text-[15px] font-semibold text-ink">Etiquetas</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {etiquetas.map((t) => (
          <span
            key={t}
            className="inline-flex items-center rounded-full bg-primary/10 pl-3.5 text-sm font-medium text-ink"
          >
            {t}
            <button
              type="button"
              onClick={() => quitarEtiqueta(t)}
              aria-label={`Quitar etiqueta ${t}`}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </span>
        ))}
        {etiquetas.length === 0 && (
          <span className="text-sm text-muted">Sin etiquetas todavía.</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregarEtiqueta();
            }
          }}
          placeholder="Ej. VIP, solo sábados"
          aria-label="Nueva etiqueta"
          maxLength={40}
          className="min-h-[2.75rem] w-full sm:w-64"
        />
        <Button type="button" onClick={agregarEtiqueta} disabled={!nueva.trim()} className="min-h-[2.75rem]">
          Agregar etiqueta
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}
    </section>
  );
}
