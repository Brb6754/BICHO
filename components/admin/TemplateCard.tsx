import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { normalizeBlock, type Block } from '@/lib/templates/blocks';
import { duplicateTemplate } from '@/app/admin/(panel)/templates/actions';

export type Template = {
  id: string;
  vertical: string;
  name: string;
  features: string[];
  available: boolean;
  accent_color: string;
  // Both optional: db/022 may not be applied, and a template seeded
  // before this change has no blocks copy on the card's query.
  cover_image_url?: string | null;
  blocks?: Block[] | null;
};

// The cover used to be an emoji on a tinted band. It told you the
// vertical — which the name right below it already said — and nothing
// about what the template looks like, which is the only thing you are
// actually choosing between.
//
// Now: the photo if someone set one, otherwise a live miniature of the
// template's own opening section. No stock photography either way. A
// stock photo of strangers on a template for real businesses implies
// they are its customers, and the whole page would go stale the day the
// template changed; the miniature cannot, because it IS the template.
function Cover({ template }: { template: Template }) {
  if (template.cover_image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary
      // remote URL pasted by the team; next/image would need every
      // possible host configured up front.
      <img
        src={template.cover_image_url}
        alt=""
        className="h-40 w-full object-cover"
        loading="lazy"
      />
    );
  }

  // Only the opening sections: a cover is the first impression, and
  // rendering six whole templates on one page would cost more than the
  // page is worth.
  const preview = (template.blocks ?? []).slice(0, 2).map(normalizeBlock);

  if (preview.length === 0) {
    return (
      <div
        className="flex h-40 items-center justify-center"
        style={{ backgroundColor: `${template.accent_color}26` }}
      >
        <p className="px-6 text-center text-xs text-muted">Esta plantilla todavía no tiene secciones.</p>
      </div>
    );
  }

  return (
    <div className="relative h-40 overflow-hidden bg-paper">
      {/* Rendered at real page width and scaled down, so the proportions
          match what a visitor sees. pointer-events-none because this is a
          picture of a page, not a page. */}
      <div
        className="pointer-events-none absolute left-0 top-0 origin-top-left"
        style={{ width: 1100, transform: 'scale(0.29)' }}
        aria-hidden="true"
      >
        <BlockRenderer blocks={preview} />
      </div>
    </div>
  );
}

export function TemplateCard({ template, tenantCount }: { template: Template; tenantCount: number }) {
  return (
    <Card padded={false} className="flex flex-col gap-4 overflow-hidden">
      <Cover template={template} />

      <div className="flex flex-col gap-3 px-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-ink">{template.name}</p>
            <p className="text-xs text-muted">
              {tenantCount === 0
                ? 'Ningún negocio la usa todavía'
                : `${tenantCount} ${tenantCount === 1 ? 'negocio la usa' : 'negocios la usan'}`}
            </p>
          </div>
          <Badge tone={template.available ? 'default' : 'muted'}>
            {template.available ? 'Disponible' : 'En espera'}
          </Badge>
        </div>

        <ul className="flex flex-col gap-1 text-sm text-muted">
          {template.features.map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>

        <div className="mt-2 flex gap-2">
          <Link href={`/templates/${template.id}`} className="flex-1">
            <Button type="button" variant="ghost" className="w-full px-3 py-2 text-xs">
              Editar
            </Button>
          </Link>
          <form action={duplicateTemplate.bind(null, template.id)} className="flex-1">
            <Button type="submit" variant="ghost" className="w-full px-3 py-2 text-xs">
              Duplicar
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}
