// Nova Solar Durango — negocio de prueba para el CRM, cotizaciones y
// el módulo de reuniones.
//
// Correr con:  node db/seed-nova-solar.mjs
//
// Idempotente: deja el negocio exactamente como está escrito aquí.
// Borra y recrea sus asesores, tipos de reunión, contactos,
// cotizaciones y reuniones. NO se corre sobre un negocio real.
//
// Por qué este negocio y no otra demo más: Nova Solar vende algo caro
// que nadie compra en el primer contacto. Ese es justo el caso que los
// tres módulos juntos tienen que contar —alguien pide información, un
// asesor lo visita, sale una cotización, y semanas después se cierra o
// no— y el que un salón de uñas no puede contar, porque ahí el cliente
// decide en treinta segundos.
//
// Los colores salen del logo real de Nova Solar (#ff6400 / #fbbb35),
// no inventados, y el tema va en oscuro: así es su sitio hoy.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SLUG = 'nova-solar';
// El negocio cierra los domingos (ver HORARIO), así que una reunión
// sembrada en domingo delata la demo tan rápido como un "Servicio 1 ·
// $100": se corre un día hacia atrás. Las reuniones se insertan
// directo y no por `create_booking`, porque aquí hacen falta fechas
// pasadas y estados concretos que la función no permite expresar.
const sinDomingo = (d) => {
  if (d.getDay() === 0) d.setDate(d.getDate() - 1);
  return d;
};
const dias = (n) => sinDomingo(new Date(Date.now() - n * 86400000));
const enDias = (n) => sinDomingo(new Date(Date.now() + n * 86400000));

// ── Tipos de reunión ────────────────────────────────────────────────
// Tres, y cada uno es un paso distinto de la venta. Las duraciones son
// las de verdad: un diagnóstico por teléfono no dura una hora, y una
// visita a un techo sí.
const TIPOS = [
  ['Diagnóstico por videollamada', 30, 'video'],
  ['Visita técnica a domicilio', 60, 'sitio'],
  ['Presentación de propuesta', 45, 'oficina'],
];

const ASESORES = ['Bruno Rueda', 'Daniela Ortega'];

// Lunes a viernes 9–14 y 16–19, sábado 10–14. La tarde partida es
// real en Durango y además ejercita el caso de dos rangos el mismo día.
const HORARIO = [
  ...[1, 2, 3, 4, 5].flatMap((d) => [
    { day_of_week: d, starts_at: '09:00', ends_at: '14:00' },
    { day_of_week: d, starts_at: '16:00', ends_at: '19:00' },
  ]),
  { day_of_week: 6, starts_at: '10:00', ends_at: '14:00' },
];

// ── Prospectos ──────────────────────────────────────────────────────
// Seis historias distintas. Entre las seis cubren las tres listas del
// CRM (cotización sin contestar, no vuelve, no llegó) y las cuatro
// etapas del embudo de reuniones, incluida la más importante: una
// reunión que ya pasó y nadie capturó.
const PROSPECTOS = [
  {
    nombre: 'Ricardo Lozano',
    empresa: 'Abarrotes La Peña',
    tel: '6181230001',
    correo: 'ricardo@abarroteslapena.mx',
    tags: ['Comercial'],
    nota: 'Techo de lámina, 220V trifásico. Recibo bimestral de $14,800. Pidió factura desde el primer contacto.',
    direccion: 'Blvd. Domingo Arrieta 1420, Durango',
    reuniones: [
      { tipo: 1, hace: 24, outcome: 'cotizado' },
      { tipo: 2, hace: 9, outcome: 'cotizado' },
    ],
    cotiza: {
      folio: 1041,
      status: 'viewed',
      partidas: [
        ['Panel solar 580 W monocristalino', 18, 489000],
        ['Inversor híbrido 10 kW', 1, 3250000],
        ['Estructura para techo de lámina', 18, 68000],
        ['Instalación, cableado y puesta en marcha', 1, 2890000],
        ['Trámite de interconexión ante CFE', 1, 650000],
      ],
    },
  },
  {
    nombre: 'Martha Elena Ibarra',
    empresa: null,
    tel: '6181230002',
    correo: 'marthaibarra@gmail.com',
    tags: ['Residencial'],
    nota: 'Casa en Fracc. Los Remedios. Quiere bajar el recibo de luz antes del verano.',
    direccion: 'Cerrada de los Álamos 18, Fracc. Los Remedios, Durango',
    reuniones: [{ tipo: 1, hace: 3, outcome: null }],
  },
  {
    nombre: 'Jorge Villalobos',
    empresa: 'Transportes Villalobos',
    tel: '6181230003',
    correo: 'jvillalobos@transvillalobos.com',
    tags: ['Comercial', 'Pide factura'],
    nota: 'Nave de 900 m². Cerró en agosto, instalación terminada. Preguntó por una segunda nave.',
    direccion: 'Parque Industrial Ladrillera, Bodega 7, Durango',
    reuniones: [
      { tipo: 2, hace: 71, outcome: 'ganado' },
      { tipo: 3, hace: 58, outcome: 'ganado' },
    ],
  },
  {
    nombre: 'Claudia Rentería',
    empresa: 'Estética Claudia',
    tel: '6181230004',
    correo: null,
    tags: [],
    nota: 'No llegó a la visita técnica y no contestó después. Confirmar siempre un día antes.',
    direccion: 'Av. 20 de Noviembre 905, Centro, Durango',
    reuniones: [{ tipo: 2, hace: 34, outcome: 'perdido', noShow: true }],
  },
  {
    nombre: 'Héctor Sandoval',
    empresa: 'Hotel Casa Sandoval',
    tel: '6181230005',
    correo: 'reservaciones@casasandoval.mx',
    tags: ['Comercial'],
    nota: 'Doce habitaciones. Le interesa pero quiere esperar al cierre de temporada.',
    direccion: 'Calle Negrete 712, Centro, Durango',
    reuniones: [
      { tipo: 1, hace: 15, outcome: 'interesado' },
      { tipo: 2, en: 5 },
    ],
  },
  {
    nombre: 'Paulina Mercado',
    empresa: 'Panadería La Espiga',
    tel: '6181230006',
    correo: 'paulina@laespiga.mx',
    tags: ['Comercial'],
    nota: 'Hornos eléctricos, consumo alto en madrugada. Pidió ver números de retorno de inversión.',
    direccion: 'Calle Zarco 330, Durango',
    reuniones: [{ tipo: 3, en: 2 }],
    cotiza: {
      folio: 1042,
      status: 'sent',
      partidas: [
        ['Panel solar 580 W monocristalino', 10, 489000],
        ['Inversor 5 kW', 1, 1980000],
        ['Estructura para techo de concreto', 10, 54000],
        ['Instalación y puesta en marcha', 1, 1750000],
      ],
    },
  },
];

