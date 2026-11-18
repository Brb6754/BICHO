import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cifrarToken, descifrarToken } from './mpConnectCrypto';

// Mercado Pago Connect: el negocio autoriza (OAuth) a la app de bicho y
// con su access_token se crean los links de anticipo A SU NOMBRE. El
// dinero cae directo en la cuenta del negocio; bicho no cobra comisión
// (sin marketplace_fee) ni toca el dinero.
//
// Verificado contra la documentación oficial (nov 2026):
//   - autorización: https://auth.mercadopago.com/authorization con
//     client_id, response_type=code, platform_id=mp, state, redirect_uri
//     (el code dura 10 min; redirect_uri estático e idéntico al de la app)
//   - POST https://api.mercadopago.com/oauth/token: authorization_code
//     (client_id, client_secret, code, redirect_uri, test_token) y
//     refresh_token (client_id, client_secret, refresh_token). El
//     access_token dura 180 días; el refresh_token es de un solo uso y
//     se renueva en cada refresh, así que se guarda el nuevo siempre.
// TODO(PKCE): MP lo soporta (code_challenge S256) solo si se activa en
// la app; no se usa porque mp_oauth_states no tiene dónde guardar el
// code_verifier. El state de un solo uso + client_secret ya cubren el
// flujo de servidor.

const MP_API = 'https://api.mercadopago.com';
const MP_AUTH = 'https://auth.mercadopago.com/authorization';
const STATE_MAX_MS = 10 * 60 * 1000;
// Se refresca con margen: un token de 180 días que vence a media venta es un link roto.
const REFRESCAR_ANTES_MS = 7 * 24 * 60 * 60 * 1000;

type ConfigConnect = { clientId: string; clientSecret: string; redirectUri: string };

export function configConnect(): ConfigConnect | null {
  const clientId = process.env.MP_CONNECT_CLIENT_ID;
  const clientSecret = process.env.MP_CONNECT_CLIENT_SECRET;
  const redirectUri = process.env.MP_CONNECT_REDIRECT_URI;
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}

/** Sandbox salvo MP_CONNECT_LIVE=1: Bruno no tiene la app en producción todavía. */
export function connectEnVivo(): boolean {
  return process.env.MP_CONNECT_LIVE === '1';
}

export function urlAutorizacion(cfg: ConfigConnect, state: string): string {
  const q = new URLSearchParams({
    client_id: cfg.clientId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: cfg.redirectUri,
  });
  return `${MP_AUTH}?${q}`;
}

/** Crea el state de un solo uso ligado al negocio. Devuelve null si la tabla no existe. */
export async function crearState(db: SupabaseClient, tenantId: string, ahora: Date = new Date()): Promise<string | null> {
  // Limpieza de paso: los states abandonados no sirven para nada.
  await db.from('mp_oauth_states').delete().lt('created_at', new Date(ahora.getTime() - STATE_MAX_MS).toISOString());
  const state = randomBytes(32).toString('base64url');
  const { error } = await db.from('mp_oauth_states').insert({ state, tenant_id: tenantId, created_at: ahora.toISOString() });
  return error ? null : state;
}

/**
 * Consume el state: lo borra (un solo uso) y devuelve el negocio si
 * existía y tiene menos de 10 minutos. El delete...select es atómico, así
 * que dos regresos con el mismo state no pueden ganar los dos.
 */
export async function consumirState(db: SupabaseClient, state: string, ahora: Date = new Date()): Promise<string | null> {
  if (!state || state.length > 200) return null;
  const { data, error } = await db.from('mp_oauth_states').delete().eq('state', state).select('tenant_id, created_at');
  const fila = !error && Array.isArray(data) ? (data[0] as { tenant_id: string; created_at: string } | undefined) : undefined;
  if (!fila) return null;
  if (ahora.getTime() - new Date(fila.created_at).getTime() > STATE_MAX_MS) return null;
  return fila.tenant_id;
}

type RespuestaToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  user_id: number | string;
  public_key?: string;
  live_mode?: boolean;
  scope?: string;
};

