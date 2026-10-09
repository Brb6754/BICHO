// Cliente de Facturapi.
//
// El timbrado de un CFDI solo lo puede emitir un PAC autorizado por el
// SAT, así que la experiencia vive en bicho y la emisión pasa por aquí.
//
// ENDPOINTS VERIFICADOS contra docs.facturapi.io el 2026-10-08:
//   POST   /v2/invoices                  crear y timbrar
//   GET    /v2/invoices/{id}/pdf         descargar PDF
//   GET    /v2/invoices/{id}/xml         descargar XML
//   DELETE /v2/invoices/{id}?motive=..   cancelar (motive 01..04,
//                                        substitution opcional)
// El folio fiscal llega en el campo `uuid` de la factura.
//
// Lo que NO está verificado y por eso no está escrito: los endpoints de
// Organizations (alta del negocio, carga del sello, llaves por
// organización). Se leen de la documentación antes de escribirlos — en
// esta misma sesión ya pagamos el costo de codificar contra un endpoint
// recordado de memoria en vez de leído.

const BASE = 'https://www.facturapi.io/v2';

export type FacturapiError = { ok: false; status: number; message: string };
export type FacturapiOk<T> = { ok: true; data: T };
export type FacturapiResult<T> = FacturapiOk<T> | FacturapiError;

/** Lo que devuelve una factura timbrada, recortado a lo que bicho guarda. */
export type StampedInvoice = {
  id: string;
  /** Folio fiscal del SAT. */
  uuid?: string | null;
  series?: string | null;
  folio_number?: number | null;
  total?: number | null;
  verification_url?: string | null;
  status?: string | null;
};

async function call<T>(
  apiKey: string,
  method: string,
  path: string,
  body?: unknown
): Promise<FacturapiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        // La llave decide el ambiente (prueba o producción) Y la
        // organización que emite. No hay un parámetro de tenant: el
        // tenant ES la llave.
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      // Facturapi devuelve el motivo del rechazo del SAT en el cuerpo, y
      // es justo lo que el negocio necesita leer ("el código postal del
      // receptor no coincide"). Perderlo a cambio de un "error 400"
      // convierte un problema resoluble en un misterio.
      let message = `Facturapi respondió ${res.status}`;
      try {
        const detalle = (await res.json()) as { message?: string };
        if (detalle?.message) message = detalle.message;
      } catch {
        // Cuerpo no-JSON: nos quedamos con el mensaje genérico.
      }
      return { ok: false, status: res.status, message };
    }

    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    // Sin red o con Facturapi caído. No se lanza: quien llama decide qué
    // enseñar, y una factura fallida nunca debe tumbar la pantalla desde
    // la que se pidió.
    return { ok: false, status: 0, message: e instanceof Error ? e.message : 'No se pudo conectar.' };
  }
}

/**
 * Timbra una factura.
 *
 * `payload` va tal cual a Facturapi. No se tipa campo por campo a
 * propósito: el catálogo del SAT y la forma del LineItem cambian del
 * lado de ellos, y un tipo nuestro desactualizado rechazaría facturas
 * válidas. La construcción vive en `lib/billing/fromQuote.ts`.
 */
export function createInvoice(
  apiKey: string,
  payload: Record<string, unknown>
): Promise<FacturapiResult<StampedInvoice>> {
  return call<StampedInvoice>(apiKey, 'POST', '/invoices', payload);
}

/**
 * Cancela una factura ya timbrada.
 *
 * `motive` es obligatorio y es un catálogo del SAT:
 *   01 emitida con errores con relación   02 emitida con errores sin relación
 *   03 no se llevó a cabo la operación    04 operación nominativa en la global
 * Con 01 hay que mandar además la factura que la sustituye.
 */
export function cancelInvoice(
  apiKey: string,
  invoiceId: string,
  motive: '01' | '02' | '03' | '04',
  substitution?: string
): Promise<FacturapiResult<StampedInvoice>> {
  const qs = new URLSearchParams({ motive });
  if (substitution) qs.set('substitution', substitution);
  return call<StampedInvoice>(apiKey, 'DELETE', `/invoices/${invoiceId}?${qs.toString()}`);
}

/**
 * Descarga el PDF o el XML. Devuelve los bytes, no un enlace: el enlace
 * necesitaría la llave secreta en el navegador.
 */
export async function downloadInvoiceFile(
  apiKey: string,
  invoiceId: string,
  formato: 'pdf' | 'xml'
): Promise<FacturapiResult<ArrayBuffer>> {
  try {
    const res = await fetch(`${BASE}/invoices/${invoiceId}/${formato}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, status: res.status, message: `No se pudo descargar el ${formato}.` };
    return { ok: true, data: await res.arrayBuffer() };
  } catch (e) {
    return { ok: false, status: 0, message: e instanceof Error ? e.message : 'No se pudo conectar.' };
  }
}
