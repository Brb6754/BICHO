import 'server-only';
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEMO_SLUGS, isDemoSlug } from '@/lib/domains';
import type { NegocioDirectorio } from './directorio';

// Lectura pública del directorio. service_role porque `tenants` no tiene
// lectura anónima de estas columnas; por eso mismo las columnas van
// explícitas y solo las que el dueño aceptó publicar (la dirección
// completa se queda fuera a propósito).
// cache(): metadata y página la piden en el mismo request; una sola consulta.
export const negociosDelDirectorio = cache(async (): Promise<NegocioDirectorio[]> => {
  const { data, error } = await createAdminClient()
    .from('tenants')
    .select('slug, name, vertical, logo_url, ciudad, colonia, lat, lng')
    .eq('en_directorio', true)
    .in('status', ['trial', 'active'])
    .not('ciudad', 'is', null)
    .not('slug', 'in', `(${[...DEMO_SLUGS].join(',')})`)
    .order('name')
    .limit(1000);
  // Sin db/055 la columna no existe (42703): directorio vacío, no error.
  if (error) {
    if (error.code !== '42703') console.error('negociosDelDirectorio', error);
    return [];
  }
  return (data ?? [])
    .filter((t) => !isDemoSlug(t.slug as string) && String(t.ciudad ?? '').trim())
    .map((t) => ({
      slug: t.slug as string,
      name: t.name as string,
      vertical: (t.vertical as string | null) ?? 'general',
      logoUrl: (t.logo_url as string | null) ?? null,
      ciudad: String(t.ciudad).trim(),
      colonia: (t.colonia as string | null) ?? null,
      lat: typeof t.lat === 'number' ? t.lat : null,
      lng: typeof t.lng === 'number' ? t.lng : null,
    }));
});

type Geo = { lat: number; lng: number; colonia: string | null };

// Nominatim (OSM): su política pide User-Agent propio y máximo 1 req/s.
// Aquí sale 1 request por guardado, desde el servidor, con timeout corto.
export async function geocodificar(direccion: string, ciudad: string): Promise<Geo | null> {
  const q = new URLSearchParams({ q: `${direccion}, ${ciudad}, México`, format: 'jsonv2', limit: '1', countrycodes: 'mx', addressdetails: '1' });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, {
      headers: { 'User-Agent': 'bichomx.com-directorio/1.0 (+https://bichomx.com/negocios)', 'Accept-Language': 'es' },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { lat: string; lon: string; address?: Record<string, string> }[];
    if (!hit) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const a = hit.address ?? {};
    return { lat, lng, colonia: a.suburb ?? a.neighbourhood ?? a.quarter ?? null };
  } catch {
    return null;
  }
}

export type DirectorioInput = { enDirectorio: boolean; ciudad: string; direccion: string };
export type DirectorioResult = { ok: true; aviso: string | null } | { ok: false; error: string };

/**
 * Guarda el opt-in. Quien llama ya comprobó permisos (dueño o admin) y
 * elige el cliente: el de cookies para el dueño (RLS vuelve a exigir
 * owner), el de service_role para el admin.
 */
export async function guardarDirectorio(
  client: SupabaseClient,
  tenantId: string,
  slug: string,
  input: DirectorioInput
): Promise<DirectorioResult> {
  const ciudad = String(input.ciudad ?? '').trim().slice(0, 80);
  const direccion = String(input.direccion ?? '').trim().slice(0, 200);
  const enDirectorio = input.enDirectorio === true;
  if (enDirectorio && isDemoSlug(slug)) return { ok: false, error: 'Los negocios de demostración no van al directorio.' };
  if (enDirectorio && !ciudad) return { ok: false, error: 'Escribe la ciudad para aparecer en el directorio.' };

  const update: Record<string, unknown> = { en_directorio: enDirectorio, ciudad: ciudad || null, direccion: direccion || null };
  let aviso: string | null = null;
  if (direccion && ciudad) {
    const geo = await geocodificar(direccion, ciudad);
    if (geo) Object.assign(update, { lat: geo.lat, lng: geo.lng, colonia: geo.colonia });
    else {
      Object.assign(update, { lat: null, lng: null, colonia: null });
      aviso = 'Guardado, pero no encontramos esa dirección en el mapa: sales en la lista sin pin. Revisa calle, número y colonia.';
    }
  } else {
    Object.assign(update, { lat: null, lng: null, colonia: null });
    if (enDirectorio) aviso = 'Guardado. Sin dirección sales en la lista, pero no en el mapa.';
  }

  const { data, error } = await client.from('tenants').update(update).eq('id', tenantId).select('id').maybeSingle();
  if (error || !data) {
    console.error('guardarDirectorio', slug, error);
    return {
      ok: false,
      error: error?.code === '42703' ? 'Todavía no se puede guardar: falta correr db/055_directorio.sql.' : 'No se pudo guardar.',
    };
  }
  return { ok: true, aviso };
}

/** Lo que el formulario necesita para arrancar. Consulta aparte: sin db/055 regresa null. */
export async function estadoDirectorio(client: SupabaseClient, tenantId: string) {
  const { data, error } = await client
    .from('tenants')
    .select('en_directorio, ciudad, direccion, lat')
    .eq('id', tenantId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    enDirectorio: data.en_directorio === true,
    ciudad: (data.ciudad as string | null) ?? '',
    direccion: (data.direccion as string | null) ?? '',
    conPin: data.lat != null,
  };
}

/** Dirección del bloque `location` de la página del negocio, para prellenar. */
export function direccionDeBloques(pageBlocks: unknown): string {
  if (!Array.isArray(pageBlocks)) return '';
  const b = pageBlocks.find((x) => x && typeof x === 'object' && (x as { type?: unknown }).type === 'location') as
    | { props?: { address?: unknown } }
    | undefined;
  return typeof b?.props?.address === 'string' ? b.props.address.trim().slice(0, 200) : '';
}
