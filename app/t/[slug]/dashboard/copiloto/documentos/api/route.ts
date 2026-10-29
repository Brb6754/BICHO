import { requireTenantStaff, StaffAccessError } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { createAdminClient } from '@/lib/supabase/admin';
import { MAX_BYTES, extraerTexto, guardarDocumento, tipoDeArchivo } from '@/lib/copiloto/documentos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function acceso(slug: string) {
  const staff = await requireTenantStaff(slug);
  if (!(await productosDe(slug)).copiloto) throw new StaffAccessError('El copiloto no está activo.');
  return staff;
}

// Subir: multipart con un campo `archivo`. Escribe con service_role, por
// eso la membresía se verifica ANTES (requireTenantStaff), no se deja al RLS.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let staff;
  try {
    staff = await acceso(slug);
  } catch (e) {
    return Response.json({ error: e instanceof StaffAccessError ? e.message : 'Sin acceso.' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const archivo = form?.get('archivo');
  if (!(archivo instanceof File)) return Response.json({ error: 'Falta el archivo.' }, { status: 400 });
  if (archivo.size > MAX_BYTES) return Response.json({ error: 'El archivo pesa más de 4 MB.' }, { status: 413 });
  const tipo = tipoDeArchivo(archivo.name);
  if (!tipo) return Response.json({ error: 'Sube un PDF, Word (.docx) o texto (.txt, .md, .csv).' }, { status: 400 });

  try {
    const texto = await extraerTexto(tipo, Buffer.from(await archivo.arrayBuffer()));
    const r = await guardarDocumento({ tenantId: staff.tenantId, userId: staff.userId, nombre: archivo.name, tipo, texto });
    return Response.json({ ok: true, ...r });
  } catch (e) {
    console.error('copiloto documentos', e);
    return Response.json({ error: e instanceof Error ? e.message : 'No se pudo procesar el archivo.' }, { status: 422 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let staff;
  try {
    staff = await acceso(slug);
  } catch (e) {
    return Response.json({ error: e instanceof StaffAccessError ? e.message : 'Sin acceso.' }, { status: 401 });
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Falta el documento.' }, { status: 400 });
  // tenant_id en el filtro: un id de otro negocio no borra nada.
  const { error } = await createAdminClient()
    .from('copiloto_documentos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', staff.tenantId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
