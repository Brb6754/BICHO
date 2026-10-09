import { lineTotalCents, computeTotals } from '@/lib/quotes/totals';

// De una cotización a una factura de Facturapi.
//
// LA REGLA QUE MANDA: el total de la factura tiene que ser EXACTAMENTE
// el de la cotización. El cliente ya vio un número y lo aceptó; una
// factura que diga otro es un problema contable y comercial, no un
// redondeo.
//
// DOS TRAMPAS QUE YA COSTARON SANGRE AL VERIFICAR CONTRA LA API REAL:
//
//  1. `tax_included` llega en TRUE por omisión. Mandar `price: 500` sin
//     tocarlo produce una factura de $500 totales (431.03 + IVA), no de
//     $580. Las cotizaciones de bicho guardan el precio SIN impuesto, así
//     que aquí siempre va en false y la tasa explícita.
//  2. La cotización tiene UN descuento global; Facturapi lo quiere por
//     partida. Se reparte en proporción, y el sobrante de centavos cae
//     en la partida más grande — si se reparte "a ojo", la suma de las
//     líneas deja de cuadrar con el total y el SAT lo rechaza.

export type ReceptorFiscal = {
  /** RFC de quien recibe la factura. */
  rfc: string;
  /** Razón social tal como aparece en su constancia. */
  legalName: string;
  /** Clave del régimen fiscal del SAT (601, 612, 616, 626…). */
  taxSystem: string;
  /** Código postal de su domicilio fiscal. Si no coincide, el SAT rechaza. */
  zip: string;
  email?: string | null;
};

export type QuoteParaFacturar = {
  items: { description: string; quantity: number; unitPriceCents: number }[];
  discountCents: number;
  /** Tasa en porcentaje, congelada en la cotización (16 = 16%). */
  taxRate: number;
  receptor: ReceptorFiscal;
  /** Clave de uso de CFDI del receptor. G03 = gastos en general. */
  usoCfdi?: string;
  /** Forma de pago del SAT. 03 = transferencia, 01 = efectivo, 04 = tarjeta. */
  paymentForm?: string;
  /**
   * Clave de producto/servicio del SAT por partida. '01010101' es la
   * clave real para "no existe en el catálogo": sirve para emitir, y es
   * lo correcto mientras el negocio no clasifique sus servicios. Cuando
   * los clasifique, cada servicio traerá la suya.
   */
  productKey?: string;
};

/** Reparte un descuento global entre las partidas, en centavos y sin perder ninguno. */
export function repartirDescuento(lineasCents: number[], descuentoCents: number): number[] {
  const subtotal = lineasCents.reduce((a, b) => a + b, 0);
  const descuento = Math.min(Math.max(Math.round(descuentoCents), 0), subtotal);
  if (descuento === 0 || subtotal === 0) return lineasCents.map(() => 0);

  const crudo = lineasCents.map((l) => Math.floor((l * descuento) / subtotal));
  const repartido = crudo.reduce((a, b) => a + b, 0);

  // Los centavos que el redondeo hacia abajo dejó fuera. Van a la partida
  // más grande: es donde menos se nota y donde no puede volver negativo
  // el descuento de una línea chica.
  let sobrante = descuento - repartido;
  const orden = lineasCents.map((l, i) => ({ l, i })).sort((a, b) => b.l - a.l);
  for (const { i } of orden) {
    if (sobrante <= 0) break;
    const cabe = lineasCents[i] - crudo[i];
    const dar = Math.min(cabe, sobrante);
    crudo[i] += dar;
    sobrante -= dar;
  }
  return crudo;
}

/** El cuerpo que se le manda a POST /v2/invoices. */
export function buildInvoicePayload(q: QuoteParaFacturar): Record<string, unknown> {
  const lineas = q.items.map((i) =>
    lineTotalCents({ description: i.description, quantity: i.quantity, unitPriceCents: i.unitPriceCents })
  );
  const descuentos = repartirDescuento(lineas, q.discountCents);
  const rate = Math.min(Math.max(q.taxRate, 0), 100) / 100;

  return {
    customer: {
      legal_name: q.receptor.legalName,
      tax_id: q.receptor.rfc,
      tax_system: q.receptor.taxSystem,
      address: { zip: q.receptor.zip },
      ...(q.receptor.email ? { email: q.receptor.email } : {}),
    },
    items: q.items.map((i, idx) => ({
      quantity: i.quantity,
      discount: descuentos[idx] / 100,
      product: {
        description: i.description,
        product_key: q.productKey ?? '01010101',
        price: i.unitPriceCents / 100,
        tax_included: false,
        taxes: [{ type: 'IVA', rate }],
      },
    })),
    payment_form: q.paymentForm ?? '03',
    use: q.usoCfdi ?? 'G03',
  };
}

/**
 * El total que DEBE traer la factura, calculado con la misma función que
 * imprimió el PDF y que vio el cliente. Quien emita compara contra esto
 * antes de dar por buena la factura: si no cuadra, algo del mapeo se
 * rompió y es mejor no timbrar que timbrar mal.
 */
export function totalEsperadoCents(q: QuoteParaFacturar): number {
  return computeTotals(q.items, { discountCents: q.discountCents, taxRate: q.taxRate }).totalCents;
}
