import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, CalendarRange, Users, XCircle } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { MetricCard } from '@/components/admin/MetricCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { GrowthChart } from '@/components/admin/GrowthChart';
import { Card } from '@/components/ui/Card';
import { Table, Thead, Th, Tr, Td } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import {
  setTenantStatus,
  setTenantPlan,
  updateTenantBranding,
  updateTenantPage,
  createTenantOwner,
  setTenantWhatsapp,
  type TenantBranding,
} from './actions';
import { BrandEditor } from './BrandEditor';
import { ResellerPicker } from '../../vendedores/ResellerPicker';
import { WhatsappToggle } from '@/components/tenant-setup/WhatsappToggle';
import { getWhatsappAddon } from '@/lib/whatsapp/addonStatus';
import { formatMxn, isMissingResellersTable } from '@/lib/resellers';
import { OwnerCreator } from './OwnerCreator';
import { TemplateBuilder } from '../../templates/[templateId]/TemplateBuilder';
import { createDefaultBlock, type Block } from '@/lib/templates/blocks';

// This page has no dynamic API call of its own (createAdminClient has
// no cookies()/headers() dependency, unlike the tenant-facing Supabase
// client), so Next.js could otherwise cache its render and — even with
// revalidatePath() called from the Server Actions below — serve a
// stale copy on a plain back/forward navigation. Forcing it dynamic
// means every visit re-queries the tenant row for real, which matters
// specifically for BrandEditor: an admin editing colors, leaving, and
// coming back needs to see what's actually saved, not a cached
// snapshot from before the edit.
export const dynamic = 'force-dynamic';

const PLANS = ['standard'];

function weekBuckets(startsAtList: string[], weeks: number) {
  const now = new Date();
  const buckets: { label: string; count: number }[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 7);

    const count = startsAtList.filter((s) => {
      const d = new Date(s);
      return d >= weekStart && d < weekEnd;
    }).length;

    buckets.push({ label: `S-${i}`, count });
  }

  return buckets;
}

// Real comparison against the prior period — never fabricate a trend
// when there's nothing to compare against.
function computeTrend(current: number, previous: number): { label: string; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) {
    return current === 0
      ? { label: 'sin cambios', direction: 'flat' }
      : { label: 'nuevo', direction: 'up' };
  }
  const diffPercent = ((current - previous) / previous) * 100;
  if (Math.abs(diffPercent) < 1) {
    return { label: 'sin cambios', direction: 'flat' };
  }
  const sign = diffPercent > 0 ? '+' : '';
  return {
    label: `${sign}${diffPercent.toFixed(0)}% vs. periodo anterior`,
    direction: diffPercent > 0 ? 'up' : 'down',
  };
}

