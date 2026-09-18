import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateTemplate, updateTemplateBlocks } from '../actions';
import { TemplateBuilder } from './TemplateBuilder';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import type { Block } from '@/lib/templates/blocks';

type DefaultService = { name: string; duration_minutes: number; price_cents: number };

const BOOKING_FIELD_OPTIONS = [
  { value: 'phone', label: 'Teléfono' },
  { value: 'email', label: 'Correo' },
  { value: 'notes', label: 'Notas' },
];

export default async function TemplateEditPage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  const admin = createAdminClient();
  const { data: template } = await admin
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template) {
    notFound();
  }

  const featuresText = (template.features as string[]).join('\n');
  const servicesText = (template.default_services as DefaultService[])
    .map((s) => `${s.name}|${s.duration_minutes}|${(s.price_cents / 100).toFixed(2)}`)
    .join('\n');
  const bookingFields = template.booking_form_fields as string[];
  const saveBlocks = updateTemplateBlocks.bind(null, template.id);

  return (
    <div>
      <Link href="/templates" className="text-sm text-muted hover:underline">
        ← Plantillas
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{template.name}</h1>
          <p className="mt-1 max-w-2xl text-muted">
            Vertical: <span className="font-medium text-ink">{template.vertical}</span>. Esta plantilla es el
            punto de partida: al crear un negocio se copia a su página, y a partir de ahí son independientes
            — editar aquí ya no toca los negocios que existen.
          </p>
        </div>
        {/* The whole point of editing a template: use it. Without this
            you had to leave, remember the vertical, and find it again
            in a dropdown. */}
        <Link href={'/tenants/new?vertical=' + encodeURIComponent(template.vertical)}>
          <Button type="button">
            <Plus className="h-4 w-4" />
            Crear negocio con esta plantilla
          </Button>
        </Link>
      </div>

      <section className="mt-6">
        <p className="mb-3 text-sm font-semibold text-ink">
          Contenido de la página pública — arrastra para reordenar
        </p>
        <TemplateBuilder accentColor={template.accent_color} initialBlocks={template.blocks as Block[]} onSave={saveBlocks} />
      </section>

      <section className="mt-10">
        <p className="mb-3 text-sm font-semibold text-ink">Configuración general</p>
        <Card>
          <form action={updateTemplate.bind(null, template.id)} className="flex flex-col gap-6">
            <div>
              <Label>Nombre</Label>
              <Input type="text" name="name" defaultValue={template.name} required className="w-full" />
            </div>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="available"
                defaultChecked={template.available}
                className="accent-primary"
              />
              Disponible para nuevos tenants (si no, queda marcada &quot;En espera&quot;)
            </label>

            <div>
              <Label>Color de acento (tarjeta de la galería)</Label>
              <input
                type="color"
                name="accent_color"
                defaultValue={template.accent_color}
                className="h-10 w-20 cursor-pointer rounded-lg border border-border"
              />
            </div>

            <div>
              <Label>Features (resumen en la tarjeta de la galería, una por línea)</Label>
              <textarea
                name="features"
                defaultValue={featuresText}
                rows={4}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <Label>Servicios por defecto (uno por línea: Nombre|duración_min|precio_mxn)</Label>
              <textarea
                name="default_services"
                defaultValue={servicesText}
                rows={4}
                placeholder="Corte de cabello|30|150"
                className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <Label>Campos del formulario de reserva pública</Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" checked disabled className="accent-primary" />
                  Nombre (siempre incluido)
                </label>
                {BOOKING_FIELD_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      name="booking_form_fields"
                      value={opt.value}
                      defaultChecked={bookingFields.includes(opt.value)}
                      className="accent-primary"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" className="self-start">
              Guardar cambios
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
