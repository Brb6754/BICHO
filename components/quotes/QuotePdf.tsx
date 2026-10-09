import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { computeTotals, formatMoney, formatFolio, lineTotalCents } from '@/lib/quotes/totals';
import { readableFgRgb, contrastRatio } from '@/lib/branding/colors';

// El PDF.
//
// Se arma con @react-pdf/renderer y no con un navegador sin cabeza: en
// Vercel, Chromium pesa más que el límite de una función y arranca en
// segundos. Esto renderiza en milisegundos y no necesita binario.
//
// El diseño lo decide la marca del negocio —su color, su logo— porque
// la cotización la manda él, no bicho. El único lugar donde bicho
// aparece es el pie, en gris claro.
//
// Tres decisiones que ordenan la página, y que la primera versión no
// tomaba:
//
//  1. EL TOTAL VA ARRIBA. Quien abre una cotización tiene una sola
//     pregunta y la tiene antes de leer nada. Esconderla hasta el pie
//     de una tabla es la costumbre heredada de las facturas, donde el
//     número ya se negoció. Aquí todavía no.
//  2. EL COLOR DE LA MARCA SE USA UNA VEZ, en una banda que ocupa el
//     tercio superior. Repartido en bordes y acentos sueltos se lee
//     como plantilla; concentrado se lee como papelería del negocio.
//  3. LA COTIZACIÓN LLEVA A ALGÚN LADO. El PDF es un callejón sin
//     salida: quien lo recibe no puede hacer nada con él. Si existe el
//     enlace público, el documento lo dice y vuelve al producto.

export type QuotePdfData = {
  folio: number;
  createdAt: string;
  validUntil: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  /** Zona del negocio. Sin ella la fecha se formatea en la del PROCESO: UTC en Vercel. */
  timezone: string;
  taxRate: number;
  taxLabel: string;
  discountCents: number;
  items: { description: string; quantity: number; unit: string | null; unitPriceCents: number }[];
  /** URL pública para verla y aceptarla. Sin ella el bloque no se dibuja. */
  acceptUrl?: string | null;
  business: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    location: string | null;
    terms: string | null;
  };
};

const INK = '#17181B';
const TENUE = '#75767F';
const LINEA = '#E8E8EE';

const styles = StyleSheet.create({
  page: { paddingBottom: 44, fontSize: 10, color: INK },

  // La banda de marca llega a los tres bordes: sin padding en la página,
  // el encabezado se siente impreso y no pegado sobre una hoja blanca.
  banda: { paddingTop: 32, paddingBottom: 26, paddingHorizontal: 46 },
  placa: { backgroundColor: '#FFFFFF', borderRadius: 6, padding: 6, marginBottom: 12, alignSelf: 'flex-start' },
  logo: { height: 34, objectFit: 'contain' },
  negocio: { fontSize: 17, fontWeight: 700 },

  cuerpo: { paddingHorizontal: 46, paddingTop: 24 },
  etiqueta: { fontSize: 8.5, color: TENUE },
  bloque: { marginTop: 18 },

  filaCabecera: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: INK, paddingBottom: 7 },
  fila: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: LINEA },
  cDesc: { flex: 1, paddingRight: 12 },
  cCant: { width: 64, textAlign: 'right', color: TENUE },
  cPrecio: { width: 78, textAlign: 'right', color: TENUE },
  cImporte: { width: 86, textAlign: 'right', fontWeight: 700 },

  tarjetaTotales: { marginTop: 16, marginLeft: 'auto', width: 258, borderRadius: 8, padding: 14 },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3.5 },

  aceptar: { marginTop: 18, borderWidth: 1, borderRadius: 8, padding: 12 },

  pie: {
    position: 'absolute',
    bottom: 24,
    left: 46,
    right: 46,
    fontSize: 7.5,
    color: '#A0A0AC',
    borderTopWidth: 1,
    borderTopColor: '#EFEFF4',
    paddingTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Un INSTANTE (created_at es timestamptz). Se formatea en la zona del
// negocio y no en la del proceso: en Vercel el proceso corre en UTC, asi
// que una cotizacion hecha a las 7pm en Mexico llevaba impresa la fecha
// del dia siguiente. Es el mismo bug de zona horaria que ya corregimos
// en la agenda y en los correos de cita.
function fechaLarga(iso: string, timezone: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  });
}

