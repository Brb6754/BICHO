import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { computeTotals, formatMoney, formatFolio, lineTotalCents } from '@/lib/quotes/totals';

// El PDF.
//
// Se arma con @react-pdf/renderer y no con un navegador sin cabeza: en
// Vercel, Chromium pesa más que el límite de una función y arranca en
// segundos. Esto renderiza en milisegundos y no necesita binario.
//
// El diseño lo decide la marca del negocio —su color, su logo— porque
// la cotización la manda él, no bicho. El único lugar donde bicho
// aparece es el pie, en gris claro.

export type QuotePdfData = {
  folio: number;
  createdAt: string;
  validUntil: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  taxRate: number;
  taxLabel: string;
  discountCents: number;
  items: { description: string; quantity: number; unit: string | null; unitPriceCents: number }[];
  business: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    location: string | null;
    terms: string | null;
  };
};

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 56, paddingHorizontal: 44, fontSize: 10, color: '#1A1A1A' },
  banda: { height: 6, marginBottom: 26, borderRadius: 3 },
  encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { height: 42, objectFit: 'contain', marginBottom: 8 },
  negocio: { fontSize: 16, fontWeight: 700 },
  tenue: { color: '#6B6B76' },
  etiqueta: { fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#6B6B76' },
  folio: { fontSize: 13, fontWeight: 700, marginTop: 2 },
  bloque: { marginTop: 26 },
  filaCabecera: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E8',
    paddingBottom: 6,
    marginBottom: 2,
  },
  fila: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0F0F4' },
  cDesc: { flex: 1, paddingRight: 10 },
  cCant: { width: 62, textAlign: 'right' },
  cPrecio: { width: 78, textAlign: 'right' },
  cImporte: { width: 84, textAlign: 'right' },
  totales: { marginTop: 18, marginLeft: 'auto', width: 230 },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  granTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  pie: {
    position: 'absolute',
    bottom: 26,
    left: 44,
    right: 44,
    fontSize: 8,
    color: '#9A9AA6',
    borderTopWidth: 1,
    borderTopColor: '#EDEDF2',
    paddingTop: 8,
  },
});

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function QuotePdf({ data }: { data: QuotePdfData }) {
  const totals = computeTotals(
    data.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    })),
    { discountCents: data.discountCents, taxRate: data.taxRate }
  );

  return (
    <Document title={`Cotización ${formatFolio(data.folio)} — ${data.business.name}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={[styles.banda, { backgroundColor: data.business.primaryColor }]} />

        <View style={styles.encabezado}>
          <View style={{ maxWidth: 300 }}>
            {data.business.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.business.logoUrl} style={styles.logo} />
            ) : null}
            <Text style={styles.negocio}>{data.business.name}</Text>
            {data.business.location ? (
              <Text style={[styles.tenue, { marginTop: 3 }]}>{data.business.location}</Text>
            ) : null}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.etiqueta}>Cotización</Text>
            <Text style={styles.folio}>#{formatFolio(data.folio)}</Text>
            <Text style={[styles.tenue, { marginTop: 6 }]}>{fechaLarga(data.createdAt)}</Text>
            {data.validUntil ? (
              <Text style={styles.tenue}>Válida hasta el {data.validUntil}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.bloque}>
          <Text style={styles.etiqueta}>Para</Text>
          <Text style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{data.customerName}</Text>
          {data.customerEmail ? <Text style={styles.tenue}>{data.customerEmail}</Text> : null}
          {data.customerPhone ? <Text style={styles.tenue}>{data.customerPhone}</Text> : null}
        </View>

        <View style={styles.bloque}>
          <View style={styles.filaCabecera}>
            <Text style={[styles.cDesc, styles.etiqueta]}>Concepto</Text>
            <Text style={[styles.cCant, styles.etiqueta]}>Cantidad</Text>
            <Text style={[styles.cPrecio, styles.etiqueta]}>Precio</Text>
            <Text style={[styles.cImporte, styles.etiqueta]}>Importe</Text>
          </View>

          {data.items.map((item, i) => (
            <View key={i} style={styles.fila} wrap={false}>
              <Text style={styles.cDesc}>{item.description}</Text>
              <Text style={styles.cCant}>
                {item.quantity}
                {item.unit ? ` ${item.unit}` : ''}
              </Text>
              <Text style={styles.cPrecio}>{formatMoney(item.unitPriceCents)}</Text>
              <Text style={styles.cImporte}>
                {formatMoney(
                  lineTotalCents({
                    description: item.description,
                    quantity: item.quantity,
                    unitPriceCents: item.unitPriceCents,
                  })
                )}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totales}>
          <View style={styles.filaTotal}>
            <Text style={styles.tenue}>Subtotal</Text>
            <Text>{formatMoney(totals.subtotalCents)}</Text>
          </View>
          {totals.discountCents > 0 ? (
            <View style={styles.filaTotal}>
              <Text style={styles.tenue}>Descuento</Text>
              <Text>−{formatMoney(totals.discountCents)}</Text>
            </View>
          ) : null}
          <View style={styles.filaTotal}>
            <Text style={styles.tenue}>
              {data.taxLabel} {data.taxRate}%
            </Text>
            <Text>{formatMoney(totals.taxCents)}</Text>
          </View>
          <View style={styles.granTotal}>
            <Text style={{ fontSize: 12, fontWeight: 700 }}>Total</Text>
            <Text style={{ fontSize: 14, fontWeight: 700 }}>{formatMoney(totals.totalCents)}</Text>
          </View>
        </View>

        {data.notes ? (
          <View style={styles.bloque}>
            <Text style={styles.etiqueta}>Notas</Text>
            <Text style={{ marginTop: 4, lineHeight: 1.5 }}>{data.notes}</Text>
          </View>
        ) : null}

        {data.business.terms ? (
          <View style={styles.bloque}>
            <Text style={styles.etiqueta}>Condiciones</Text>
            <Text style={{ marginTop: 4, lineHeight: 1.5, color: '#6B6B76' }}>{data.business.terms}</Text>
          </View>
        ) : null}

        {/* La línea que evita un malentendido caro: quien recibe esto no
            puede deducirlo, y más vale que lo lea aquí y no con su
            contador. */}
        <Text style={styles.pie} fixed>
          Este documento es una cotización y no un comprobante fiscal (CFDI). Los precios pueden
          cambiar si cambian las condiciones descritas. · Hecho con bicho
        </Text>
      </Page>
    </Document>
  );
}
