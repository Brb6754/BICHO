// Clientes de demostración para los diez negocios de muestra.
//
// Correr con:  node db/seed-demo-contacts.mjs
//
// Idempotente: borra y recrea los contactos de esos diez slugs. NO se
// corre sobre un negocio real.
//
// Para qué existe: la sección de Clientes es la que mejor vende el
// producto —"aquí está toda tu clientela, con su historial"— y vacía no
// vende nada. Pero un CRM de demo tampoco puede ser una lista de nombres
// sin nada detrás: lo que lo hace creíble es que cada persona tenga una
// historia distinta, y que las tres listas de arriba (sin contestar, no
// vuelven, no llegaron) tengan a alguien dentro.
//
// Las citas se insertan directo y NO vía create_booking: aquí hacen
// falta fechas pasadas y estados concretos (no_show, completed), que la
// función no permite expresar. Se escalonan por recurso para no chocar
// contra el exclude constraint de bookings.

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

// Por defecto los diez demos; se le pueden pasar slugs sueltos para
// sembrar otro negocio de pruebas:
//   node db/seed-demo-contacts.mjs spa
const SLUGS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
  'dental-nova',
  'casa-luma',
  'alto-padel',
  'mesa-doce',
  'agua-serena',
  'hierro-monte',
  'clinica-alameda',
  'don-ramon',
  'lima-laca',
  'burbujas-bigotes',
  'casa-norte',
];

// Cada perfil es una historia distinta, y entre los seis cubren las tres
// listas de acción. Sin eso, el directorio se ve como un padrón.
//
//   visitas  → citas pasadas completadas
//   hace     → días desde la última visita (dispara "no vuelven" > 90)
//   proxima  → días hasta una cita futura (anula "no vuelven")
//   noShow   → una cita a la que no llegó
//   cotiza   → cotización enviada y sin contestar
const PERFILES = [
  { nombre: 'María Fernanda Robles', tel: '6181002001', visitas: 7, hace: 12, proxima: 4, tags: ['VIP'], nota: 'Siempre pide la primera cita del día. Le gusta que le confirmen por WhatsApp la tarde anterior.' },
  { nombre: 'Jorge Alberto Nava',    tel: '6181002002', visitas: 4, hace: 21, proxima: null, tags: ['Pide factura'], nota: 'Factura a nombre de su empresa. Los datos ya están en su ficha.', cotiza: true },
  { nombre: 'Rosa Elena Márquez',    tel: '6181002003', visitas: 5, hace: 140, proxima: null, tags: [], nota: 'Venía cada mes y dejó de venir en junio. Vale la pena un mensaje.' },
  { nombre: 'Luis Ángel Cordero',    tel: '6181002004', visitas: 2, hace: 30, proxima: null, noShow: true, tags: [], nota: 'Faltó una vez sin avisar. Confirmarle siempre.' },
  { nombre: 'Paola Jiménez',         tel: '6181002005', visitas: 1, hace: 6, proxima: null, tags: ['Primera vez'], nota: '' },
  { nombre: 'Carmen Ibarra',         tel: '6181002006', visitas: 9, hace: 8, proxima: 11, tags: ['VIP', 'Solo sábados'], nota: 'La clienta más antigua. Solo puede sábados por la mañana.' },
];

const dias = (n) => new Date(Date.now() - n * 86400000);

let total = 0;

