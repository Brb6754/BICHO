import { Check, Gift, Hourglass } from 'lucide-react';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, SectionHeading } from '@/components/tenant-dash/PageHeader';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/tenant-dash/crecer/ui';
import { referralUrl } from '@/lib/referidos/rules';
import { isMissingReferrals } from '@/lib/referidos/grant';
import { CompartirReferido } from './CompartirReferido';

export const dynamic = 'force-dynamic';

type Referral = { referred_name: string; created_at: string; first_paid_at: string | null; credit_status: string };

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
  const pending = rows.filter((r) => r.credit_status === 'pending').length;
  // Siempre hay un regalo vacío por delante: la meta siguiente se ve.
  const casillas = Math.max(3, paid + 1);

  return (
    <div>
      <PageHeader
        title="Gana meses gratis"
        description="Invita a otro negocio: cuando pague su primer mes, tú ganas uno gratis."
        help={
          <HelpTip title="¿Cómo funciona?">
            1. Le mandas tu link a otro negocio que agenda por WhatsApp o en libreta. 2. Se registra y prueba bicho 15 días
            gratis. 3. Cuando paga su primer mes, tú ganas un mes gratis. No hay límite.
          </HelpTip>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        <CompartirReferido mensaje={message} url={url} />

        <section aria-labelledby="referidos-premios" className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <h2 id="referidos-premios" className="text-[15px] font-medium text-muted">
            Tus meses gratis
          </h2>
          <p className="mt-1 text-[1.75rem] font-semibold leading-tight text-ink">
            {paid === 0 ? 'Aún ninguno' : `${paid} ${paid === 1 ? 'mes ganado' : 'meses ganados'}`}
          </p>
          <ol className="mt-5 flex flex-wrap gap-3" aria-label={`${paid} meses gratis ganados`}>
            {Array.from({ length: casillas }, (_, i) => {
              const ganado = i < paid;
              return (
                <li
                  key={i}
                  className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl text-[13px] font-semibold ${
                    ganado ? 'animate-pop-in bg-primary text-[rgb(var(--color-cta-fg))] shadow-sm' : 'border-2 border-dashed border-ink/20 text-muted'
                  }`}
                  style={ganado ? { animationDelay: `${i * 80}ms`, animationFillMode: 'both' } : undefined}
                >
                  <Gift className="h-6 w-6" aria-hidden="true" />
                  <span className="mt-0.5">{ganado ? 'Ganado' : `Mes ${i + 1}`}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 text-[15px] leading-relaxed text-ink">
            {rows.length === 0
              ? 'Tu primer mes gratis está a una invitación de distancia.'
              : `${rows.length} ${rows.length === 1 ? 'negocio se registró' : 'negocios se registraron'} con tu link y ${paid} ${paid === 1 ? 'ya pagó' : 'ya pagaron'}.`}
          </p>
          {pending > 0 && (
            <p className="mt-2 text-[14px] text-muted">
              {pending} {pending === 1 ? 'mes está' : 'meses están'} por aplicarse: como ya pagas tu plan, lo aplicamos nosotros a tu cobro.
            </p>
          )}
        </section>
      </div>

      <section className="mt-10">
        <SectionHeading title="Negocios que invitaste" meta={rows.length || undefined} />
        {rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-5 [&>div]:py-10">
            <EmptyState
              icon={Gift}
              title="Todavía nadie se registra con tu link"
              description="Cuando un negocio se registre, aparece aquí y ves si ya pagó."
              why="Piensa en tu estilista de confianza, tu dentista o la barbería de enfrente: cada uno que pague es un mes que no pagas tú."
            />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <li key={`${r.referred_name}-${r.created_at}`} className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  <Avatar nombre={r.referred_name} />
                  <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-ink">{r.referred_name}</p>
                </div>
                <ol className="flex items-center gap-2 text-[14px] font-medium">
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-success">
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Se registró
                  </li>
                  <li aria-hidden="true" className={`h-0.5 w-5 rounded-full ${r.first_paid_at ? 'bg-success' : 'bg-ink/15'}`} />
                  <li
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${
                      r.first_paid_at ? 'bg-success-soft text-success' : 'bg-ink/[0.06] text-muted'
                    }`}
                  >
                    {r.first_paid_at ? <Gift className="h-4 w-4" aria-hidden="true" /> : <Hourglass className="h-4 w-4" aria-hidden="true" />}
                    {r.first_paid_at ? 'Pagó: ganaste 1 mes' : 'Probando gratis'}
                  </li>
                </ol>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
