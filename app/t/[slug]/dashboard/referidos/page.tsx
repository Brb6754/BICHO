import { Gift, MessageCircle } from 'lucide-react';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, SectionHeading } from '@/components/tenant-dash/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { referralUrl } from '@/lib/referidos/rules';
import { isMissingReferrals } from '@/lib/referidos/grant';
import { CompartirReferido } from './CompartirReferido';

export const dynamic = 'force-dynamic';

type Referral = { referred_name: string; created_at: string; first_paid_at: string | null; credit_status: string };

const PASOS = [
  'Le mandas tu mensaje a otro negocio que agenda por WhatsApp o en libreta.',
  'Se registra con tu link y prueba bicho 15 días gratis.',
  'Cuando paga su primer mes, tú ganas un mes gratis.',
];

// "Gana meses gratis" (referidos, db/052): para todos los negocios, sin
// flag. Se lee con el cliente de sesión: RLS solo deja ver las filas donde
// este negocio es el referidor, y la tabla no tiene más que nombre y
// estado del referido.
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

  const whatsapp = (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noreferrer"
      className="ui-btn inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      Mandar por WhatsApp
    </a>
  );

  return (
    <div>
      <PageHeader
        title="Gana meses gratis"
        description="Recomienda bicho a otro negocio: cuando pague su primer mes, tú ganas uno gratis."
        action={whatsapp}
      />

      <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <SectionHeading title="Tu mensaje, listo para mandar" />
          <CompartirReferido mensaje={message} url={url} />
        </div>
        <div>
          <SectionHeading title="Cómo funciona" />
          <ol className="flex flex-col gap-4">
            {PASOS.map((p, i) => (
              <li key={p} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-sm font-semibold tabular-nums">
                  {i + 1}
                </span>
                {p}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {rows.length > 0 && (
        <>
          <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Se registraron', rows.length],
              ['Ya pagaron', paid],
              ['Meses que ya ganaste', applied],
              ['Meses por aplicar', pending],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surface p-4 ring-1 ring-border">
                <dt className="text-[13px] text-muted">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {pending > 0 && (
            <p className="mt-3 text-sm text-muted">Como ya pagas tu plan, esos meses los aplicamos nosotros a tu suscripción.</p>
          )}
        </>
      )}

      <section className="mt-10">
        <SectionHeading title="Negocios que invitaste" meta={rows.length || undefined} />
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-5 [&>div]:py-10">
            <EmptyState
              icon={Gift}
              title="Todavía nadie se registra con tu link"
              description="Cuando un negocio se registre con tu link, aparece aquí y ves si ya pagó."
              why="Piensa en tu estilista de confianza, tu dentista o la barbería de enfrente: cada uno que pague es un mes que no pagas tú."
              action={whatsapp}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
            {rows.map((r) => (
              <li key={`${r.referred_name}-${r.created_at}`} className="flex min-h-[3.25rem] items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-[15px] text-ink">{r.referred_name}</span>
                <Badge tone={r.first_paid_at ? 'default' : 'muted'}>{r.first_paid_at ? 'Ya pagó: ganaste 1 mes' : 'Probando gratis'}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
