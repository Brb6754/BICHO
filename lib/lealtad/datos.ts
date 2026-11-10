import { createAdminClient } from '@/lib/supabase/admin';
import { estadoTarjeta, type EstadoTarjeta } from './tarjeta';

// Lo que necesita la pantalla de Lealtad, en una sola carga.
//
// Lee con service_role: quien llama ya pasó por requireTenantStaff, y
// todo se filtra por tenant_id. Si db/047 no está corrida, devuelve
// `falta: true` en vez de tronar el panel.

export type Regla = { requeridos: number; premio: string; activa: boolean };

export type TarjetaFila = {
  id: string;
  token: string;
  nombre: string;
  telefono: string | null;
  estado: EstadoTarjeta;
  ultimoSello: string | null;
};

export type Canje = { id: string; nombre: string; premio: string; cuando: string };

export type Promo = {
  id: string;
  title: string;
  details: string | null;
  code: string | null;
  starts_on: string;
  ends_on: string;
  active: boolean;
};

export type DatosLealtad = {
  falta: boolean;
  regla: Regla;
  tarjetas: TarjetaFila[];
  canjes: Canje[];
  promos: Promo[];
  sinTarjeta: { id: string; nombre: string }[];
};

export const REGLA_DEFAULT: Regla = { requeridos: 6, premio: 'Tu siguiente visita gratis', activa: true };

const VACIO: DatosLealtad = { falta: true, regla: REGLA_DEFAULT, tarjetas: [], canjes: [], promos: [], sinTarjeta: [] };

type Rel<T> = T | T[] | null;
const uno = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

export async function cargarLealtad(tenantId: string): Promise<DatosLealtad> {
  const db = createAdminClient();

  // shortcut: trae todos los sellos/canjes del negocio y cuenta en JS; para
  // un negocio chico son cientos de filas. Pasar a una vista agregada si
  // algún negocio llega a decenas de miles.
  const [programa, tarjetas, sellos, canjes, promos, contactos] = await Promise.all([
    db.from('loyalty_programs').select('stamps_required, reward, active').eq('tenant_id', tenantId).maybeSingle(),
    db
      .from('loyalty_cards')
      .select('id, token, contact_id, contacts(name, phone)')
      .eq('tenant_id', tenantId)
      .limit(1000),
    db.from('loyalty_stamps').select('card_id, created_at').eq('tenant_id', tenantId).limit(20000),
    db
      .from('loyalty_redemptions')
      .select('id, card_id, stamps_used, reward, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5000),
    db
      .from('promotions')
      .select('id, title, details, code, starts_on, ends_on, active')
      .eq('tenant_id', tenantId)
      .order('ends_on', { ascending: false })
      .limit(50),
    db.from('contacts').select('id, name').eq('tenant_id', tenantId).order('name').limit(1000),
  ]);

  if (programa.error || tarjetas.error || sellos.error || canjes.error || promos.error) return VACIO;

  const regla: Regla = programa.data
    ? { requeridos: programa.data.stamps_required, premio: programa.data.reward, activa: programa.data.active }
    : REGLA_DEFAULT;

  const porTarjeta = new Map<string, { total: number; ultimo: string | null; canjeados: number }>();
  const acum = (id: string) => {
    let a = porTarjeta.get(id);
    if (!a) porTarjeta.set(id, (a = { total: 0, ultimo: null, canjeados: 0 }));
    return a;
  };
  for (const s of sellos.data ?? []) {
    const a = acum(s.card_id);
    a.total++;
    if (!a.ultimo || s.created_at > a.ultimo) a.ultimo = s.created_at;
  }
  for (const c of canjes.data ?? []) acum(c.card_id).canjeados += c.stamps_used;

  const nombrePorTarjeta = new Map<string, string>();
  const filas: TarjetaFila[] = (tarjetas.data ?? []).map((t) => {
    const contacto = uno(t.contacts as Rel<{ name: string; phone: string | null }>);
    const a = porTarjeta.get(t.id) ?? { total: 0, ultimo: null, canjeados: 0 };
    const nombre = contacto?.name ?? 'Sin nombre';
    nombrePorTarjeta.set(t.id, nombre);
    return {
      id: t.id,
      token: t.token,
      nombre,
      telefono: contacto?.phone ?? null,
      estado: estadoTarjeta(a.total, a.canjeados, regla.requeridos),
      ultimoSello: a.ultimo,
    };
  });
  // Las que ya se pueden canjear arriba; luego las más recientes.
  filas.sort(
    (x, y) =>
      Number(y.estado.completa) - Number(x.estado.completa) || (y.ultimoSello ?? '').localeCompare(x.ultimoSello ?? '')
  );

  const conTarjeta = new Set((tarjetas.data ?? []).map((t) => t.contact_id));

  return {
    falta: false,
    regla,
    tarjetas: filas,
    canjes: (canjes.data ?? []).slice(0, 20).map((c) => ({
      id: c.id,
      nombre: nombrePorTarjeta.get(c.card_id) ?? '—',
      premio: c.reward,
      cuando: c.created_at,
    })),
    promos: (promos.data ?? []) as Promo[],
    sinTarjeta: (contactos.data ?? []).filter((c) => !conTarjeta.has(c.id)).map((c) => ({ id: c.id, nombre: c.name })),
  };
}

/** Promos vigentes para la página pública. Tolerante: sin tabla, ninguna. */
export async function promosPublicas(tenantId: string): Promise<Promo[]> {
  const { data, error } = await createAdminClient()
    .from('promotions')
    .select('id, title, details, code, starts_on, ends_on, active')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .limit(10);
  return error ? [] : ((data ?? []) as Promo[]);
}
