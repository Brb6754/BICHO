'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { contrastRatio, readableFgRgb } from '@/lib/branding/colors';
import { LOGO_TYPES, logoFileError } from '@/lib/branding/logoUpload';
import type { BrandResult } from './actions';

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-16 shrink-0 cursor-pointer rounded-lg border border-border bg-surface"
        />
        <span className="font-mono text-sm uppercase text-muted">{value}</span>
      </div>
    </div>
  );
}

export function BrandForm({
  name,
  initialLogo,
  initialPrimary,
  initialAccent,
  onSave,
}: {
  name: string;
  initialLogo: string | null;
  initialPrimary: string;
  initialAccent: string;
  onSave: (formData: FormData) => Promise<BrandResult>;
}) {
  const router = useRouter();
  const [primary, setPrimary] = useState(initialPrimary);
  const [accent, setAccent] = useState(initialAccent);
  const [file, setFile] = useState<File | null>(null);
  const [savedLogo, setSavedLogo] = useState<string | null>(initialLogo);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Vista previa local del archivo elegido; el blob anterior se libera.
  function pickFile(f: File | null) {
    setFile(f);
    setBlobUrl(f ? URL.createObjectURL(f) : null);
  }
  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);
  const preview = blobUrl ?? savedLogo;

  // Mismo helper que pinta el panel y la página pública: el texto sobre el
  // color principal es blanco o casi negro, el que contraste más.
  const fgTriplet = readableFgRgb(primary);
  const fg = `rgb(${fgTriplet})`;
  const ratio = contrastRatio(primary, fgTriplet === '255 255 255' ? '#FFFFFF' : '#111815');
  const accentOnWhite = contrastRatio(accent, '#FFFFFF');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (file) {
      const err = logoFileError(file);
      if (err) return setError(err);
    }
    const fd = new FormData();
    fd.set('primary_color', primary);
    fd.set('accent_color', accent);
    if (file) fd.set('logo', file);
    setSaving(true);
    try {
      const r = await onSave(fd);
      if (!r.ok) return setError(r.error);
      pickFile(null);
      setSavedLogo(r.logoUrl);
      setSaved(true);
      router.refresh();
    } catch {
      setError('No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <Label htmlFor="brand-logo">Logo</Label>
          <label
            htmlFor="brand-logo"
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-muted transition-colors focus-within:ring-2 focus-within:ring-primary/40 hover:text-ink"
          >
            <ImageUp className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{file ? file.name : 'Elegir imagen (JPG, PNG o WebP, máx. 2 MB)'}</span>
            <input
              id="brand-logo"
              type="file"
              accept={LOGO_TYPES.join(',')}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                const err = f ? logoFileError(f) : null;
                setError(err);
                pickFile(f && !err ? f : null);
              }}
            />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ColorField id="brand-primary" label="Color principal" value={primary} onChange={setPrimary} />
          <ColorField id="brand-accent" label="Color de acento" value={accent} onChange={setAccent} />
        </div>
        {ratio < 4.5 && (
          <p className="text-sm text-warning">
            El texto sobre tu color principal tiene poco contraste ({ratio.toFixed(1)}:1). Prueba un tono más claro o más oscuro.
          </p>
        )}
        {accentOnWhite < 3 && (
          <p className="text-sm text-warning">
            Tu color de acento casi no se ve sobre fondo blanco ({accentOnWhite.toFixed(1)}:1).
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={saving}>
            {saving ? 'Guardando' : 'Guardar marca'}
          </Button>
          {saved && <p className="text-sm text-success">Guardado ✓</p>}
        </div>
      </div>

      {/* Vista previa simple: encabezado y botón de reservar. Fondo blanco
          fijo, como la página pública en modo claro. */}
      <section aria-label="Vista previa" className="min-w-0 rounded-3xl border border-border bg-white p-5 text-[#111815]">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">Vista previa</p>
        <div className="mt-4 flex items-center gap-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: o URL pública de Storage
            <img src={preview} alt="Logo" className="h-12 w-auto max-w-[140px] object-contain" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold" style={{ background: primary, color: fg }}>
              {name.trim().charAt(0).toUpperCase() || '?'}
            </span>
          )}
          <p className="min-w-0 truncate font-semibold">{name}</p>
        </div>
        <div className="mt-5 h-1.5 w-12 rounded-full" style={{ background: accent }} />
        <div className="mt-5 w-full rounded-full px-5 py-3 text-center text-sm font-semibold" style={{ background: primary, color: fg }}>
          Reservar cita
        </div>
        <p className="mt-2 text-center text-xs text-[#6b7280]">Contraste del texto: {ratio.toFixed(1)}:1</p>
      </section>
    </form>
  );
}
