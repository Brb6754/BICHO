import { requireTenantStaff, StaffAccessError } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { createAdminClient } from '@/lib/supabase/admin';
import { correrAgente, type Turno } from '@/lib/copiloto/agente';
import { TOPE_COPILOTO_MES, mensajeTope } from '@/lib/billing/planes';
import { preguntasCopilotoMes, registrarPreguntaCopiloto } from '@/lib/billing/planServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST con el historial del chat; responde NDJSON: una línea por evento
// (herramienta usada, trozo de texto, fin). El userId que llega a la
// frontera sale de la SESIÓN, nunca del cuerpo de la petición.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let staff: Awaited<ReturnType<typeof requireTenantStaff>>;
  try {
    staff = await requireTenantStaff(slug);
  } catch (e) {
    const msg = e instanceof StaffAccessError ? e.message : 'Sin acceso.';
    return Response.json({ error: msg }, { status: 401 });
  }
  if (!(await productosDe(slug)).copiloto) return Response.json({ error: 'El copiloto no está activo.' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { historial?: Turno[] } | null;
  const historial = (body?.historial ?? [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' && t.content.trim())
    .slice(-12)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }));
  if (historial.at(-1)?.role !== 'user') return Response.json({ error: 'Falta la pregunta.' }, { status: 400 });

  // Tope mensual por negocio (db/053). Sin la tabla, cuenta 0: sin tope, como antes.
  const tope = mensajeTope(await preguntasCopilotoMes(staff.tenantId, staff.timezone), TOPE_COPILOTO_MES, 'copiloto');
  if (tope) return Response.json({ error: tope }, { status: 429 });
  // shortcut: contar y registrar no es atómico; ráfagas simultáneas pueden pasar el tope por unas pocas.
  await registrarPreguntaCopiloto(staff.tenantId, staff.userId);

  const { data: tenant } = await createAdminClient().from('tenants').select('name').eq('id', staff.tenantId).single();

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      try {
        for await (const ev of correrAgente({
          userId: staff.userId,
          negocio: tenant?.name ?? slug,
          zona: staff.timezone ?? 'America/Mexico_City',
          historial,
        })) send(ev);
      } catch (e) {
        console.error('copiloto', e);
        send({ type: 'error', message: 'El copiloto tuvo un problema. Intenta de nuevo.' });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } });
}