for (const slug of SLUGS) {
  const { data: t } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
  if (!t) {
    console.log(`${slug.padEnd(17)} no existe, saltado`);
    continue;
  }

  const { data: recursos } = await db
    .from('resources')
    .select('id')
    .eq('tenant_id', t.id)
    .eq('active', true)
    .order('name');
  const { data: servicios } = await db
    .from('service_types')
    .select('id, duration_minutes')
    .eq('tenant_id', t.id)
    .eq('active', true)
    .order('name');

  if (!recursos?.length || !servicios?.length) {
    console.log(`${slug.padEnd(17)} sin recursos o servicios, saltado`);
    continue;
  }

  // Borrar lo anterior. `customers` y `bookings` caen por cascada desde
  // contacts? NO: contact_id es `on delete set null` a propósito (una
  // ficha borrada no puede llevarse una factura). Así que se limpian a
  // mano las citas de prueba antes.
  const { data: viejos } = await db.from('contacts').select('id').eq('tenant_id', t.id);
  const viejosIds = (viejos ?? []).map((c) => c.id);
  if (viejosIds.length) {
    const { data: custViejos } = await db
      .from('customers')
      .select('id')
      .in('contact_id', viejosIds);
    const custIds = (custViejos ?? []).map((c) => c.id);
    if (custIds.length) {
      await db.from('bookings').delete().in('customer_id', custIds);
      await db.from('customers').delete().in('id', custIds);
    }
    await db.from('contacts').delete().in('id', viejosIds);
  }

  let n = 0;
  for (const [i, p] of PERFILES.entries()) {
    const { data: contacto, error } = await db
      .from('contacts')
      .insert({
        tenant_id: t.id,
        name: p.nombre,
        phone: p.tel,
        email: null,
        tags: p.tags,
        notes: p.nota || null,
      })
      .select('id')
      .single();
    if (error) {
      console.log(`  ${p.nombre}: ${error.message}`);
      continue;
    }

    const recurso = recursos[i % recursos.length].id;
    const servicio = servicios[i % servicios.length];
    const dur = servicio.duration_minutes ?? 30;

    const citas = [];
    // Las visitas se reparten hacia atrás desde la última, y cada
    // contacto arranca a una hora distinta del día para que dos personas
    // del mismo recurso nunca se encimen.
    for (let v = 0; v < p.visitas; v++) {
      const d = dias(p.hace + v * 21);
      d.setHours(9 + i, 0, 0, 0);
      citas.push({ starts_at: d, status: 'completed' });
    }
    if (p.noShow) {
      const d = dias(p.hace + 7);
      d.setHours(16 + (i % 3), 0, 0, 0);
      citas.push({ starts_at: d, status: 'no_show' });
    }
    if (p.proxima) {
      const d = new Date(Date.now() + p.proxima * 86400000);
      d.setHours(11 + (i % 4), 0, 0, 0);
      citas.push({ starts_at: d, status: 'confirmed' });
    }

    for (const c of citas) {
      const { data: cust } = await db
        .from('customers')
        .insert({
          tenant_id: t.id,
          name: p.nombre,
          phone: p.tel,
          contact_id: contacto.id,
        })
        .select('id')
        .single();
      if (!cust) continue;

      const fin = new Date(c.starts_at.getTime() + dur * 60000);
      await db.from('bookings').insert({
        tenant_id: t.id,
        resource_id: recurso,
        service_type_id: servicio.id,
        customer_id: cust.id,
        starts_at: c.starts_at.toISOString(),
        ends_at: fin.toISOString(),
        status: c.status,
      });
    }

    // Una cotización enviada y sin contestar, para que la lista "sin
    // contestar" no salga vacía en la demo.
    if (p.cotiza) {
      const { data: q } = await db
        .from('quotes')
        .insert({
          tenant_id: t.id,
          folio: 9000 + i,
          customer_name: p.nombre,
          customer_phone: p.tel,
          contact_id: contacto.id,
          tax_rate: 16,
          tax_label: 'IVA',
          discount_cents: 0,
          status: 'viewed',
          viewed_at: dias(3).toISOString(),
          sent_at: dias(5).toISOString(),
        })
        .select('id')
        .single();
      if (q) {
        await db.from('quote_items').insert({
          quote_id: q.id,
          position: 0,
          description: 'Paquete de 4 sesiones',
          quantity: 4,
          unit_price_cents: 45000,
        });
      }
    }

    n++;
    total++;
  }

  console.log(`${slug.padEnd(17)} ${n} clientes`);
}

console.log(`\n${total} clientes de demostración en total`);
