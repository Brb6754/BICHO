import { createAdminClient } from '@/lib/supabase/admin';
import { inicioDeMes } from '@/lib/posts/contexto';
import { updatePreapprovalAmount } from '@/lib/payments/mercadopago';
import { CUPO_FUNDADOR, banderasDelPlan, precioMensual, type PlanId } from './planes';

// La parte con base de datos de los planes (lib/billing/planes.ts es la
// pura). Server-only: usa service_role. Todo tolera que db/053 no esté
// corrida: sin la columna/tabla se comporta como antes de los planes.

type Admin = ReturnType<typeof createAdminClient>;

const faltaColumna = (e: { code?: string } | null) => e?.code === '42703' || e?.code === 'PGRST204';
const faltaTabla = (e: { code?: string } | null) => e?.code === '42P01' || e?.code === 'PGRST205';

/** Negocios con precio fundador congelado. Si no se puede contar, cupo lleno (no se regala). */
export async function fundadoresUsados(admin: Admin = createAdminClient()): Promise<number> {
  const { count, error } = await admin
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .not('precio_fundador_mxn', 'is', null);
  return error ? CUPO_FUNDADOR : (count ?? 0);
}

/**
 * Cambia el plan: escribe `plan`, deja prendido lo incluido y apagado lo
 * demás, y si el negocio ya paga ajusta el monto de su suscripción en MP.
 */
export async function cambiarPlan(tenantId: string, plan: PlanId): Promise<void> {
  const admin = createAdminClient();
  const { data: tenant, error: readError } = await admin.from('tenants').select('*').eq('id', tenantId).maybeSingle();
  if (readError || !tenant) throw new Error('No se encontró el negocio.');

  let { error } = await admin.from('tenants').update({ plan, ...banderasDelPlan(plan) }).eq('id', tenantId);
  // Un ambiente sin alguna migración de módulos: al menos guarda el plan.
  if (faltaColumna(error)) ({ error } = await admin.from('tenants').update({ plan }).eq('id', tenantId));
  if (error) throw new Error(`No se pudo cambiar el plan (${error.code}).`);

  if (tenant.mp_preapproval_id && tenant.mp_subscription_status === 'authorized') {
    // shortcut: sin prorrateo, el monto nuevo aplica desde el siguiente cobro.
    await updatePreapprovalAmount(tenant.mp_preapproval_id, precioMensual(plan, tenant.precio_fundador_mxn ?? null));
  }
}

/** Tras un cobro autorizado: congela el precio fundador. Sin db/053, no hace nada. */
export async function guardarPrecioFundador(admin: Admin, tenantId: string, monto: number): Promise<void> {
  const { error } = await admin
    .from('tenants')
    .update({ precio_fundador_mxn: monto })
    .eq('id', tenantId)
    .is('precio_fundador_mxn', null);
  if (error && !faltaColumna(error)) throw new Error(`founder price update failed code=${error.code}`);
}

/** Preguntas al Copiloto este mes. Sin la tabla, 0 (sin tope, como antes). */
export async function preguntasCopilotoMes(tenantId: string, timezone: string | null): Promise<number> {
  const { count, error } = await createAdminClient()
    .from('copiloto_preguntas')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', inicioDeMes(new Date(), timezone));
  if (error && !faltaTabla(error)) console.error(`[copiloto] conteo falló code=${error.code}`);
  return count ?? 0;
}

export async function registrarPreguntaCopiloto(tenantId: string, userId: string): Promise<void> {
  const { error } = await createAdminClient().from('copiloto_preguntas').insert({ tenant_id: tenantId, user_id: userId });
  if (error && !faltaTabla(error)) console.error(`[copiloto] registro falló code=${error.code}`);
}

/** Facturas timbradas este mes (las canceladas también gastaron su timbre). */
export async function timbresMes(tenantId: string, timezone: string | null): Promise<number> {
  const { count, error } = await createAdminClient()
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['stamped', 'cancelled'])
    .gte('stamped_at', inicioDeMes(new Date(), timezone));
  if (faltaTabla(error)) return 0;
  if (error) throw new Error(`No se pudo contar las facturas del mes: ${error.message}`);
  return count ?? 0;
}
