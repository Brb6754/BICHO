import { createAdminClient } from '@/lib/supabase/admin';
import { dayKey, formatTime, instantFromLocal } from '@/lib/dates/tenantTime';
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

/** El corte de HOY guardado en la base (db/060). `null` = la tabla aún no existe: la pantalla usa el teléfono. */
export type CorteGuardado = {
  fondoCents: number | null;
  contadoCents: number | null;
} | null;

export type DatosCaja = { hoy: string; movimientos: Movimiento[]; corte: CorteGuardado } | { faltaMigracion: true };

const faltaTabla = (e: { code?: string } | null) => e?.code === '42P01' || e?.code === 'PGRST205';

export async function cargarCaja(tenantId: string, timezone: string | null, now = new Date()): Promise<DatosCaja> {
  const hoy = dayKey(now, timezone);
  const desde = rangoDe('mes', hoy).prevDesde;
  const db = createAdminClient();

  const [filasRes, citasRes, corteRes] = await Promise.all([
    db
      .from('caja_movimientos')
      .select('id, tipo, concepto, monto_cents, metodo, categoria, dia, booking_id, anulada, created_at')
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
    db.from('caja_cortes').select('fondo_cents, contado_cents').eq('tenant_id', tenantId).eq('dia', hoy).maybeSingle(),
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
    hora: f.created_at ? formatTime(f.created_at, timezone) : null,
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
      hora: formatTime(b.starts_at, timezone),
    }))
    .filter((c) => c.dia <= hoy);

  // Sin db/060 (o si la lectura falla) el corte sigue en el teléfono.
  if (corteRes.error && !faltaTabla(corteRes.error)) console.error('cargarCaja corte:', corteRes.error.message);
  const corte: CorteGuardado = corteRes.error
    ? null
    : {
        fondoCents: corteRes.data?.fondo_cents ?? null,
        contadoCents: corteRes.data?.contado_cents ?? null,
      };

  return { hoy, movimientos: combinarMovimientos(citas, filas), corte };
}
