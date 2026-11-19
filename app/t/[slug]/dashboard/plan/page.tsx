import Link from 'next/link';
import { Check, Clock3, FileText } from 'lucide-react';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader, SectionHeading } from '@/components/tenant-dash/PageHeader';
import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';
import { TRIAL_GRACE_DAYS, tenantAccess } from '@/lib/billing/trial';
import { longDate } from '@/lib/dates/tenantTime';
import { ADDON_BOOST, CUPO_FUNDADOR, PLANES, PLAN_IDS, PRECIO_FUNDADOR_MXN, planDe, precioCheckout, precioMensual, type Modulo, type PlanId } from '@/lib/billing/planes';
import { fundadoresUsados } from '@/lib/billing/planServer';
import { ActivatePlanButton } from './ActivatePlanButton';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';
import { PlanPicker, type PlanVista } from './PlanPicker';
import { ComoSiguePrueba } from './ComoSiguePrueba';
import { DescargarDatos } from './DescargarDatos';

export const dynamic = 'force-dynamic';

// Cada módulo de planes.ts dicho como lo diría ella. La lista de cada plan
// sale de PLANES[x].modulos, así que si cambia un plan, cambia esta página.
const QUE_ES: Partial<Record<Modulo, string>> = {
  reservas: 'Página de reservas, agenda, clientes y servicios',
  resico: 'Calculadora de impuestos (RESICO)',
  caja: 'Caja: cuánto vendiste y cuánto te quedó',
  lealtad: 'Tarjeta de sellos y promociones',
  regresan: 'Clientes que regresan y recordatorio de cita',
  inventario: 'Inventario de productos',
  comisiones: 'Comisiones de tu equipo',
  cotizaciones: 'Cotizaciones en PDF',
  reuniones: 'Reuniones con prospectos',
  facturacion: 'Facturas del SAT (100 al mes)',
  copiloto: 'Copiloto: pregúntale a tu negocio',
};
// La recepcionista no vive en PLANES (se prende aparte), pero solo existe en Pro (planPermiteAgente).
const EXTRA_DE_PLAN: Partial<Record<PlanId, string>> = { pro: 'Recepcionista de WhatsApp (la conectamos nosotros)' };
const PARA: Record<PlanId, string> = {
  esencial: 'Para empezar a recibir citas en línea, sin llamadas ni libreta.',
  negocio: 'Para que tus clientas vuelvan y llevar tu caja y tu equipo.',
  pro: 'Para negocios que cotizan, facturan y quieren que WhatsApp conteste solo.',
};

const nombres = (id: PlanId) => [
  ...PLANES[id].modulos.map((m) => QUE_ES[m]).filter((x): x is string => Boolean(x)),
  ...(EXTRA_DE_PLAN[id] ? [EXTRA_DE_PLAN[id] as string] : []),
];

