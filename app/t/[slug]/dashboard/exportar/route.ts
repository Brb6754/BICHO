import { requireTenantStaff, StaffAccessError } from '@/lib/auth/tenantStaff';
import { createAdminClient } from '@/lib/supabase/admin';
import { citasCsv, clientesCsv, type ExportBooking } from '@/lib/exportar/csv';
import { dayKey } from '@/lib/dates/tenantTime';

// GET /dashboard/exportar?tipo=clientes|citas → CSV para Excel.
// Sin extensión en la URL a propósito: proxy.ts no reescribe rutas con
// extensión, así que "/exportar.csv" en el subdominio daría 404. El nombre
// del archivo lo pone Content-Disposition.
//
// Un Route Handler no pasa por el layout del panel: la sesión y la
// membresía se revisan aquí. Solo la dueña: es la lista completa de
// teléfonos de su clientela, y no es algo que un empleado deba poder
// llevarse.
export const dynamic = 'force-dynamic';

const PAGE = 1000; // tope de filas por consulta de PostgREST

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tipo = new URL(request.url).searchParams.get('tipo');
  if (tipo !== 'clientes' && tipo !== 'citas') {
    return new Response('Elige qué descargar: clientes o citas.', { status: 400 });
  }

  let staff: Awaited<ReturnType<typeof requireTenantStaff>>;
  try {
    staff = await requireTenantStaff(slug);
  } catch (err) {
    if (err instanceof StaffAccessError) return new Response(err.message, { status: 403 });
    throw err;
  }
  if (staff.role !== 'owner') {
    return new Response('Solo el dueño del negocio puede descargar los datos.', { status: 403 });
  }

  const db = createAdminClient();
  const bookings: ExportBooking[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('bookings')
      .select('id, starts_at, status, customers(name, phone, email), service_types(name), resources(name)')
      .eq('tenant_id', staff.tenantId)
      .order('starts_at')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('exportar: bookings', slug, error);
      return new Response('No pudimos armar tu archivo. Intenta de nuevo en un momento.', { status: 500 });
    }
    bookings.push(...((data ?? []) as unknown as ExportBooking[]));
    if (!data || data.length < PAGE) break;
  }

  const now = new Date();
  const csv = tipo === 'clientes' ? clientesCsv(bookings, staff.timezone, now) : citasCsv(bookings, staff.timezone);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tipo}-${slug}-${dayKey(now, staff.timezone)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
