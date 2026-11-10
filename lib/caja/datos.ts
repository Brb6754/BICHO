import { createAdminClient } from '@/lib/supabase/admin';
import { dayKey, instantFromLocal } from '@/lib/dates/tenantTime';
import {
  combinarMovimientos,
  rangoDe,
  type CitaCompletada,
  type FilaCaja,
  type Movimiento,
} from '@/lib/caja/resumen';

// Lo que la pantalla de Caja necesita de la base: desde el primer día
// del mes pasado (el inicio del periodo anterior más viejo que se
// compara) hasta hoy.
//
// Lee con service_role filtrando por tenant_id, igual que reuniones y
// cotizaciones: las citas viven en `bookings`, sin policies para
// miembros. Quien llama ya pasó por `requireTenantStaff`.

export type DatosCaja = { hoy: string; movimientos: Movimiento[] } | { faltaMigracion: true };

export async function cargarCaja(tenantId: string, timezone: string | null, now = new Date()): Promise<DatosCaja> {
  const hoy = dayKey(now, timezone);
  const desde = rangoDe('mes', hoy).prevDesde;
  const db = createAdminClient();

  const [filasRes, citasRes] = await Promise.all([
    db
      .from('caja_movimientos')
      .select('id, tipo, concepto, monto_cents, metodo, categoria, dia, booking_id, anulada')
      .eq('tenant_id', tenantId)
      .gte('dia', desde)
      .lte('dia', hoy)
      .order('created_at', { ascending: false }),
    db
      .from('bookings')
      .select('*, service_types(name, price_cents)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('starts_at', instantFromLocal(desde, '00:00', timezone))
      .order('starts_at', { ascending: false }),
  ]);

  // Sin db/045 la tabla no existe: la pantalla lo dice en vez de caerse.
  if (filasRes.error) return { faltaMigracion: true };

  const filas: FilaCaja[] = (filasRes.data ?? []).map((f) => ({
    id: f.id,
    tipo: f.tipo,
    concepto: f.concepto ?? '',
    montoCents: f.monto_cents,
    metodo: f.metodo,
    categoria: f.categoria,
    dia: f.dia,
    bookingId: f.booking_id,
    anulada: f.anulada,
  }));

  type Fila = {
    id: string;
    starts_at: string;
    kind?: string | null;
    service_types: { name: string; price_cents: number } | null;
  };
  const citas: CitaCompletada[] = ((citasRes.data ?? []) as unknown as Fila[])
    // Una reunión de ventas (db/039) no es una venta en caja.
    .filter((b) => b.kind !== 'reunion')
    .map((b) => ({
      bookingId: b.id,
      dia: dayKey(b.starts_at, timezone),
      servicio: b.service_types?.name ?? 'Cita',
      precioCents: b.service_types?.price_cents ?? 0,
    }))
    .filter((c) => c.dia <= hoy);

  return { hoy, movimientos: combinarMovimientos(citas, filas) };
}
