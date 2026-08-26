'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTenant } from '../actions';
import { createTenantOwner } from '../[tenantId]/actions';
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

export function NewTenantForm({ verticals }: { verticals: { vertical: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [vertical, setVertical] = useState(verticals[0]?.vertical ?? 'general');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
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
      setError('Para crear el dueño hacen falta correo y contraseña, o deja ambos vacíos.');
      return;
    }

    setSubmitting(true);
    const result = await createTenant({ name, slug, vertical });

    if (!result.ok) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    if (ownerEmail && ownerPassword) {
      const ownerResult = await createTenantOwner(result.tenantId, { email: ownerEmail, password: ownerPassword });
      setSubmitting(false);
      if (!ownerResult.ok) {
        // The tenant itself was created fine — only the owner step
        // failed. Send them to the tenant's page, where the same "Dueño"
        // form is available to retry, instead of losing the tenant.
        router.push(`/tenants/${result.tenantId}`);
        router.refresh();
        return;
      }
    } else {
      setSubmitting(false);
    }

    router.push(`/tenants/${result.tenantId}`);
    router.refresh();
  }

  return (
    <Card className="flex max-w-md flex-col gap-4">
      <div>
        <Label>Nombre del negocio</Label>
        <Input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Barbería El Punto"
          className="w-full"
        />
      </div>

      <div>
        <Label>Slug (subdominio)</Label>
        <Input
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
        <Label>Vertical / plantilla</Label>
        <Select value={vertical} onChange={(e) => setVertical(e.target.value)} className="w-full">
          {verticals.map((v) => (
            <option key={v.vertical} value={v.vertical}>
              {v.name}
            </option>
          ))}
          <option value="general">General (sin plantilla)</option>
        </Select>
        <p className="mt-1 text-xs text-muted">
          Define qué bloques usa su página pública de reserva. Se puede editar después.
        </p>
      </div>

      <div className="border-t border-border pt-4">
        <p className="mb-1 text-sm font-medium text-ink">Dueño (opcional aquí mismo)</p>
        <p className="mb-3 text-xs text-muted">
          Déjalo vacío si todavía no tienes su correo — lo puedes agregar después desde el detalle del
          tenant.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Correo</Label>
            <Input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {error && <p className="rounded-2xl bg-error-soft p-3 text-sm text-error">{error}</p>}

      <Button type="button" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Creando...' : 'Crear tenant'}
      </Button>
    </Card>
  );
}