export default async function TenantDetailPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const admin = createAdminClient();

  const { data: tenant } = await admin.from('tenants').select('*').eq('id', tenantId).single();
  if (!tenant) {
    notFound();
  }

  // These four only depend on tenant.id, not on each other — running
  // them one at a time paid a full Supabase round-trip per query before
  // the next even started. Bundled into Promise.all so they all fire
  // together instead of queuing behind one another.
  const [{ data: ownerMembership }, { data: bookings }, { count: customerCount }, { data: payments }] =
    await Promise.all([
      admin.from('business_users').select('user_id, role').eq('tenant_id', tenant.id).eq('role', 'owner').maybeSingle(),
      admin.from('bookings').select('starts_at, status').eq('tenant_id', tenant.id).order('starts_at', { ascending: false }).limit(1000),
      admin.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      admin.from('payments').select('id, amount_cents, currency, status, provider, created_at').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(10),
    ]);

  let ownerEmail: string | null = null;
  if (ownerMembership) {
    const { data: ownerUser } = await admin.auth.admin.getUserById(ownerMembership.user_id);
    ownerEmail = ownerUser?.user?.email ?? null;
  }

  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setDate(now.getDate() - 30);
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setDate(now.getDate() - 60);

  const bookingDates = (bookings ?? []).map((b) => new Date(b.starts_at));
  const bookingsThisWeek = bookingDates.filter((d) => d >= oneWeekAgo).length;
  const bookingsLastWeek = bookingDates.filter((d) => d >= twoWeeksAgo && d < oneWeekAgo).length;
  const bookingsThisMonth = bookingDates.filter((d) => d >= oneMonthAgo).length;
  const bookingsLastMonth = bookingDates.filter((d) => d >= twoMonthsAgo && d < oneMonthAgo).length;
  const totalBookings = bookings?.length ?? 0;
  const cancelledBookings = bookings?.filter((b) => b.status === 'cancelled').length ?? 0;
  const cancellationRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : '0.0';

  const revenueCents =
    payments?.filter((p) => p.status === 'succeeded').reduce((sum, p) => sum + p.amount_cents, 0) ?? 0;

  const chartData = weekBuckets((bookings ?? []).map((b) => b.starts_at), 8);

  // What the canvas editor below starts from, in order of preference:
  // this business's own page, then its vertical's template, then a
  // bare-minimum page. The last case is real — a tenant on a vertical
  // with no template row (e.g. "general") has neither — and it still
  // needs exactly one booking block, since that is what makes the page
  // function at all.
  const { data: verticalTemplate } = await admin
    .from('templates')
    .select('blocks')
    .eq('vertical', tenant.vertical)
    .maybeSingle();

  // Who is credited with this business. Queried on its own and
  // tolerant of db/016 missing, so the whole detail page never breaks on
  // an environment that hasn't run that migration yet.
  const { data: resellerRows, error: resellersError } = await admin
    .from('resellers')
    .select('id, name, active')
    .order('name');
  const resellersAvailable = !isMissingResellersTable(resellersError);
  const resellers = (resellerRows ?? []) as { id: string; name: string; active: boolean }[];
  const currentReseller = resellers.find((r) => r.id === tenant.reseller_id) ?? null;

  const ownPage = tenant.page_blocks as Block[] | null;
  const fromTemplate = (verticalTemplate?.blocks ?? null) as Block[] | null;
  const tenantPageBlocks: Block[] =
    ownPage && ownPage.length > 0
      ? ownPage
      : fromTemplate && fromTemplate.length > 0
        ? fromTemplate
        : [createDefaultBlock('hero'), createDefaultBlock('booking')];

  const savePage = updateTenantPage.bind(null, tenant.id);


  // Read in its own call so a database without db/021 renders the
  // section as "falta la migración" instead of taking the page down.
  const whatsapp = await getWhatsappAddon(tenant.id);

  return (
    <div>
      <div className="flex items-center gap-3">
        <Text variant="h1">{tenant.name}</Text>
        <StatusBadge status={tenant.status} />
      </div>
      <Text variant="body" className="mt-1 text-muted">
        {tenant.slug} · {tenant.vertical} · alta el {new Date(tenant.created_at).toLocaleDateString('es-MX')}
      </Text>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Citas esta semana"
          value={String(bookingsThisWeek)}
          icon={CalendarDays}
          trend={computeTrend(bookingsThisWeek, bookingsLastWeek)}
          emphasis
        />
        <MetricCard
          label="Citas este mes"
          value={String(bookingsThisMonth)}
          icon={CalendarRange}
          trend={computeTrend(bookingsThisMonth, bookingsLastMonth)}
        />
        <MetricCard label="Clientes registrados" value={String(customerCount ?? 0)} icon={Users} />
        <MetricCard label="Tasa de cancelación" value={`${cancellationRate}%`} icon={XCircle} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Text variant="h3" className="mb-4">
            Citas por semana (últimas 8)
          </Text>
          <GrowthChart data={chartData} />
        </Card>

        <Card>
          <p className="mb-4 text-sm font-semibold text-ink">Info general</p>
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Dueño</dt>
              <dd className="text-ink">{ownerEmail ?? 'Sin owner asignado'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Plan</dt>
              <dd className="capitalize text-ink">{tenant.plan}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Próxima renovación</dt>
              <dd className="text-ink">— (falta paso 7)</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Ingresos procesados vía plataforma</dt>
              <dd className="text-ink">${(revenueCents / 100).toLocaleString('es-MX')} MXN</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="mb-4 text-sm font-semibold text-ink">Historial de pagos</p>
          {payments && payments.length > 0 ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Monto</Th>
                  <Th>Proveedor</Th>
                  <Th>Estado</Th>
                </tr>
              </Thead>
              <tbody>
                {payments.map((p) => (
                  <Tr key={p.id}>
                    <Td>{new Date(p.created_at).toLocaleDateString('es-MX')}</Td>
                    <Td>
                      ${(p.amount_cents / 100).toFixed(2)} {p.currency}
                    </Td>
                    <Td className="capitalize">{p.provider}</Td>
                    <Td className="capitalize">{p.status}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="text-sm text-muted">
              Sin pagos registrados todavía — la pasarela de cobro (paso 7) aún no está conectada.
            </p>
          )}
        </Card>

        <Card>
          <p className="mb-4 text-sm font-semibold text-ink">Actividad reciente</p>
          <p className="mb-3 text-xs text-muted">
            Placeholder — todavía no existe un log de actividad real en la base.
          </p>
          <ul className="flex flex-col gap-3 text-sm">
            <li className="text-ink">
              <span className="text-muted">hace 2 días —</span> Cuenta creada
            </li>
            <li className="text-ink">
              <span className="text-muted">hace 1 día —</span> Primer recurso configurado
            </li>
          </ul>
        </Card>
      </div>

      <section className="mt-10">
        <OwnerCreator currentOwnerEmail={ownerEmail} onCreate={createTenantOwner.bind(null, tenant.id)} />
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Extras</p>
          <p className="text-xs text-muted">Se activan y se apagan por negocio.</p>
        </div>
        {whatsapp.available ? (
          <WhatsappToggle
            enabled={whatsapp.enabled}
            sentThisMonth={whatsapp.sentThisMonth}
            onToggle={setTenantWhatsapp.bind(null, tenant.id)}
            audience="admin"
          />
        ) : (
          <Card className="max-w-xl">
            <p className="text-sm font-medium text-ink">Falta correr la migración</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              El extra de WhatsApp necesita{' '}
              <code className="font-mono text-xs">db/021_whatsapp_addon.sql</code> en el SQL Editor
              de Supabase.
            </p>
          </Card>
        )}
      </section>


      {resellersAvailable && (
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Vendedor</p>
            <p className="text-xs text-muted">
              {currentReseller
                ? 'Este negocio se le cobra a su vendedor, no al negocio.'
                : 'Sin vendedor: nadie te paga por este negocio.'}
            </p>
          </div>
          <Card className="flex flex-col gap-3">
            <ResellerPicker
              tenantId={tenant.id}
              currentResellerId={(tenant.reseller_id as string | null) ?? null}
              resellers={resellers}
            />
            {currentReseller && tenant.retail_price_mxn != null && (
              <p className="text-sm text-muted">
                Él le cobra {formatMxn(tenant.retail_price_mxn as number)} al mes a este negocio.
              </p>
            )}
            {currentReseller && (
              <Link
                href={`/vendedores/${currentReseller.id}`}
                className="self-start text-sm text-muted hover:text-ink hover:underline"
              >
                Ver a {currentReseller.name}
              </Link>
            )}
          </Card>
        </section>
      )}

      {/* This business's OWN page — the same canvas editor the template
          gallery uses, but saving to tenants.page_blocks. Editing here
          cannot touch the template or any other business (db/015). */}
      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Página de reservas de este negocio</p>
          <p className="text-xs text-muted">
            {tenant.page_blocks
              ? 'Copia propia — editar la plantilla ya no la afecta.'
              : 'Aún sin copia propia: se está mostrando la plantilla de su vertical. Al guardar aquí, este negocio pasa a tener la suya.'}
          </p>
        </div>
        <TemplateBuilder
          accentColor={tenant.accent_color ?? undefined}
          initialBlocks={tenantPageBlocks}
          onSave={savePage}
        />
      </section>

      <section className="mt-10">
        <p className="mb-3 text-sm font-semibold text-ink">Marca</p>
        <Card>
          <BrandEditor
            initial={{
              description: tenant.description,
              theme: tenant.theme,
              theme_mode: tenant.theme_mode,
              primary_color: tenant.primary_color,
              secondary_color: tenant.secondary_color,
              accent_color: tenant.accent_color,
              background_color: tenant.background_color,
              text_color: tenant.text_color,
              font_heading: tenant.font_heading,
              font_body: tenant.font_body,
              logo_url: tenant.logo_url,
              logo_mobile_url: tenant.logo_mobile_url,
              favicon_url: tenant.favicon_url,
              cover_image_url: tenant.cover_image_url,
              profile_image_url: tenant.profile_image_url,
            }}
            onSave={updateTenantBranding.bind(null, tenant.id) as (b: TenantBranding) => Promise<void>}
          />
        </Card>
      </section>

      <Card className="mt-10">
        <p className="mb-4 text-sm font-semibold text-ink">Acciones rápidas</p>
        <div className="flex flex-wrap items-center gap-3">
          {tenant.status === 'suspended' ? (
            <form action={setTenantStatus.bind(null, tenant.id, 'active')}>
              <Button type="submit" variant="primary">
                Reactivar cuenta
              </Button>
            </form>
          ) : (
            <ConfirmForm
              action={setTenantStatus.bind(null, tenant.id, 'suspended')}
              confirmTitle="Suspender cuenta"
              confirmMessage={`¿Seguro que quieres suspender a "${tenant.name}"? Su página pública y dashboard dejarán de estar accesibles hasta reactivarla.`}
              confirmLabel="Suspender"
            >
              Suspender cuenta
            </ConfirmForm>
          )}

          <form action={setTenantPlan.bind(null, tenant.id)} className="flex items-center gap-2">
            <Select name="plan" defaultValue={tenant.plan} className="w-40">
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="ghost">
              Cambiar plan
            </Button>
          </form>

          <Button type="button" variant="ghost" disabled title="Próximamente">
            Resetear onboarding
          </Button>

          {ownerEmail && (
            <a href={`mailto:${ownerEmail}`}>
              <Button type="button" variant="ghost">
                Contactar al dueño
              </Button>
            </a>
          )}
        </div>
      </Card>
    </div>
  );
}
