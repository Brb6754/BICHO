'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/access';
import type { Block } from '@/lib/templates/blocks';

// No redirect() in either action — both just mutate + revalidate and
// stay on the same page, so neither hits the Server-Action
// redirect-bypasses-middleware issue documented in CLAUDE.md.

export async function duplicateTemplate(templateId: string) {
  // Templates are shared by every business on a vertical — internal only.
  await requireAdmin();
  const admin = createAdminClient();
  const { data: original } = await admin.from('templates').select('*').eq('id', templateId).single();
  if (!original) return;

  // vertical has a unique constraint — find a free "-copia" slug.
  let newVertical = `${original.vertical}-copia`;
  let suffix = 2;
  for (;;) {
    const { data: existing } = await admin
      .from('templates')
      .select('id')
      .eq('vertical', newVertical)
      .maybeSingle();
    if (!existing) break;
    newVertical = `${original.vertical}-copia-${suffix}`;
    suffix++;
  }

  const { error } = await admin.from('templates').insert({
    vertical: newVertical,
    name: `${original.name} (copia)`,
    features: original.features,
    available: false,
    accent_color: original.accent_color,
    default_services: original.default_services,
    booking_form_fields: original.booking_form_fields,
    blocks: original.blocks,
  });
  if (error) throw new Error(`No se pudo duplicar la plantilla: ${error.message}`);

  revalidatePath('/admin/templates');
}

export async function updateTemplate(templateId: string, formData: FormData) {
  // Templates are shared by every business on a vertical — internal only.
  await requireAdmin();
  const name = formData.get('name') as string;
  const available = formData.get('available') === 'on';
  const accentColor = formData.get('accent_color') as string;
  const featuresRaw = (formData.get('features') as string) ?? '';
  const servicesRaw = (formData.get('default_services') as string) ?? '';
  const bookingFields = formData.getAll('booking_form_fields') as string[];

  const features = featuresRaw
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);

  // One service per line: "Nombre|duración_min|precio_mxn"
  const defaultServices = servicesRaw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [svcName, duration, priceMxn] = line.split('|').map((p) => p.trim());
      return {
        name: svcName ?? '',
        duration_minutes: Number(duration) || 0,
        price_cents: Math.round((Number(priceMxn) || 0) * 100),
      };
    });

  const admin = createAdminClient();
  const { error } = await admin
    .from('templates')
    .update({
      name,
      available,
      accent_color: accentColor,
      features,
      default_services: defaultServices,
      // "name" isn't a checkbox in the form (it's always required, shown
      // disabled+checked for clarity) — so it never arrives via
      // getAll(), and has to be added back here explicitly.
      booking_form_fields: ['name', ...bookingFields],
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId);
  if (error) throw new Error(`No se pudo guardar la plantilla: ${error.message}`);

  revalidatePath('/admin/templates');
  revalidatePath(`/admin/templates/${templateId}`);
}

// Called directly from the client (TemplateBuilder.tsx), not through a
// <form action>, via .bind(null, templateId) — Next.js supports invoking
// a bound Server Action reference as a plain async function from a
// Client Component, not just wiring it to a form.
export async function updateTemplateBlocks(templateId: string, blocks: Block[]) {
  // Templates are shared by every business on a vertical — internal only.
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('templates')
    .update({ blocks, updated_at: new Date().toISOString() })
    .eq('id', templateId);
  if (error) throw new Error(`No se pudieron guardar los bloques: ${error.message}`);

  revalidatePath('/admin/templates');
  revalidatePath(`/admin/templates/${templateId}`);
}