async function pedirToken(cuerpo: Record<string, string>): Promise<RespuestaToken> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  // Solo el status: el cuerpo puede traer tokens o datos de la cuenta.
  if (!res.ok) throw new Error(`Mercado Pago OAuth respondió ${res.status}`);
  const t = (await res.json()) as RespuestaToken;
  if (!t?.access_token || t.user_id == null) throw new Error('Respuesta de OAuth sin access_token o user_id');
  return t;
}

export async function intercambiarCodigo(cfg: ConfigConnect, code: string): Promise<RespuestaToken> {
  return pedirToken({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
    test_token: connectEnVivo() ? 'false' : 'true',
  });
}

/** Guarda (o reemplaza) la conexión del negocio con los tokens cifrados. */
export async function guardarConexion(db: SupabaseClient, tenantId: string, t: RespuestaToken, ahora: Date = new Date()) {
  const fila = {
    tenant_id: tenantId,
    mp_user_id: String(t.user_id),
    access_token_enc: cifrarToken(t.access_token),
    refresh_token_enc: t.refresh_token ? cifrarToken(t.refresh_token) : null,
    token_expires_at: t.expires_in ? new Date(ahora.getTime() + t.expires_in * 1000).toISOString() : null,
    public_key: t.public_key ?? null,
    live_mode: t.live_mode ?? connectEnVivo(),
    scope: t.scope ?? null,
    updated_at: ahora.toISOString(),
  };
  const { error } = await db.from('tenant_mp_connections').upsert(fila, { onConflict: 'tenant_id' });
  if (error) throw new Error(`No se pudo guardar la conexión de Mercado Pago code=${error.code}`);
}

type FilaConexion = {
  tenant_id: string;
  mp_user_id: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  live_mode: boolean | null;
};

export type TokenVendedor = { accessToken: string; mpUserId: string; liveMode: boolean };

async function leerConexion(db: SupabaseClient, tenantId: string): Promise<FilaConexion | null> {
  const { data, error } = await db
    .from('tenant_mp_connections')
    .select('tenant_id, mp_user_id, access_token_enc, refresh_token_enc, token_expires_at, live_mode')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (error) throw new Error(`tenant_mp_connections code=${error.code}`);
  return (data as FilaConexion | null) ?? null;
}

const aToken = (f: FilaConexion): TokenVendedor => ({
  accessToken: descifrarToken(f.access_token_enc),
  mpUserId: String(f.mp_user_id),
  liveMode: f.live_mode === true,
});

/**
 * Access token del negocio, refrescado si vence en menos de 7 días.
 * null si el negocio no está conectado. Lanza si la tabla no existe o el
 * token ya venció y no se pudo refrescar.
 */
export async function obtenerTokenVendedor(db: SupabaseClient, tenantId: string, ahora: Date = new Date()): Promise<TokenVendedor | null> {
  const fila = await leerConexion(db, tenantId);
  if (!fila) return null;
  const vence = fila.token_expires_at ? new Date(fila.token_expires_at).getTime() : null;
  if (vence === null || vence - ahora.getTime() > REFRESCAR_ANTES_MS) return aToken(fila);

  const cfg = configConnect();
  try {
    if (!cfg || !fila.refresh_token_enc) throw new Error('sin refresh_token o sin configuración');
    const t = await pedirToken({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: descifrarToken(fila.refresh_token_enc),
    });
    await guardarConexion(db, tenantId, t, ahora);
    return { accessToken: t.access_token, mpUserId: String(t.user_id), liveMode: t.live_mode ?? fila.live_mode === true };
  } catch (e) {
    // El refresh_token es de un solo uso: si otro proceso lo gastó primero,
    // la fila ya tiene el token nuevo.
    const actual = await leerConexion(db, tenantId);
    const venceActual = actual?.token_expires_at ? new Date(actual.token_expires_at).getTime() : null;
    if (actual && (venceActual === null || venceActual > ahora.getTime())) return aToken(actual);
    throw new Error(`No se pudo refrescar el token de Mercado Pago: ${e instanceof Error ? e.message : 'desconocido'}`);
  }
}
