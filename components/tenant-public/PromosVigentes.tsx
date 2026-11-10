import { Tag } from 'lucide-react';
import { promosPublicas, type Promo } from '@/lib/lealtad/datos';
import { promoDemo } from '@/lib/lealtad/demo';
import { promoVigente } from '@/lib/lealtad/tarjeta';
import { isDemoSlug } from '@/lib/domains';
import { dayKey } from '@/lib/dates/tenantTime';
import { withAlpha } from '@/lib/branding/colors';

// Las promociones vigentes (módulo Lealtad, db/047) arriba de la página
// de reservas: una franja delgada, no un bloque más entre el visitante y
// la reserva. Sin módulo, sin tabla o sin promos vigentes: no pinta nada.
export async function PromosVigentes({
  slug,
  tenantId,
  timezone,
  enabled,
  accentColor,
}: {
  slug: string;
  tenantId: string;
  timezone: string | null;
  enabled: boolean;
  accentColor: string;
}) {
  const demo = isDemoSlug(slug);
  if (!enabled && !demo) return null;

  const now = new Date();
  let promos: Promo[] = enabled ? await promosPublicas(tenantId) : [];
  // Los demos enseñan una de ejemplo si no tienen ninguna propia.
  if (demo && promos.length === 0) promos = [promoDemo(now, timezone ?? 'America/Mexico_City')];

  const hoy = dayKey(now, timezone);
  const vigentes = promos.filter((p) => promoVigente(p, hoy)).slice(0, 2);
  if (vigentes.length === 0) return null;

  return (
    <div className="flex flex-col" style={{ backgroundColor: withAlpha(accentColor, 0.14) }}>
      {vigentes.map((p) => (
        <p key={p.id} className="mx-auto flex max-w-4xl items-start gap-2 px-4 py-2.5 text-sm text-ink">
          <Tag className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
          <span>
            <span className="font-semibold">{p.title}</span>
            {p.details && <span className="text-muted"> · {p.details}</span>}
            {p.code && (
              <span className="text-muted">
                {' '}
                · Código <span className="font-mono font-semibold text-ink">{p.code}</span>
              </span>
            )}
          </span>
        </p>
      ))}
    </div>
  );
}