// Una FECHA DE CALENDARIO ('2026-10-31'), no un instante. Se arma a mano
// justamente para no convertirla: `new Date('2026-10-31')` es medianoche
// UTC, que en Mexico es el 30 por la tarde, y la vigencia se correria un
// dia. Antes se imprimia cruda, con guiones.
function fechaCorta(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  if (!m) return fecha;
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

/**
 * Mezcla un color hacia blanco de forma PROPORCIONAL.
 *
 * `lightenHex` suma una cantidad plana por canal, que sobre una marca
 * oscura no da un tinte claro sino un tono medio sucio: el berenjena
 * #2E1A2B con +86 queda en rgb(132,112,129), y el texto encima deja
 * de leerse. Mezclar por porcentaje aclara igual de bien un primario
 * casi negro que uno crema.
 */
function haciaBlanco(hex: string, ratio: number): string {
  const limpio = hex.replace('#', '');
  if (limpio.length !== 6) return '#F6F6F9';
  const canal = (i: number) => {
    const v = parseInt(limpio.slice(i, i + 2), 16);
    return Math.round(v + (255 - v) * ratio);
  };
  return `rgb(${canal(0)}, ${canal(2)}, ${canal(4)})`;
}

/** `readableFgRgb` devuelve un triplete para variables CSS; el PDF necesita color. */
function sobre(fondo: string): string {
  return `rgb(${readableFgRgb(fondo).split(' ').join(', ')})`;
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

  const marca = data.business.primaryColor;
  // El texto de la banda se calcula, no se asume blanco: hay negocios con
  // primario crema o dorado, y ahí el blanco desaparece.
  const tinta = sobre(marca);
  const tintaSuave = tinta.startsWith('rgb(255') ? 'rgba(255, 255, 255, 0.72)' : 'rgba(23, 24, 27, 0.62)';

  // Tarjeta de totales: el color de marca aclarado hasta que sea un
  // fondo, no un bloque de color. El acento solo entra si de verdad se
  // lee sobre blanco.
  const fondoTotales = haciaBlanco(marca, 0.9);
  const acento = contrastRatio(data.business.accentColor, '#FFFFFF') >= 3 ? data.business.accentColor : marca;

  return (
    <Document title={`Cotización ${formatFolio(data.folio)} — ${data.business.name}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={[styles.banda, { backgroundColor: marca }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ maxWidth: 300 }}>
              {/* Placa blanca siempre: un logo oscuro sobre una banda
                  oscura del mismo color simplemente no se ve. */}
              {data.business.logoUrl ? (
                <View style={styles.placa}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={data.business.logoUrl} style={styles.logo} />
                </View>
              ) : null}
              <Text style={[styles.negocio, { color: tinta }]}>{data.business.name}</Text>
              {data.business.location ? (
                <Text style={{ color: tintaSuave, marginTop: 4 }}>{data.business.location}</Text>
              ) : null}
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: tintaSuave, fontSize: 9 }}>Cotización</Text>
              <Text style={{ color: tinta, fontSize: 19, fontWeight: 700, marginTop: 1 }}>
                #{formatFolio(data.folio)}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginTop: 20,
            }}
          >
            <View>
              <Text style={{ color: tintaSuave, fontSize: 9 }}>Total</Text>
              <Text style={{ color: tinta, fontSize: 27, fontWeight: 700, marginTop: 2 }}>
                {formatMoney(totals.totalCents)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: tintaSuave }}>{fechaLarga(data.createdAt, data.timezone)}</Text>
              {data.validUntil ? (
                <Text style={{ color: tinta, marginTop: 3 }}>Válida hasta el {fechaCorta(data.validUntil)}</Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.cuerpo}>
          <View>
            <Text style={styles.etiqueta}>Para</Text>
            <Text style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>{data.customerName}</Text>
            {data.customerEmail || data.customerPhone ? (
              <Text style={{ color: TENUE, marginTop: 2 }}>
                {[data.customerPhone, data.customerEmail].filter(Boolean).join('  ·  ')}
              </Text>
            ) : null}
          </View>

          <View style={styles.bloque}>
            <View style={styles.filaCabecera}>
              <Text style={[styles.cDesc, styles.etiqueta]}>Concepto</Text>
              <Text style={[styles.cCant, styles.etiqueta]}>Cantidad</Text>
              <Text style={[styles.cPrecio, styles.etiqueta]}>Precio</Text>
              <Text style={[styles.cImporte, styles.etiqueta, { fontWeight: 400 }]}>Importe</Text>
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

          <View style={[styles.tarjetaTotales, { backgroundColor: fondoTotales }]} wrap={false}>
            <View style={styles.filaTotal}>
              <Text style={{ color: TENUE }}>Subtotal</Text>
              <Text>{formatMoney(totals.subtotalCents)}</Text>
            </View>
            {totals.discountCents > 0 ? (
              <View style={styles.filaTotal}>
                <Text style={{ color: TENUE }}>Descuento</Text>
                <Text>−{formatMoney(totals.discountCents)}</Text>
              </View>
            ) : null}
            <View style={styles.filaTotal}>
              <Text style={{ color: TENUE }}>
                {data.taxLabel} {data.taxRate}%
              </Text>
              <Text>{formatMoney(totals.taxCents)}</Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 9,
                paddingTop: 9,
                borderTopWidth: 1,
                borderTopColor: 'rgba(23, 24, 27, 0.14)',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: 700 }}>Total</Text>
              <Text style={{ fontSize: 15, fontWeight: 700 }}>{formatMoney(totals.totalCents)}</Text>
            </View>
          </View>

          {data.acceptUrl ? (
            <View style={[styles.aceptar, { borderColor: acento }]} wrap={false}>
              <Text style={{ fontWeight: 700 }}>Acéptala en línea</Text>
              <Text style={{ color: TENUE, marginTop: 4, lineHeight: 1.5 }}>
                Abre este enlace para revisarla y aceptarla con un clic. No necesitas responder este
                documento.
              </Text>
              <Text style={{ marginTop: 6, color: acento }}>{data.acceptUrl}</Text>
            </View>
          ) : null}

          {data.notes ? (
            <View style={styles.bloque}>
              <Text style={styles.etiqueta}>Notas</Text>
              <Text style={{ marginTop: 4, lineHeight: 1.5 }}>{data.notes}</Text>
            </View>
          ) : null}

          {data.business.terms ? (
            <View style={styles.bloque}>
              <Text style={styles.etiqueta}>Condiciones</Text>
              <Text style={{ marginTop: 4, lineHeight: 1.5, color: TENUE }}>{data.business.terms}</Text>
            </View>
          ) : null}
        </View>

        {/* La línea que evita un malentendido caro: quien recibe esto no
            puede deducirlo, y más vale que lo lea aquí y no con su
            contador. */}
        <View style={styles.pie} fixed>
          <Text>
            Cotización, no un comprobante fiscal (CFDI). Los precios pueden cambiar si cambian las
            condiciones descritas.
          </Text>
          <Text render={({ pageNumber, totalPages }) => (totalPages > 1 ? `${pageNumber}/${totalPages}` : '')} />
        </View>
      </Page>
    </Document>
  );
}
