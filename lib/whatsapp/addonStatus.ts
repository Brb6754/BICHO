import { createAdminClient } from '@/lib/supabase/admin';

// What the panels need to draw the add-on switch, read defensively so a
// database without db/021 applied renders "no disponible todavía"
// instead of throwing on a page that is mostly about other things.
export type WhatsappAddon = {
  // false when the migration hasn't been run in this environment.
  available: boolean;
  enabled: boolean;
  sentThisMonth: number;
};

export async function getWhatsappAddon(tenantId: string): Promise<WhatsappAddon> {
  const admin = createAdminClient();

  const { data: tenant, error } = await admin
    .from('tenants')
    .select('whatsapp_enabled')
    .eq('id', tenantId)
    .maybeSingle();

  // 42703 = column missing, PGRST204/PGRST205 = PostgREST hasn't seen it.
  if (error) {
    return { available: false, enabled: false, sentThisMonth: 0 };
  }

  // Calendar month to date. Meta bills per message, so this is the number
  // that turns into money at the end of the month.
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count } = await admin
    .from('whatsapp_messages')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .gte('created_at', monthStart.toISOString());

  return {
    available: true,
    enabled: Boolean(tenant?.whatsapp_enabled),
    sentThisMonth: count ?? 0,
  };
}
