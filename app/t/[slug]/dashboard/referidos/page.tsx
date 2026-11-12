import { Gift, MessageCircle } from 'lucide-react';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, SectionHeading } from '@/components/tenant-dash/PageHeader';
import { CopyLinkButton } from '@/components/tenant-dash/CopyLinkButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { referralUrl } from '@/lib/referidos/rules';
import { isMissingReferrals } from '@/lib/referidos/grant';

export const dynamic = 'force-dynamic';

type Referral = { referred_name: string; created_at: string; first_paid_at: string | null; credit_status: string };

// Referidos (db/052): para todos los negocios, sin flag. Se lee con el
// cliente de sesión: RLS solo deja ver las filas donde este negocio es el
// referidor, y la tabla no tiene más que nombre y estado del referido.
export default async function ReferidosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId } = await requireTenantStaff(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('referrals')
    .select('referred_name, created_at, first_paid_at, credit_status')
    .eq('referrer_tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error && !isMissingReferrals(error)) throw new Error(`referidos: ${error.message}`);
  const rows = (data ?? []) as Referral[];

  const url = referralUrl(slug);
  const message = `Uso bicho para que mis clientes agenden sus citas solos. Si quieres probarlo, regístrate con mi link y tienes 15 días gratis: ${url}`;
  const paid = rows.filter((r) => r.first_paid_at).length;
  const applied = rows.filter((r) => r.credit_status === 'applied' || r.credit_status === 'done').length;
  const pending = rows.filter((r) => r.credit_status === 'pending').length;

  return (
    <div>
      <PageHeader
        title="Referidos"
        description="Recomienda bicho a otro negocio. Por cada uno que se registre con tu link y haga su primer pago, ganas 1 mes gratis."
      />

      <section className="mt-8 rounded-2xl bg-surface p-5 ring-1 ring-border sm:p-6">
        <p className="text-sm font-medium text-muted">Tu link</p>
        <p className="mt-1 break-all text-[15px] font-medium text-ink">{url}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <CopyLinkButton url={url} label="Copiar link" />
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-[rgb(var(--color-cta-fg))] shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Compartir por WhatsApp
          </a>
        </div>
      </section>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Se registraron', rows.length],
          ['Ya pagaron', paid],
          ['Meses aplicados', applied],
          ['Meses por aplicar', pending],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {pending > 0 && (
        <p className="mt-3 text-sm text-muted">Como ya pagas tu plan, esos meses los aplicamos a mano a tu suscripción.</p>
      )}

      <section className="mt-10">
        <SectionHeading title="Negocios que invitaste" meta={rows.length || undefined} />
        {rows.length === 0 ? (
          <EmptyState icon={Gift} title="Aún nadie se registra con tu link" description="Compártelo con otros negocios que agenden por WhatsApp o en libreta." />
        ) : (
          <ul className="divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
            {rows.map((r) => (
              <li key={`${r.referred_name}-${r.created_at}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-[15px] text-ink">{r.referred_name}</span>
                <Badge tone={r.first_paid_at ? 'default' : 'muted'}>{r.first_paid_at ? 'Ya pagó' : 'En prueba'}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
