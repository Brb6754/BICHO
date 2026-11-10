import { createAdminClient } from '@/lib/supabase/admin';
import { tenantShareUrl } from '@/lib/urls';
import { addDaysKey, dayKey } from '@/lib/dates/tenantTime';
import {
  FECHAS,
  FORMATOS,
  TIPOS,
  TOPE,
  inicioDeMes,
  lineasDeHorarios,
  type BaseImagen,
  type Contexto,
  type Formato,
  type Opcion,
  type Tipo,
} from './contexto';

// Lo que el módulo lee de Supabase. Service_role filtrando SIEMPRE por
// tenant_id: quien llama ya pasó por requireTenantStaff.

export type Pedido = { tipo: Tipo; formato: Formato; servicioId?: string; promoId?: string; fechaId?: string; tema?: string };

export type Generacion = {
  id: string;
  tipo: Tipo;
  formato: Formato;
  resumen: string;
  opciones: Opcion[];
  base: BaseImagen;
  cuando: string;
};

export type RespGenerar = { ok: true; generacion: Generacion; restantes: number } | { ok: false; error: string };

export type Catalogo = {
  servicios: { id: string; nombre: string; precioCents: number; minutos: number }[];
  promos: { id: string; titulo: string; detalle: string | null; codigo: string | null; vigencia: string }[];
  lealtad: { sellos: number; premio: string } | null;
};

export type DatosPosts = Catalogo & { falta: boolean; usadas: number; historial: Generacion[] };

const sinTabla = (e: { code?: string } | null) => e?.code === '42P01' || e?.code === 'PGRST205';

export async function cargarCatalogo(tenantId: string, timezone: string | null): Promise<Catalogo> {
  const db = createAdminClient();
  const hoy = dayKey(new Date(), timezone);
  // Promociones y lealtad son de db/047: sin esa migración, vacías.
  const [servicios, promos, programa] = await Promise.all([
    db.from('service_types').select('id, name, price_cents, duration_minutes').eq('tenant_id', tenantId).eq('active', true).order('name').limit(40),
    db
      .from('promotions')
      .select('id, title, details, code, starts_on, ends_on')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .lte('starts_on', hoy)
      .gte('ends_on', hoy)
      .order('ends_on')
      .limit(20),
    db.from('loyalty_programs').select('stamps_required, reward, active').eq('tenant_id', tenantId).maybeSingle(),
  ]);
  if (servicios.error) throw new Error(`No se pudo leer el catálogo: ${servicios.error.message}`);

  return {
    servicios: (servicios.data ?? []).map((s) => ({ id: s.id, nombre: s.name, precioCents: s.price_cents ?? 0, minutos: s.duration_minutes })),
    promos: promos.error
      ? []
      : (promos.data ?? []).map((p) => ({
          id: p.id,
          titulo: p.title,
          detalle: p.details,
          codigo: p.code,
          vigencia: p.starts_on === p.ends_on ? `el ${p.ends_on}` : `del ${p.starts_on} al ${p.ends_on}`,
        })),
    lealtad: !programa.error && programa.data?.active ? { sellos: programa.data.stamps_required, premio: programa.data.reward } : null,
  };
}

export async function cargarPosts(tenantId: string, timezone: string | null): Promise<DatosPosts> {
  const db = createAdminClient();
  const [catalogo, historial, mes] = await Promise.all([
    cargarCatalogo(tenantId, timezone),
    db
      .from('post_generations')
      .select('id, tipo, formato, prompt_resumen, opciones, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20),
    contarMes(tenantId, timezone),
  ]);
  if (sinTabla(historial.error)) return { ...catalogo, falta: true, usadas: 0, historial: [] };
  if (historial.error) throw new Error(`No se pudo leer el historial: ${historial.error.message}`);

  return {
    ...catalogo,
    falta: false,
    usadas: mes,
    historial: (historial.data ?? []).map((g) => ({
      id: g.id,
      tipo: g.tipo,
      formato: g.formato,
      resumen: g.prompt_resumen,
      opciones: g.opciones?.opciones ?? [],
      base: g.opciones?.base,
      cuando: g.created_at,
    })),
  };
}

/** Generaciones de este mes (zona del negocio). Lanza si la tabla falta. */
export async function contarMes(tenantId: string, timezone: string | null): Promise<number> {
  const { count, error } = await createAdminClient()
    .from('post_generations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', inicioDeMes(new Date(), timezone));
  if (sinTabla(error)) return 0;
  if (error) throw new Error(`No se pudo contar las generaciones: ${error.message}`);
  return count ?? 0;
}

/** Huecos libres de los próximos 7 días, con el mismo RPC de la página pública. */
async function horariosLibres(tenantId: string, servicioId: string | null, timezone: string | null): Promise<string[]> {
  if (!servicioId) return [];
  const db = createAdminClient();
  const { data: recursos } = await db.from('resources').select('id').eq('tenant_id', tenantId).eq('active', true).limit(10);
  const desde = dayKey(new Date(), timezone);
  const res = await Promise.all(
    (recursos ?? []).map((r) =>
      db.rpc('get_available_slots', { p_resource_id: r.id, p_service_type_id: servicioId, p_from: desde, p_to: addDaysKey(desde, 6) })
    )
  );
  const inicios = res.flatMap((r) => ((r.data ?? []) as { slot_start: string }[]).map((s) => s.slot_start));
  return lineasDeHorarios(inicios, new Date(), timezone);
}

/**
 * Valida el pedido del cliente y arma el contexto con datos de la base.
 * Del cliente solo se aceptan ids y el tema libre: precios, promos y
 * horarios salen de aquí.
 */
export async function armarContexto(
  tenantId: string,
  slug: string,
  negocio: string,
  timezone: string | null,
  pedido: Pedido
): Promise<Contexto> {
  if (!TIPOS.includes(pedido.tipo) || !FORMATOS.includes(pedido.formato)) throw new Error('Pedido inválido.');
  const cat = await cargarCatalogo(tenantId, timezone);
  const servicio = cat.servicios.find((s) => s.id === pedido.servicioId) ?? null;
  const base: Contexto = {
    negocio,
    link: tenantShareUrl(slug),
    tipo: pedido.tipo,
    formato: pedido.formato,
    servicios: cat.servicios.slice(0, 15).map((s) => ({ nombre: s.nombre, precioCents: s.precioCents })),
    lealtad: cat.lealtad,
  };

  switch (pedido.tipo) {
    case 'servicio':
      if (!servicio) throw new Error('Elige un servicio.');
      return { ...base, servicio };
    case 'promo': {
      const promo = cat.promos.find((p) => p.id === pedido.promoId) ?? null;
      if (!promo && !cat.lealtad) throw new Error('Elige una promoción.');
      return { ...base, promo };
    }
    case 'horarios': {
      // Sin servicio elegido, el más corto: es el que más huecos enseña.
      const s = servicio ?? [...cat.servicios].sort((a, b) => a.minutos - b.minutos)[0] ?? null;
      return { ...base, servicio: s, horarios: await horariosLibres(tenantId, s?.id ?? null, timezone) };
    }
    case 'fecha': {
      const fecha = FECHAS.find((f) => f.id === pedido.fechaId);
      if (!fecha) throw new Error('Elige una fecha.');
      return { ...base, fecha: fecha.nombre };
    }
    case 'libre': {
      const tema = (pedido.tema ?? '').trim().slice(0, TOPE.tema);
      if (tema.length < 3) throw new Error('Escribe de qué quieres el post.');
      return { ...base, tema };
    }
  }
}