async function main() {
  // ── El negocio ────────────────────────────────────────────────────
  const fila = {
    slug: SLUG,
    name: 'Nova Solar Durango',
    vertical: 'general',
    description: 'Paneles solares para casa y negocio en Durango.',
    status: 'trial',
    plan: 'standard',
    timezone: 'America/Mexico_City',
    primary_color: '#ff6400',
    secondary_color: '#1a1410',
    accent_color: '#fbbb35',
    background_color: '#F7F6F3',
    text_color: '#1A1A1A',
    theme_mode: 'dark',
    font_heading: 'Poppins',
    font_body: 'Inter',
    resource_label: 'Asesor',
    resource_question: '¿Con qué asesor quieres hablar?',
    location: 'Durango, Dgo.',
    // Nova Solar no agenda "servicios": agenda reuniones de venta y
    // manda cotizaciones. Dejar reservas prendido le llenaría el panel
    // de pantallas (catálogo, precios, duración) que no va a usar.
    reservas_enabled: false,
    quotes_enabled: true,
    reuniones_enabled: true,
    tax_rate: 16,
    tax_label: 'IVA',
    quote_terms:
      'Precios en pesos mexicanos, vigencia 15 días. Incluye trámite de interconexión ante CFE. No incluye obra civil ni refuerzo estructural si el techo lo requiere.',
  };

  const { data: existe } = await db.from('tenants').select('id').eq('slug', SLUG).maybeSingle();

  let id;
  if (existe) {
    id = existe.id;
    const { error } = await db.from('tenants').update(fila).eq('id', id);
    if (error) falta(error);
    // Las reuniones y las citas cuelgan de customers; los contactos se
    // borran aparte porque `contact_id` es `on delete set null` a
    // propósito (ver db/037).
    const { data: cust } = await db.from('customers').select('id').eq('tenant_id', id);
    const custIds = (cust ?? []).map((c) => c.id);
    if (custIds.length) {
      await db.from('bookings').delete().in('customer_id', custIds);
      await db.from('customers').delete().in('id', custIds);
    }
    await db.from('quotes').delete().eq('tenant_id', id);
    await db.from('contacts').delete().eq('tenant_id', id);
    await db.from('resource_schedules').delete().eq('tenant_id', id);
    await db.from('resources').delete().eq('tenant_id', id);
    await db.from('service_types').delete().eq('tenant_id', id);
  } else {
    const { data, error } = await db.from('tenants').insert(fila).select('id').single();
    if (error) falta(error);
    id = data.id;
  }

  // ── Asesores y su horario ─────────────────────────────────────────
  const { data: recursos, error: eRec } = await db
    .from('resources')
    .insert(ASESORES.map((name) => ({ tenant_id: id, name, active: true })))
    .select('id, name');
  if (eRec) falta(eRec);

  const { error: eHor } = await db.from('resource_schedules').insert(
    recursos.flatMap((r) => HORARIO.map((h) => ({ tenant_id: id, resource_id: r.id, ...h })))
  );
  if (eHor) falta(eHor);

  // ── Tipos de reunión ──────────────────────────────────────────────
  const { data: tiposRaw, error: eTipo } = await db
    .from('service_types')
    .insert(
      TIPOS.map(([name, duration_minutes, modality]) => ({
        tenant_id: id,
        name,
        duration_minutes,
        // Una reunión de venta no se cobra. El precio existe en la
        // tabla porque la comparte con los servicios; aquí es cero y
        // no se enseña en ningún lado.
        price_cents: 0,
        requires_staff: true,
        active: true,
        kind: 'reunion',
        modality,
      }))
    )
    .select('id, name, duration_minutes, modality');
  if (eTipo) falta(eTipo);

  // Por nombre y no por la posición del arreglo que devolvió el insert:
  // PostgREST no promete orden de salida, y además los perfiles de
  // abajo numeran los tipos 1-2-3 (como se leen), no 0-1-2.
  const tipos = TIPOS.map(([name]) => {
    const t = (tiposRaw ?? []).find((x) => x.name === name);
    if (!t) {
      console.error(`
✗ No se creó el tipo de reunión "${name}".`);
      process.exit(1);
    }
    return t;
  });

  // ── Prospectos, reuniones y cotizaciones ──────────────────────────
  let nReuniones = 0;
  let nCotiz = 0;

  for (const [i, p] of PROSPECTOS.entries()) {
    const { data: contacto, error: eCon } = await db
      .from('contacts')
      .insert({
        tenant_id: id,
        name: p.nombre,
        phone: p.tel,
        email: p.correo,
        razon_social: p.empresa,
        tags: p.tags,
        notes: p.nota || null,
      })
      .select('id')
      .single();
    if (eCon) falta(eCon);

    const asesor = recursos[i % recursos.length].id;

    for (const [j, r] of (p.reuniones ?? []).entries()) {
      // `r.tipo` es 1-based: así se lee en la lista de arriba.
      const tipo = tipos[r.tipo - 1];
      if (!tipo) {
        console.error(`
✗ ${p.nombre}: el tipo ${r.tipo} no existe (hay ${tipos.length}).`);
        process.exit(1);
      }
      // Cada prospecto arranca a una hora distinta del día para que dos
      // reuniones del mismo asesor nunca choquen contra el exclude
      // constraint.
      const inicio = r.en != null ? enDias(r.en) : dias(r.hace);
      inicio.setHours(9 + ((i + j) % 5), 0, 0, 0);
      const fin = new Date(inicio.getTime() + tipo.duration_minutes * 60000);

      const { data: cust } = await db
        .from('customers')
        .insert({
          tenant_id: id,
          name: p.nombre,
          phone: p.tel,
          email: p.correo,
          contact_id: contacto.id,
        })
        .select('id')
        .single();
      if (!cust) continue;

      const { error: eB } = await db.from('bookings').insert({
        tenant_id: id,
        resource_id: asesor,
        service_type_id: tipo.id,
        customer_id: cust.id,
        starts_at: inicio.toISOString(),
        ends_at: fin.toISOString(),
        status: r.noShow ? 'no_show' : r.en != null ? 'confirmed' : 'completed',
        kind: 'reunion',
        modality: tipo.modality,
        address: tipo.modality === 'sitio' ? p.direccion : null,
        company: p.empresa,
        outcome: r.outcome ?? null,
      });
      if (eB) falta(eB);
      nReuniones++;
    }

    if (p.cotiza) {
      const { data: q, error: eQ } = await db
        .from('quotes')
        .insert({
          tenant_id: id,
          folio: p.cotiza.folio,
          customer_name: p.nombre,
          customer_phone: p.tel,
          customer_email: p.correo,
          contact_id: contacto.id,
          tax_rate: 16,
          tax_label: 'IVA',
          discount_cents: 0,
          status: p.cotiza.status,
          sent_at: dias(7).toISOString(),
          viewed_at: p.cotiza.status === 'viewed' ? dias(4).toISOString() : null,
          valid_until: enDias(8).toISOString().slice(0, 10),
        })
        .select('id')
        .single();
      if (eQ) falta(eQ);

      const { error: eI } = await db.from('quote_items').insert(
        p.cotiza.partidas.map(([description, quantity, unit_price_cents], k) => ({
          quote_id: q.id,
          position: k,
          description,
          quantity,
          unit_price_cents,
        }))
      );
      if (eI) falta(eI);
      nCotiz++;
    }
  }

  console.log(`✓ ${SLUG}`);
  console.log(`  ${ASESORES.length} asesores · ${tipos.length} tipos de reunión`);
  console.log(`  ${PROSPECTOS.length} prospectos · ${nReuniones} reuniones · ${nCotiz} cotizaciones`);
  console.log(`\n  Panel:  http://${SLUG}.localhost:3000/dashboard`);
  console.log(`  Agenda: http://${SLUG}.localhost:3000/reuniones`);
}

// Si falta una migración, decirlo con nombre y apellido: "column
// does not exist" en medio de un seed no le dice a nadie qué correr.
function falta(error) {
  const falta039 =
    error.code === '42703' &&
    /kind|modality|outcome|company|address|reuniones_enabled/.test(error.message);
  if (falta039) {
    console.error('\n✗ Falta correr db/039_reuniones.sql en el SQL Editor de Supabase.');
    console.error(`  (${error.message})`);
    process.exit(1);
  }
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
}

await main();
