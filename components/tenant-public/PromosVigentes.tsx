import { promosPublicas, type Promo } from '@/lib/lealtad/datos';
import { promoDemo } from '@/lib/lealtad/demo';
import { promoVigente } from '@/lib/lealtad/tarjeta';
import { isDemoSlug } from '@/lib/domains';
import { dayKey } from '@/lib/dates/tenantTime';

// Las promociones vigentes (módulo Lealtad, db/047) de la página de
// reservas. Antes eran una franja de aviso pegada arriba de todo; ahora
// solo se calculan aquí y la portada (components/blocks/Storefront) las
// pinta como un boleto dentro de la presentación del negocio. Sin
// módulo, sin tabla o sin promos vigentes: lista vacía.
export async function promosVigentes({
  slug,
  tenantId,
  timezone,
  enabled,
}: {
  slug: string;
  tenantId: string;
  timezone: string | null;
  enabled: boolean;
}): Promise<Promo[]> {
  const demo = isDemoSlug(slug);
  if (!enabled && !demo) return [];

  const now = new Date();
  let promos: Promo[] = enabled ? await promosPublicas(tenantId) : [];
  // Los demos enseñan una de ejemplo si no tienen ninguna propia.
  if (demo && promos.length === 0) promos = [promoDemo(now, timezone ?? 'America/Mexico_City')];

  const hoy = dayKey(now, timezone);
  return promos.filter((p) => promoVigente(p, hoy)).slice(0, 2);
}
