'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { armarContexto, contarMes, type Pedido, type RespGenerar } from '@/lib/posts/datos';
import { generarOpciones } from '@/lib/posts/ia';
import { LIMITE_MENSUAL, baseImagen, resumenDe, restantes } from '@/lib/posts/contexto';

// Requiere staff + módulo prendido; el contexto (precios, horarios) se
// arma aquí con la base, nunca con lo que mande el navegador.
export async function generarPost(slug: string, pedido: Pedido): Promise<RespGenerar> {
  try {
    const { tenantId, timezone, userId } = await requireTenantStaff(slug);
    if (!(await productosDe(slug)).posts) return { ok: false, error: 'Este negocio no tiene el módulo de Posts con IA.' };

    // shortcut: contar y luego insertar deja pasar una de más si llegan dos
    // clics a la vez; aceptable para 30/mes. Pasar a un RPC con lock si importa.
    const usadas = await contarMes(tenantId, timezone);
    if (usadas >= LIMITE_MENSUAL) {
      return { ok: false, error: `Ya usaste tus ${LIMITE_MENSUAL} posts de este mes. Se renuevan el día 1.` };
    }

    const db = createAdminClient();
    const { data: tenant, error: tErr } = await db.from('tenants').select('name').eq('id', tenantId).single();
    if (tErr) throw new Error(`No se pudo leer el negocio: ${tErr.message}`);

    const ctx = await armarContexto(tenantId, slug, tenant.name, timezone, pedido);
    const opciones = await generarOpciones(ctx);
    const base = baseImagen(ctx);

    const { data, error } = await db
      .from('post_generations')
      .insert({
        tenant_id: tenantId,
        tipo: ctx.tipo,
        formato: ctx.formato,
        prompt_resumen: resumenDe(ctx),
        opciones: { opciones, base },
        created_by: userId,
      })
      .select('id, created_at')
      .single();
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return { ok: false, error: 'Falta correr db/048_posts_ia.sql en Supabase.' };
      throw new Error(`No se pudo guardar: ${error.message}`);
    }

    revalidatePath(`/t/${slug}/dashboard/posts`);
    return {
      ok: true,
      restantes: restantes(usadas + 1),
      generacion: { id: data.id, tipo: ctx.tipo, formato: ctx.formato, resumen: resumenDe(ctx), opciones, base, cuando: data.created_at },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'No se pudo generar.' };
  }
}
