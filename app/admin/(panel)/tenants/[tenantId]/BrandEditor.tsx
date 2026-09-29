'use client';

import { useState } from 'react';
import { THEME_PRESETS, type ThemeKey } from '@/lib/branding/themes';
import { FONT_OPTIONS, type FontKey } from '@/lib/branding/fonts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import type { TenantBranding } from './actions';

const COLOR_FIELDS = [
  ['primary_color', 'Primario'],
  ['secondary_color', 'Secundario'],
  ['accent_color', 'Acento'],
  ['background_color', 'Fondo'],
  ['text_color', 'Texto'],
] as const;

// Not an enum and not a <select>: these are the words that come up most
// often, offered as a datalist so a business whose vocabulary we haven't
// thought of ("Terapeuta", "Tatuador", "Pista") can still type its own.
const RESOURCE_LABEL_SUGGESTIONS = [
  'Profesional',
  'Estilista',
  'Doctor',
  'Doctora',
  'Terapeuta',
  'Cabina',
  'Consultorio',
  'Cancha',
  'Mesa',
  'Silla',
];

const IMAGE_FIELDS = [
  ['logo_url', 'Logo (URL)'],
  ['logo_mobile_url', 'Logo móvil (URL)'],
  ['favicon_url', 'Favicon (URL)'],
  ['cover_image_url', 'Imagen de portada (URL)'],
  ['profile_image_url', 'Imagen de perfil (URL)'],
] as const;

export function BrandEditor({
  initial,
  onSave,
}: {
  initial: TenantBranding;
  onSave: (branding: TenantBranding) => Promise<void>;
}) {
  const [form, setForm] = useState<TenantBranding>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof TenantBranding>(key: K, value: TenantBranding[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyPreset(key: ThemeKey) {
    const preset = THEME_PRESETS[key];
    setForm((f) => ({
      ...f,
      theme: key,
      primary_color: preset.primary_color,
      secondary_color: preset.secondary_color,
      accent_color: preset.accent_color,
      background_color: preset.background_color,
      text_color: preset.text_color,
      font_heading: preset.font_heading,
      font_body: preset.font_body,
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // Never show "Guardado ✓" when the write actually failed — that's
      // exactly what made this bug invisible until someone reloaded the
      // page and found their edits gone.
      setError(err instanceof Error ? err.message : 'No se pudo guardar la marca.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium text-ink">Tema base (punto de partida — los colores se pueden ajustar después)</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(THEME_PRESETS) as ThemeKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className="rounded-full border px-4 py-2 text-sm"
              style={{
                backgroundColor: THEME_PRESETS[key].background_color,
                color: THEME_PRESETS[key].text_color,
                borderColor: form.theme === key ? THEME_PRESETS[key].text_color : 'rgba(0,0,0,0.1)',
                fontWeight: form.theme === key ? 600 : 400,
              }}
            >
              {THEME_PRESETS[key].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink">
          Modo de la página pública (decide el equipo, no el visitante)
        </p>
        <div className="flex gap-2">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => set('theme_mode', mode)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                form.theme_mode === mode
                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                  : 'border-border text-muted hover:text-ink'
              }`}
            >
              {mode === 'light' ? 'Claro' : 'Oscuro'}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          {form.theme_mode === 'dark'
            ? 'El fondo se ancla al color más oscuro de la marca (excepto negro puro) — igual que el dashboard.'
            : 'Usa el Fondo y Texto elegidos abajo, como hasta ahora.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {COLOR_FIELDS.map(([key, label]) => (
          <div key={key}>
            <Label>{label}</Label>
            <input
              type="color"
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              className="h-10 w-full cursor-pointer rounded-lg border border-border"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Tipografía de encabezados</Label>
          <Select
            value={form.font_heading}
            onChange={(e) => set('font_heading', e.target.value)}
            className="w-full"
          >
            {(Object.keys(FONT_OPTIONS) as FontKey[]).map((k) => (
              <option key={k} value={k}>
                {FONT_OPTIONS[k].label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Tipografía de texto</Label>
          <Select value={form.font_body} onChange={(e) => set('font_body', e.target.value)} className="w-full">
            {(Object.keys(FONT_OPTIONS) as FontKey[]).map((k) => (
              <option key={k} value={k}>
                {FONT_OPTIONS[k].label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Descripción corta</Label>
        <textarea
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Words, not colours — but this is the only place the team can
          configure a business, so they live here rather than behind a
          second editor nobody would find. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Cómo le llama a quien (o a lo que) atiende</Label>
          <Input
            list="resource-label-suggestions"
            value={form.resource_label ?? ''}
            onChange={(e) => set('resource_label', e.target.value || null)}
            placeholder="Profesional"
            maxLength={40}
            className="w-full"
          />
          <datalist id="resource-label-suggestions">
            {RESOURCE_LABEL_SUGGESTIONS.map((word) => (
              <option key={word} value={word} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-muted">
            En singular. El paso de la reserva va a preguntar «
            {form.resource_label?.trim()
              ? `¿Qué ${form.resource_label.trim().toLowerCase()} prefieres?`
              : '¿Con quién prefieres reservar?'}
            ». Vacío = «Profesional».
          </p>
        </div>
        <div>
          <Label>Dirección</Label>
          <Input
            value={form.location ?? ''}
            onChange={(e) => set('location', e.target.value || null)}
            placeholder="Av. 20 de Noviembre 810, Centro, Durango"
            maxLength={200}
            className="w-full"
          />
          <p className="mt-1 text-xs text-muted">
            Aparece en el resumen de la reserva y en la confirmación. Vacío = no se muestra esa
            línea.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {IMAGE_FIELDS.map(([key, label]) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input
              type="url"
              value={form[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
              placeholder="https://..."
              className="w-full"
            />
          </div>
        ))}
      </div>
      <p className="-mt-2 text-xs text-muted">
        Por ahora son URLs directas — todavía no hay subida de archivos (necesitaría Supabase Storage,
        una pieza aparte).
      </p>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving} className="self-start">
          {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar marca'}
        </Button>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
    </div>
  );
}
