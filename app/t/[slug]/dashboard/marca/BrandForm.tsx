'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ImageUp, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { MarcoTelefono } from '@/components/tenant-dash/crecer/ui';
import { contrastRatio, readableFgRgb } from '@/lib/branding/colors';
import { LOGO_TYPES, logoFileError } from '@/lib/branding/logoUpload';
import type { BrandResult } from './actions';

// Combinaciones listas para quien no quiere pensar en colores.
const COMBINACIONES: { nombre: string; primary: string; accent: string }[] = [
  { nombre: 'Rosa palo', primary: '#B4536E', accent: '#E8A0B4' },
  { nombre: 'Terracota', primary: '#B4532A', accent: '#E9A66B' },
  { nombre: 'Ciruela', primary: '#6B2D5C', accent: '#C77DB5' },
  { nombre: 'Salvia', primary: '#3F6B4E', accent: '#9CC5A1' },
  { nombre: 'Dorado', primary: '#8A6A1F', accent: '#D9B65C' },
  { nombre: 'Coral', primary: '#C2453A', accent: '#F4A28C' },
  { nombre: 'Lavanda', primary: '#5B4B9A', accent: '#B7A8E8' },
  { nombre: 'Negro elegante', primary: '#1F1A17', accent: '#C9A86A' },
];

