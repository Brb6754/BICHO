// La aritmética de una cotización.
//
// Vive aparte y con pruebas porque es lo único del producto que un
// cliente va a revisar con calculadora en la mano. Un centavo de más en
// el total es una llamada incómoda para el negocio que la mandó.
//
// TODO en centavos enteros. Un `0.1 + 0.2` en flotantes da
// 0.30000000000000004, y sobre cien partidas eso termina en un total
// que no cuadra con la suma de sus renglones — el error clásico de los
// sistemas de facturación hechos a la carrera.

export type QuoteItemInput = {
  description: string;
  /** Puede ser fraccionaria: 1.5 horas, 2.75 m². */
  quantity: number;
  unitPriceCents: number;
};

export type QuoteTotals = {
  subtotalCents: number;
  discountCents: number;
  /** Base sobre la que se calcula el impuesto: subtotal menos descuento. */
  taxableCents: number;
  taxCents: number;
  totalCents: number;
};

/**
 * El importe de una partida, redondeado al centavo.
 *
 * Se redondea AQUÍ, por renglón, y no al final: es lo que hace que la
 * columna de importes sume exactamente el subtotal impreso. Si se
 * redondeara solo el total, el cliente sumaría los renglones a mano y
 * le faltaría un peso.
 */
export function lineTotalCents(item: QuoteItemInput): number {
  return Math.round(item.quantity * item.unitPriceCents);
}

export function computeTotals(
  items: QuoteItemInput[],
  { discountCents = 0, taxRate = 16 }: { discountCents?: number; taxRate?: number } = {}
): QuoteTotals {
  const subtotalCents = items.reduce((suma, item) => suma + lineTotalCents(item), 0);

  // El descuento nunca deja un total negativo: un descuento mayor que el
  // subtotal es un error de captura, y cobrar -$300 no significa nada.
  const discount = Math.min(Math.max(Math.round(discountCents), 0), subtotalCents);
  const taxableCents = subtotalCents - discount;

  // Tasa en porcentaje (16 = 16%). Negativa no existe; por encima de 100
  // tampoco, y dejarlo pasar convierte un dedazo en una cotización
  // absurda enviada a un cliente.
  const rate = Math.min(Math.max(taxRate, 0), 100);
  const taxCents = Math.round((taxableCents * rate) / 100);

  return {
    subtotalCents,
    discountCents: discount,
    taxableCents,
    taxCents,
    totalCents: taxableCents + taxCents,
  };
}

export function formatMoney(cents: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** "Cotización #7" → folio legible, con ceros a la izquierda. */
export function formatFolio(folio: number): string {
  return String(folio).padStart(4, '0');
}

/**
 * Una cotización vencida no se "vence" sola en la base: nadie corre un
 * proceso a medianoche. Se decide al leerla, que es cuando importa.
 */
export function isExpired(validUntil: string | null, now: Date): boolean {
  if (!validUntil) return false;
  // validUntil es una fecha de calendario (yyyy-mm-dd), no un instante:
  // vale todo el día, así que vence al terminar ese día.
  const [y, m, d] = validUntil.split('-').map(Number);
  if (!y || !m || !d) return false;
  return now.getTime() > Date.UTC(y, m - 1, d, 23, 59, 59, 999);
}
