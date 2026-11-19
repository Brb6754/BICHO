'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createTenant } from '@/app/admin/(panel)/tenants/actions';
import { createTenantOwner } from '@/app/admin/(panel)/tenants/[tenantId]/actions';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { isReservedSlug } from '@/lib/domains';
import { tenantShareUrl } from '@/lib/urls';

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
//
// Pensado para llenarse en un teléfono frente al dueño: el link se
// arma solo con el nombre (se edita solo si hace falta), cada campo
// abre el teclado que le toca, y un error nunca borra lo escrito.
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
  const [editingSlug, setEditingSlug] = useState(false);
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function slugError(message: string) {
    setEditingSlug(true);
    setError(message);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Falta el nombre del negocio.');
      return;
    }
    // Mirrors the server check in createTenant. Here it is a courtesy —
    // the one that cannot be bypassed is the Server Action's.
    if (isReservedSlug(slug)) {
      slugError(`«${slug}» está reservado por bicho. Elige otro link.`);
      return;
    }

    if (!SLUG_REGEX.test(slug)) {
      slugError('El link solo puede llevar minúsculas, números y guiones (no al inicio ni al final).');
      return;
    }
    // Owner fields are optional, but if either is filled both are required.
    if ((ownerEmail || ownerPassword) && !(ownerEmail && ownerPassword)) {
      setError('Para crear el acceso del dueño hacen falta correo y contraseña, o deja los dos vacíos.');
      return;
    }
    // Same checks createTenantOwner makes. Caught here so the business is
    // never created with an owner step that was bound to fail.
    if (ownerEmail && !EMAIL_REGEX.test(ownerEmail.trim())) {
      setError('Revisa el correo del dueño: le falta algo (por ejemplo, nombre@gmail.com).');
      return;
    }
    if (ownerPassword && ownerPassword.length < 10) {
      setError('La contraseña del dueño necesita al menos 10 caracteres.');
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
        toast(`Negocio creado, pero falta su acceso: ${ownerResult.error}`, 'error');
        router.push(`${basePath}/${result.tenantId}`);
        router.refresh();
        return;
      }
    } else {
      setSubmitting(false);
    }

    toast('Negocio creado');
    router.push(`${basePath}/${result.tenantId}`);
    router.refresh();
  }

  const preview = tenantShareUrl(slug || 'su-negocio').replace(/^https?:\/\//, '');

  return (
    <Card className="max-w-md">
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <Label htmlFor="biz-name" tone="ink">
            Nombre del negocio
          </Label>
          <Input
            id="biz-name"
            type="text"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Barbería El Punto"
            className="w-full"
          />
          {/* El link sale del nombre; solo se edita si hace falta. */}
          <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px]">
            <p className="min-w-0 text-muted [overflow-wrap:anywhere]">
              Su link: <span className="font-medium text-ink">{preview}</span>
            </p>
            {!editingSlug && (
              <button
                type="button"
                onClick={() => setEditingSlug(true)}
                className="-my-2 inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 font-medium text-ink underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Cambiar
              </button>
            )}
          </div>
        </div>

        {editingSlug && (
          <div>
            <Label htmlFor="biz-slug" tone="ink">
              Link de su página
            </Label>
            <Input
              id="biz-slug"
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase());
                setSlugTouched(true);
              }}
              placeholder="barberia-el-punto"
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted">Minúsculas, números y guiones. Es lo que el negocio comparte con sus clientes.</p>
          </div>
        )}

        <div>
          <Label htmlFor="biz-vertical" tone="ink">
            Giro
          </Label>
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
            <option value="general">Otro giro (página básica)</option>
          </Select>
          <p className="mt-1 text-xs text-muted">Con esto arranca el diseño de su página. Se puede cambiar después.</p>
        </div>

        {resellers && resellers.length > 0 && (
          <div>
            <Label htmlFor="biz-reseller" tone="ink">
              Vendedor que lo trajo
            </Label>
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
            <Label htmlFor="biz-price" tone="ink">
              Lo que le vas a cobrar al mes
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted" aria-hidden="true">
                $
              </span>
              <Input
                id="biz-price"
                type="number"
                min={0}
                max={100000}
                step={10}
                inputMode="numeric"
                enterKeyHint="next"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
                placeholder="700"
                className="w-full pl-8"
              />
            </div>
            <p className="mt-1 text-xs text-muted">En pesos. Se lo cobras tú directamente; lo puedes cambiar después.</p>
          </div>
        )}

        <fieldset className="border-t border-border pt-5">
          <legend className="sr-only">Acceso del dueño</legend>
          <p className="text-sm font-semibold text-ink">
            Acceso del dueño <span className="font-normal text-muted">(opcional)</span>
          </p>
          <p className="mb-3 mt-0.5 text-xs leading-relaxed text-muted">
            Si ya tienes su correo, que escriba su contraseña aquí mismo. Si no, lo creas después desde la página del
            negocio.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <Label htmlFor="biz-owner-email" tone="ink">
                Su correo
              </Label>
              <Input
                id="biz-owner-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="nombre@gmail.com"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="biz-owner-password" tone="ink">
                Su contraseña
              </Label>
              <div className="relative">
                <Input
                  id="biz-owner-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  className="w-full pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">Mínimo 10 caracteres. La puede cambiar después.</p>
            </div>
          </div>
        </fieldset>

        {error && (
          <p className="rounded-2xl bg-error-soft p-3 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" isLoading={submitting} className="w-full">
          {submitting ? 'Creando…' : submitLabel}
        </Button>
      </form>
    </Card>
  );
}