function ColorField({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor={id} className="text-[15px]">
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-20 shrink-0 cursor-pointer rounded-xl border border-border bg-surface"
        />
        <span className="text-[15px] text-muted">Toca para elegir otro</span>
      </div>
      <p className="mt-1.5 text-[14px] leading-snug text-muted">{hint}</p>
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
  // Lo último guardado, para decir "Guardado" o "sin guardar" a la vista:
  // un toast se va en segundos y ella vuelve a la pantalla sin saber.
  const [guardado, setGuardado] = useState({ primary: initialPrimary, accent: initialAccent });
  const [recienGuardado, setRecienGuardado] = useState(false);
  const sinGuardar = Boolean(file) || primary !== guardado.primary || accent !== guardado.accent;

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
      if (!r.ok) {
        toast(r.error, 'error');
        return setError(r.error);
      }
      pickFile(null);
      setSavedLogo(r.logoUrl);
      setGuardado({ primary, accent });
      setRecienGuardado(true);
      toast('Marca guardada. Ya se ve en tu página y en tu panel.');
      router.refresh();
    } catch {
      setError('No se pudo guardar. Revisa tu internet e inténtalo otra vez.');
      toast('No se pudo guardar tu marca', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <Label htmlFor="brand-logo" className="text-[15px]">
            Logo
          </Label>
          <label
            htmlFor="brand-logo"
            className="flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-muted transition-colors focus-within:ring-2 focus-within:ring-primary/40 hover:text-ink"
          >
            <ImageUp className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{file ? file.name : savedLogo ? 'Cambiar logo (JPG, PNG o WebP, hasta 2 MB)' : 'Subir tu logo (JPG, PNG o WebP, hasta 2 MB)'}</span>
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
        <fieldset>
          <legend className="mb-2 text-[15px] font-medium text-ink">Combinaciones listas</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COMBINACIONES.map((c) => {
              const activa = c.primary.toLowerCase() === primary.toLowerCase() && c.accent.toLowerCase() === accent.toLowerCase();
              return (
                <button
                  key={c.nombre}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => {
                    setPrimary(c.primary);
                    setAccent(c.accent);
                  }}
                  className={`flex min-h-[3.25rem] items-center gap-2.5 rounded-2xl bg-surface px-3 text-left text-[15px] font-medium text-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    activa ? 'ring-[3px] ring-ink' : 'ring-1 ring-border hover:bg-ink/[0.03]'
                  }`}
                >
                  <span className="relative flex h-8 w-8 shrink-0" aria-hidden="true">
                    <span className="absolute inset-0 rounded-full" style={{ background: c.primary }} />
                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ring-2 ring-surface" style={{ background: c.accent }} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">{c.nombre}</span>
                  {activa && <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ColorField id="brand-primary" label="Color principal" hint="Botones y encabezado de tu página." value={primary} onChange={setPrimary} />
          <ColorField id="brand-accent" label="Color de detalle" hint="Pequeños resaltados: líneas, íconos, marcas." value={accent} onChange={setAccent} />
        </div>
        {ratio < 4.5 && (
          <p className="text-sm text-warning">
            Con este color principal, el texto de los botones casi no se lee. Prueba un tono más claro o más oscuro.
          </p>
        )}
        {/* 1.5 y no 3: el color de detalle va de fondo con texto legible
            encima, no como texto, y con 3 casi todas las combinaciones
            listas de arriba (tonos pastel) disparaban este aviso. */}
        {accentOnWhite < 1.5 && (
          <p className="text-sm text-warning">
            Tu color de detalle casi no se ve sobre fondo blanco. Prueba uno más fuerte.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="submit" isLoading={saving} className="max-sm:w-full !min-h-[3.25rem] !text-[16px]">
            {saving ? 'Guardando…' : 'Guardar marca'}
          </Button>
          <p role="status" className="text-[15px] max-sm:w-full max-sm:text-center">
            {saving ? null : sinGuardar ? (
              <span className="text-muted">Tienes cambios sin guardar</span>
            ) : recienGuardado ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-success">
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Guardado: ya se ve en tu página
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Vista previa en vivo: su página de reservas en un teléfono. Fondo
          blanco fijo, como la página pública en modo claro. */}
      <section aria-label="Vista previa de tu página" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <p className="mb-3 text-center text-[15px] font-medium text-muted">Así se ve tu página de reservas</p>
        <MarcoTelefono etiqueta={`Página de reservas de ${name}`}>
          <div className="h-24" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }} />
          <div className="-mt-9 px-4 pb-5">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob: o URL pública de Storage
              <img src={preview} alt="Tu logo" className="h-[4.5rem] w-[4.5rem] rounded-2xl bg-white object-contain p-1.5 shadow-md" />
            ) : (
              <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl text-2xl font-bold shadow-md ring-4 ring-white" style={{ background: primary, color: fg }}>
                {name.trim().charAt(0).toUpperCase() || '?'}
              </span>
            )}
            <p className="mt-3 truncate text-[19px] font-semibold leading-tight">{name || 'Tu negocio'}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#57534e]">
              <span className="h-2 w-2 rounded-full bg-[#15803d]" aria-hidden="true" /> Abierto hoy
              <MapPin className="ml-2 h-3.5 w-3.5" aria-hidden="true" /> Cómo llegar
            </p>
            <p className="mt-4 text-[13px] font-semibold text-[#57534e]">Elige tu servicio</p>
            <ul className="mt-2 flex flex-col gap-2">
              {[
                ['Corte y peinado', '$350'],
                ['Uñas gelish', '$280'],
                ['Tinte completo', '$750'],
              ].map(([servicio, precio], i) => (
                <li
                  key={servicio}
                  className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-[14px]"
                  style={i === 0 ? { borderColor: primary, background: `${primary}0f` } : { borderColor: '#e7e5e4' }}
                >
                  <span className="font-medium">{servicio}</span>
                  <span className="font-semibold" style={{ color: i === 0 ? primary : undefined }}>
                    {precio}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {['L', 'M', 'M', 'J', 'V'].map((d, i) => (
                <span
                  key={i}
                  className="flex h-9 flex-1 items-center justify-center rounded-lg text-[13px] font-semibold"
                  style={i === 2 ? { background: accent, color: `rgb(${readableFgRgb(accent)})` } : { background: '#f5f5f4' }}
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="mt-4 w-full rounded-full px-5 py-3 text-center text-[15px] font-semibold transition-colors" style={{ background: primary, color: fg }}>
              Reservar cita
            </div>
          </div>
        </MarcoTelefono>
        <p className={`mt-3 text-center text-[14px] ${ratio >= 4.5 ? 'text-success' : 'text-warning'}`}>
          {ratio >= 4.5 ? 'El texto del botón se lee bien' : 'El texto del botón se lee con dificultad'}
        </p>
      </section>
    </form>
  );
}
