import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { InputLinkAnticipo, ProveedorPago } from '@/lib/anticipos/pago';
import { obtenerTokenVendedor } from './mpConnect';

// Link de pago del anticipo: una preferencia de Checkout Pro creada con el
// access_token DEL NEGOCIO, así que el cobro cae directo en su cuenta. Sin
// marketplace_fee: bicho no se queda con nada del anticipo.

const MP_API = 'https://api.mercadopago.com';

export function urlWebhookAnticipos(): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';
  const protocol = rootDomain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${rootDomain}/api/webhooks/mercadopago-anticipos`;
}

/** `<tenantId>:<bookingId>`; el webhook lo valida contra la conexión del negocio. */
export const referenciaAnticipo = (tenantId: string, bookingId: string) => `${tenantId}:${bookingId}`;

export function leerReferenciaAnticipo(ref: unknown): { tenantId: string; bookingId: string } | null {
  const m = /^([0-9a-f-]{36}):([0-9a-f-]{36})$/i.exec(typeof ref === 'string' ? ref : '');
  return m ? { tenantId: m[1], bookingId: m[2] } : null;
}

export function proveedorMpConnect(db: SupabaseClient): ProveedorPago {
  return {
    async crearLinkAnticipo(input: InputLinkAnticipo) {
      try {
        const token = await obtenerTokenVendedor(db, input.tenantId);
        if (!token) return null;
        const external_reference = referenciaAnticipo(input.tenantId, input.bookingId);
        const res = await fetch(`${MP_API}/checkout/preferences`, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': randomUUID(),
          },
          body: JSON.stringify({
            // MXN: exponente 2, unit_price en PESOS (no centavos).
            items: [{ title: input.descripcion.slice(0, 250), quantity: 1, unit_price: Math.round(input.montoMxn * 100) / 100, currency_id: 'MXN' }],
            external_reference,
            notification_url: urlWebhookAnticipos(),
            expires: true,
            expiration_date_to: input.vence.toISOString(),
          }),
        });
        // Solo el status: la respuesta de error puede traer datos de la cuenta.
        if (!res.ok) {
          console.error(`[mp-connect] preferencia rechazada status=${res.status}`);
          return null;
        }
        const pref = (await res.json()) as { init_point?: string; sandbox_init_point?: string };
        const url = token.liveMode ? pref.init_point : (pref.sandbox_init_point ?? pref.init_point);
        return url ? { url, referencia: external_reference } : null;
      } catch (e) {
        console.error(`[mp-connect] no se pudo crear el link: ${e instanceof Error ? e.message : 'desconocido'}`);
        return null;
      }
    },
  };
}
