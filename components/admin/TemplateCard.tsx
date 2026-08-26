import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { duplicateTemplate } from '@/app/admin/(panel)/templates/actions';

export type Template = {
  id: string;
  vertical: string;
  name: string;
  features: string[];
  available: boolean;
  accent_color: string;
};

const ICONS: Record<string, string> = {
  peluqueria: '💇',
  dentista: '🦷',
  padel: '🎾',
};

export function TemplateCard({ template, tenantCount }: { template: Template; tenantCount: number }) {
  return (
    <Card padded={false} className="flex flex-col gap-4 overflow-hidden">
      {/* accent_color comes from the DB at runtime — a Tailwind class name
          built from it wouldn't exist in the build-time-generated CSS, so
          this has to be an inline style, not a className. */}
      <div
        className="flex h-32 items-center justify-center text-4xl"
        style={{ backgroundColor: `${template.accent_color}26` }}
      >
        {ICONS[template.vertical] ?? '✨'}
      </div>

      <div className="flex flex-col gap-3 px-5 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold tracking-tight text-ink">{template.name}</p>
            <p className="text-xs text-muted">{tenantCount} tenants usándola</p>
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
