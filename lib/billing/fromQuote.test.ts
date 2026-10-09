import { describe, it, expect } from 'vitest';
import { buildInvoicePayload, repartirDescuento, totalEsperadoCents } from './fromQuote';

const receptor = {
  rfc: 'XAXX010101000',
  legalName: 'PUBLICO EN GENERAL',
  taxSystem: '616',
  zip: '34000',
};

/** Reproduce la aritmética de Facturapi: precio sin IVA, menos descuento, más impuesto. */
function totalSegunFacturapi(payload: Record<string, unknown>): number {
  const items = payload.items as {
    quantity: number;
    discount: number;
    product: { price: number; taxes: { rate: number }[] };
  }[];
  const bruto = items.reduce((s, i) => s + i.quantity * i.product.price - i.discount, 0);
  const impuesto = items.reduce(
    (s, i) => s + (i.quantity * i.product.price - i.discount) * i.product.taxes[0].rate,
    0
  );
  return Math.round((bruto + impuesto) * 100);
}

describe('buildInvoicePayload', () => {
  it('nunca deja que el precio incluya el impuesto', () => {
    // La trampa verificada contra la API real: con tax_included en true
    // —su valor por omisión— una cotización de $500 + IVA se facturaría
    // como $500 totales, y el negocio cobraría de menos en cada venta.
    const p = buildInvoicePayload({
      items: [{ description: 'Masaje', quantity: 1, unitPriceCents: 50000 }],
      discountCents: 0,
      taxRate: 16,
      receptor,
    });
    const item = (p.items as { product: { tax_included: boolean; taxes: { rate: number }[] } }[])[0];
    expect(item.product.tax_included).toBe(false);
    expect(item.product.taxes[0].rate).toBe(0.16);
  });

  it('el total de la factura es el de la cotización', () => {
    const q = {
      items: [{ description: 'Masaje', quantity: 1, unitPriceCents: 50000 }],
      discountCents: 0,
      taxRate: 16,
      receptor,
    };
    expect(totalSegunFacturapi(buildInvoicePayload(q))).toBe(totalEsperadoCents(q));
    expect(totalEsperadoCents(q)).toBe(58000);
  });

  it('cuadra con varias partidas, cantidades y descuento', () => {
    const q = {
      items: [
        { description: 'Acrílicas', quantity: 1, unitPriceCents: 85000 },
        { description: 'Diseño', quantity: 10, unitPriceCents: 6000 },
        { description: 'Pedicure', quantity: 1, unitPriceCents: 48000 },
      ],
      discountCents: 15000,
      taxRate: 16,
      receptor,
    };
    expect(totalSegunFacturapi(buildInvoicePayload(q))).toBe(totalEsperadoCents(q));
  });

  it('cuadra con un descuento que no divide exacto', () => {
    // 3 partidas iguales y un descuento de 10 centavos: el reparto
    // proporcional deja un centavo colgando. Si se pierde, la suma de
    // las líneas no cuadra con el total.
    const q = {
      items: [
        { description: 'A', quantity: 1, unitPriceCents: 10000 },
        { description: 'B', quantity: 1, unitPriceCents: 10000 },
        { description: 'C', quantity: 1, unitPriceCents: 10000 },
      ],
      discountCents: 10,
      taxRate: 16,
      receptor,
    };
    expect(totalSegunFacturapi(buildInvoicePayload(q))).toBe(totalEsperadoCents(q));
  });

  it('respeta una tasa distinta de 16', () => {
    const q = {
      items: [{ description: 'Frontera', quantity: 1, unitPriceCents: 10000 }],
      discountCents: 0,
      taxRate: 8,
      receptor,
    };
    const p = buildInvoicePayload(q);
    const item = (p.items as { product: { taxes: { rate: number }[] } }[])[0];
    expect(item.product.taxes[0].rate).toBe(0.08);
    expect(totalSegunFacturapi(p)).toBe(totalEsperadoCents(q));
  });

  it('manda el receptor como lo pide el CFDI 4.0', () => {
    const p = buildInvoicePayload({
      items: [{ description: 'X', quantity: 1, unitPriceCents: 1000 }],
      discountCents: 0,
      taxRate: 16,
      receptor: { ...receptor, email: 'cliente@ejemplo.mx' },
    });
    expect(p.customer).toEqual({
      legal_name: 'PUBLICO EN GENERAL',
      tax_id: 'XAXX010101000',
      tax_system: '616',
      address: { zip: '34000' },
      email: 'cliente@ejemplo.mx',
    });
    expect(p.use).toBe('G03');
    expect(p.payment_form).toBe('03');
  });
});

describe('repartirDescuento', () => {
  it('reparte en proporción', () => {
    expect(repartirDescuento([10000, 30000], 4000)).toEqual([1000, 3000]);
  });

  it('no pierde centavos', () => {
    const r = repartirDescuento([10000, 10000, 10000], 10);
    expect(r.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('nunca descuenta más que el subtotal', () => {
    expect(repartirDescuento([5000], 999999)).toEqual([5000]);
  });

  it('sin descuento no toca nada', () => {
    expect(repartirDescuento([5000, 1000], 0)).toEqual([0, 0]);
  });
});