// "Mi plan". Siempre accesible, también con la página pública en pausa: es
// justamente desde aquí que el negocio se reactiva.
export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ vuelta?: string }>;
}) {
  const { slug } = await params;
  const { vuelta } = await searchParams;
  const { tenantId, role } = await requireTenantStaff(slug);

  const { data: tenant } = await createAdminClient().from('tenants').select('*').eq('id', tenantId).maybeSingle();
  const access = tenantAccess(tenant);
  const isPaying = tenant?.status === 'active' && tenant?.mp_subscription_status === 'authorized' && access.kind === 'active';
  const plan = planDe(tenant?.plan);
  const fundador = tenant?.precio_fundador_mxn ?? null;
  // Quien ya paga ve su monto; quien no, lo que costaría hoy (con cupo fundador si queda).
  const usados = await fundadoresUsados();
  const precio = isPaying ? precioMensual(plan, fundador) : precioCheckout(plan, fundador, usados).monto;
  // Negocio a precio fundador: ya lo tiene congelado, o aún hay cupo para quien no paga.
  const founderNegocio = fundador != null || (!isPaying && usados < CUPO_FUNDADOR);
  const esDueno = role === 'owner';

  const [estado, tono] =
    access.kind === 'trial'
      ? [`Estás en tu prueba gratis: te ${access.daysLeft === 1 ? 'queda 1 día' : `quedan ${access.daysLeft} días`}. Activa tu plan cuando quieras; no pierdes los días que te quedan.`, 'info']
      : access.kind === 'grace'
        ? [
            access.reason === 'payment_failed'
              ? `No pudimos cobrar tu plan. Tienes ${access.daysLeft} ${access.daysLeft === 1 ? 'día' : 'días'} antes de que tu página deje de recibir citas.`
              : `Tu prueba terminó. Tienes ${access.daysLeft} ${access.daysLeft === 1 ? 'día' : 'días'} antes de que tu página deje de recibir citas.`,
            'warning',
          ]
        : access.kind === 'suspended'
          ? ['Tu página está en pausa y no recibe citas nuevas. Tus datos siguen intactos: activa tu plan y vuelve a funcionar al momento.', 'warning']
          : isPaying
            ? ['Tu plan está activo y al corriente. ¡Gracias!', 'success']
            : ['Tu cuenta está activa.', 'info'];

  const planes: PlanVista[] = PLAN_IDS.map((id, i) => {
    const anterior = i > 0 ? PLAN_IDS[i - 1] : null;
    const todo = nombres(id);
    const previo = anterior ? nombres(anterior) : [];
    const conFundador = id === 'negocio' && founderNegocio && PRECIO_FUNDADOR_MXN !== PLANES[id].precio;
    return {
      id,
      nombre: PLANES[id].nombre,
      precio: conFundador ? (fundador ?? PRECIO_FUNDADOR_MXN) : PLANES[id].precio,
      precioNormal: conFundador ? PLANES[id].precio : undefined,
      para: PARA[id],
      suma: todo.filter((x) => !previo.includes(x)),
      base: anterior ? PLANES[anterior].nombre : undefined,
      todo,
    };
  });

  // Las fechas de la prueba, en la zona del negocio: "termina el jueves 3 de
  // diciembre" se entiende; "te quedan 12 días" obliga a contar.
  const trialEndMs = tenant?.trial_ends_at ? Date.parse(tenant.trial_ends_at) : NaN;
  const enPrueba = access.kind === 'trial' && !Number.isNaN(trialEndMs);
  const finPrueba = enPrueba ? longDate(new Date(trialEndMs), tenant?.timezone) : '';
  const finGracia = enPrueba ? longDate(new Date(trialEndMs + TRIAL_GRACE_DAYS * 86_400_000), tenant?.timezone) : '';

  const incluye = plan ? nombres(plan) : ['Todo lo que ya tienes prendido en tu panel'];
  const boostPermitido = plan === null || ADDON_BOOST.planes.includes(plan);

  return (
    <div>
      <PageHeader
        title="Mi plan"
        description="Qué incluye tu plan, cuánto pagas y cómo cambiarlo."
        action={!isPaying && esDueno ? <ActivatePlanButton slug={slug} label="Activar mi plan" /> : undefined}
      />

      <p
        role={tono === 'warning' ? 'alert' : 'status'}
        className={`mt-6 rounded-2xl px-4 py-3 text-[15px] leading-relaxed text-ink ${
          tono === 'warning' ? 'bg-warning-soft' : tono === 'success' ? 'bg-success-soft' : 'bg-info-soft'
        }`}
      >
        {estado}
      </p>

      {enPrueba && <ComoSiguePrueba finPrueba={finPrueba} finGracia={finGracia} />}

      {vuelta && !isPaying && (
        <p className="mt-3 rounded-2xl bg-ink/[0.04] px-4 py-3 text-sm leading-relaxed text-ink">
          Si ya terminaste el pago en Mercado Pago, tu plan se activa en cuanto ellos nos confirman (normalmente en segundos).
          Recarga esta página en un momento.
        </p>
      )}

      {/* ── Lo que tiene hoy ── */}
      <section className="mt-8 rounded-3xl bg-surface p-6 ring-1 ring-border sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Tu plan</p>
            <p className="mt-1 text-[1.6rem] font-semibold leading-tight tracking-tight text-ink">
              {plan ? PLANES[plan].nombre : 'Plan bicho'}
            </p>
          </div>
          <p className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-ink">
            ${precio} <span className="text-base font-normal tracking-normal text-muted">al mes</span>
          </p>
        </div>
        <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {incluye.map((x) => (
            <li key={x} className="flex items-start gap-2 text-[15px] leading-snug text-ink">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
              {x}
            </li>
          ))}
        </ul>
        <ul className="mt-6 flex flex-col gap-1.5 border-t border-border pt-5 text-sm leading-relaxed text-muted">
          <li>Pagas con tarjeta a través de Mercado Pago y cancelas cuando quieras.</li>
          <li>Si un cobro falla, tienes {TRIAL_GRACE_DAYS} días para resolverlo antes de que tu página se pause.</li>
        </ul>
      </section>

      {/* ── Comparar ── */}
      <section className="mt-12">
        <h2 className="mb-1 flex min-h-[2.75rem] items-center gap-1 text-[17px] font-semibold tracking-tight text-ink">
          Compara los planes
          <HelpTip title="¿Qué pasa si cambio de plan?">
            Al subir, lo nuevo se prende al momento. Al bajar, lo que el plan ya no incluye se apaga, pero tus datos se
            quedan guardados por si vuelves. Antes de cambiar te decimos qué se prende, qué se apaga y cuánto vas a pagar.
          </HelpTip>
        </h2>
        {!esDueno && <p className="mb-4 text-sm text-muted">Solo el dueño del negocio puede cambiar el plan.</p>}
        <PlanPicker slug={slug} planes={planes} current={plan} pagando={isPaying} puedeCambiar={esDueno} />
      </section>

      {/* ── Extras ── */}
      <section className="mt-12">
        <SectionHeading title="Extras que se pagan aparte" />
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${COLOR_MODULO.boost}1a`, color: COLOR_MODULO.boost }} aria-hidden="true">
                <Clock3 className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold tracking-tight text-ink">Llena tus huecos</h3>
                <p className="text-[15px] font-semibold tabular-nums text-ink">
                  ${ADDON_BOOST.precio} <span className="font-normal text-muted">al mes · en Negocio y Pro</span>
                </p>
              </div>
            </div>
            <p className="text-[15px] leading-relaxed text-muted">
              Cuando alguien cancela o te quedan horas vacías, avisamos por WhatsApp a tus clientas para que aparten. Incluye{' '}
              {ADDON_BOOST.topeMensajes} mensajes al mes.
            </p>
            {boostPermitido && (
              <Link
                href="/dashboard/boost"
                className="mt-auto inline-flex min-h-[2.75rem] items-center justify-center self-start rounded-2xl border border-border px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-sm:w-full"
              >
                Ver cómo funciona
              </Link>
            )}
          </article>
          <article className="flex flex-col gap-3 rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#D9FDD3] text-[#1F5E2E]" aria-hidden="true">
                <FileText className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold tracking-tight text-ink">Cotiza por WhatsApp</h3>
                {/* Precio por decidir en planes.ts: no se publica. */}
                <p className="text-[15px] font-semibold text-ink">
                  Precio por confirmar <span className="font-normal text-muted">· sobre el plan Pro</span>
                </p>
              </div>
            </div>
            <p className="text-[15px] leading-relaxed text-muted">
              Tus clientes piden precio por WhatsApp y reciben su cotización en PDF; la aceptan y piden su factura ahí mismo.
              Escríbenos y te decimos cuánto cuesta.
            </p>
          </article>
        </div>
      </section>

      <DescargarDatos esDueno={esDueno} />
    </div>
  );
}
