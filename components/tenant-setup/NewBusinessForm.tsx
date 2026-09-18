'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTenant } from '@/app/admin/(panel)/tenants/actions';
import { createTenantOwner } from '@/app/admin/(panel)/tenants/[tenantId]/actions';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (combining diacritical marks)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// One form, two panels. The internal team creates businesses at
// /admin/tenants/new and a sales rep at vendedores.dominio/negocios/nuevo
// — same fields, same server action; only where it navigates afterwards
// (`basePath`) and whether a rep can be picked (`resellers`, internal
// only) differ. createTenant itself decides attribution: a rep is always
// credited with what they create, and can never assign it elsewhere.
export function NewBusinessForm({
  verticals,
  initialVertical,
  basePath,
  resellers,
  askRetailPrice = false,
  defaultRetailPrice = 0,
  submitLabel = 'Crear negocio',
}: {
  verticals: { vertical: string; name: string }[];
  initialVertical?: string;
  basePath: string;
  resellers?: { id: string; name: string }[];
  // Reps price each business themselves, so their form asks for it up
  // front — prefilled with whatever they usually charge.
  askRetailPrice?: boolean;
  defaultRetailPrice?: number;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  // Honour ?vertical= only if it's a template that actually exists — a
  // stale or hand-typed value should fall back, not create a business
  // pointing at nothing.
  const [vertical, setVertical] = useState(
    verticals.some((v) => v.vertical === initialVertical)
      ? (initialVertical as string)
      : (verticals[0]?.vertical ?? 'general')
  );
  const [resellerId, setResellerId] = useState('');
  const [retailPrice, setRetailPrice] = useState(defaultRetailPrice ? String(defaultRetailPrice) : '');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit() {
    setError(null);

    if (!name.trim()) {
      setError('Falta el nombre del negocio.');
      return;
    }
    if (!SLUG_REGEX.test(slug)) {
      setError('El slug solo puede tener minúsculas, números y guiones (no al inicio ni al final).');
      return;
    }
    // Owner fields are optional, but if either is filled both are required.
    if ((ownerEmail || ownerPassword) && !(ownerEmail && ownerPassword)) {
      setError('Para crear el acceso del dueño hacen falta correo y contraseña, o deja ambos vacíos.');
      return;
    }

    const retail = retailPrice.trim() === '' ? null : Number(retailPrice);
    if (retail !== null && (!Number.isFinite(retail) || retail < 0 || retail > 100000)) {
      setError('El precio debe ser un monto entre 0 y 100,000 pesos.');
      return;
    }

    setSubmitting(true);
    const result = await createTenant({
      name,
      slug,
      vertical,
      resellerId: resellerId || null,
      retailPriceMxn: retail,
    });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    if (ownerEmail && ownerPassword) {
      const ownerResult = await createTenantOwner(result.tenantId, { email: ownerEmail, password: ownerPassword });
      setSubmitting(false);
      if (!ownerResult.ok) {
        // The business itself was created fine — only the owner step
        // failed. Go to its page, where the same form is available to
        // retry, instead of losing the business.
        router.push(`${basePath}/${result.tenantId}`);
        router.refresh();
        return;
      }
    } else {
      setSubmitting(false);
    }

    router.push(`${basePath}/${result.tenantId}`);
    router.refresh();
  }

  return (
    <Card className="flex max-w-md flex-col gap-4">
      <div>
        <Label htmlFor="biz-name">Nombre del negocio</Label>
        <Input
          id="biz-name"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Barbería El Punto"
          className="w-full"
        />
      </div>

      <div>
        <Label htmlFor="biz-slug">Slug (su dirección)</Label>
        <Input
          id="biz-slug"
          type="text"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          placeholder="barberia-el-punto"
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted">{slug || 'tu-slug'}.tuapp.com</p>
      </div>

      <div>
        <Label htmlFor="biz-vertical">Giro / plantilla</Label>
        <Select
          id="biz-vertical"
          value={vertical}
          onChange={(e) => setVertical(e.target.value)}
          className="w-full"
        >
          {verticals.map((v) => (
            <option key={v.vertical} value={v.vertical}>
              {v.name}
            </option>
          ))}
          <option value="general">General (sin plantilla)</option>
        </Select>
        <p className="mt-1 text-xs text-muted">
          Define con qué secciones arranca su página de reservas. Se puede editar después.
        </p>
      </div>

      {resellers && resellers.length > 0 && (
        <div>
          <Label htmlFor="biz-reseller">Vendedor que lo trajo</Label>
          <Select
            id="biz-reseller"
            value={resellerId}
            onChange={(e) => setResellerId(e.target.value)}
            className="w-full"
          >
            <option value="">Nadie (llegó directo)</option>
            {resellers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-muted">
            A quien le cobras este negocio cada mes. Se puede cambiar después.
          </p>
        </div>
      )}

      {askRetailPrice && (
        <div>
          <Label htmlFor="biz-price">Precio que le vas a cobrar (MXN al mes)</Label>
          <Input
            id="biz-price"
            type="number"
            min={0}
            max={100000}
            step={10}
            inputMode="numeric"
            value={retailPrice}
            onChange={(e) => setRetailPrice(e.target.value)}
            placeholder="700"
            className="w-full"
          />
          <p className="mt-1 text-xs text-muted">
            Tú le cobras a este negocio directamente. Lo puedes cambiar después.
          </p>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <p className="mb-1 text-sm font-medium text-ink">Acceso del dueño (opcional aquí mismo)</p>
        <p className="mb-3 text-xs text-muted">
          Déjalo vacío si todavía no tienes su correo — lo puedes crear después desde la página del negocio.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="biz-owner-email">Correo</Label>
            <Input
              id="biz-owner-email"
              type="email"
              autoComplete="off"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label htmlFor="biz-owner-password">Contraseña</Label>
            <Input
              id="biz-owner-password"
              type="password"
              autoComplete="new-password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted">Mínimo 10 caracteres. El dueño puede cambiarla después.</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl bg-error-soft p-3 text-sm text-error" role="alert">
          {error}
        </p>
      )}

      <Button type="button" onClick={handleSubmit} isLoading={submitting}>
        {submitting ? 'Creando' : submitLabel}
      </Button>
    </Card>
  );
}
