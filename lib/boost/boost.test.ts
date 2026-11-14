import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/lib/whatsapp/agente/fakeDb';
import { procesarMensaje } from '@/lib/whatsapp/agente/procesar';
import { TOPE_BOOST_MENSAJES_MES, moduloIncluido, planMinimoPara, banderasDelPlan } from '@/lib/billing/planes';
import { avisarHuecoLiberado, correrHorasFlojas, type Enviar } from './motor';
import { apuntarseVip, apartarOferta, darDeBaja, YA_LO_GANARON } from './publico';
import { BOOST_DIAS_ENTRE_PROMOS, coincideVip, esBaja, precioAplicable, precioConDescuento, puedeRecibirPromo } from './reglas';

// Meta siempre mockeado (enviar inyectado): nada sale a la red.

const TZ = 'America/Mexico_City';
// Martes 17 nov 2026, 10:00 en CDMX.
const AHORA = new Date('2026-11-17T16:00:00Z');
const HUECO = { resource_id: 'R1', service_type_id: 'S1', starts_at: '2026-11-17T22:00:00Z', ends_at: '2026-11-17T23:00:00Z' }; // 16:00, tarde

function tenant(over: Record<string, unknown> = {}) {
  return {
    id: 'T1', slug: 'salon', name: 'Salón Uno', timezone: TZ, plan: 'negocio', status: 'active',
    boost_vip_enabled: true, boost_flojas_enabled: true, boost_descuento_max: 20, boost_aviso_horas: 6,
    boost_dias: [1, 2, 3, 4, 5], boost_hora_desde: 11, boost_hora_hasta: 18,
    ...over,
  };
}

let n = 0;
function contacto(over: Record<string, unknown> = {}) {
  n++;
  return {
    id: `C${n}`, tenant_id: 'T1', nombre: `Clienta ${n}`, telefono: `52618000${String(1000 + n)}`,
    service_type_id: null, dias: [], franjas: [], consentimiento_avisos: true, consentimiento_promos: true,
    baja_at: null, ultimo_aviso_at: null, ultima_promo_at: null, created_at: `2026-11-0${(n % 9) + 1}T00:00:00Z`,
    ...over,
  };
}

function base(extra: Record<string, Record<string, unknown>[]> = {}) {
  return {
    tenants: [tenant(), tenant({ id: 'T2', slug: 'otro', name: 'Otro' })],
    service_types: [
      { id: 'S1', tenant_id: 'T1', name: 'Corte', price_cents: 30000 },
      { id: 'S9', tenant_id: 'T2', name: 'Corte', price_cents: 30000 },
    ],
    resources: [{ id: 'R1', tenant_id: 'T1', active: true }],
    boost_contactos: [] as Record<string, unknown>[],
    boost_ofertas: [] as Record<string, unknown>[],
    boost_mensajes: [] as Record<string, unknown>[],
    bookings: [] as Record<string, unknown>[],
    ...extra,
  };
}

const enviarOk = () => vi.fn<Enviar>().mockResolvedValue({ status: 'sent' });

beforeEach(() => {
  n = 0;
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('plan y precio', () => {
  it('Boost se contrata en Negocio y Pro, con candado en Esencial, y cambiar de plan no lo prende', () => {
    expect(moduloIncluido('negocio', 'boost')).toBe(true);
    expect(moduloIncluido('pro', 'boost')).toBe(true);
    expect(moduloIncluido('esencial', 'boost')).toBe(false);
    expect(planMinimoPara('boost')).toBe('negocio');
    expect(banderasDelPlan('pro')).not.toHaveProperty('boost_vip_enabled');
  });
});

describe('matching de la lista VIP', () => {
  it('servicio, día y franja; vacío = le da igual', () => {
    const c = { service_type_id: null, dias: [], franjas: [], consentimiento_avisos: true, baja_at: null };
    expect(coincideVip(c, HUECO, TZ)).toBe(true);
    expect(coincideVip({ ...c, service_type_id: 'OTRO' }, HUECO, TZ)).toBe(false);
    expect(coincideVip({ ...c, dias: [2] }, HUECO, TZ)).toBe(true); // martes
    expect(coincideVip({ ...c, dias: [6, 0] }, HUECO, TZ)).toBe(false);
    expect(coincideVip({ ...c, franjas: ['tarde'] }, HUECO, TZ)).toBe(true);
    expect(coincideVip({ ...c, franjas: ['manana'] }, HUECO, TZ)).toBe(false);
    expect(coincideVip({ ...c, baja_at: 'x' }, HUECO, TZ)).toBe(false);
  });

  it('avisa solo a las compatibles, sin descuento, y cada oferta queda en la base', async () => {
    const { db, tablas } = fakeDb(base({
      boost_contactos: [contacto({ franjas: ['tarde'] }), contacto({ franjas: ['manana'] }), contacto({ service_type_id: 'S1', dias: [2] })],
    }));
    const enviar = enviarOk();
    const r = await avisarHuecoLiberado(db, 'T1', HUECO, { ahora: AHORA, enviar });
    expect(r.avisadas).toBe(2);
    expect(enviar.mock.calls.map((c) => c[0])).toEqual(['vip', 'vip']);
    expect(tablas.boost_ofertas.every((o) => o.precio_oferta_cents === o.precio_normal_cents)).toBe(true);
    expect(tablas.boost_mensajes).toHaveLength(2);
    // El link va al final de la plantilla y lleva el id de la oferta, no un precio.
    const link = enviar.mock.calls[0][3][4];
    expect(link).toContain(`/t/salon/reservar/boost/${tablas.boost_ofertas[0].id}`);
    expect(link).not.toMatch(/precio|price/);
  });

  it('WhatsApp sin configurar: no truena, registra skipped y no gasta el tope', async () => {
    const { db, tablas } = fakeDb(base({ boost_contactos: [contacto()] }));
    const enviar = vi.fn<Enviar>().mockResolvedValue({ status: 'skipped', reason: 'WhatsApp no configurado en la plataforma' });
    const r = await avisarHuecoLiberado(db, 'T1', HUECO, { ahora: AHORA, enviar });
    expect(r.avisadas).toBe(0);
    expect(tablas.boost_mensajes[0]).toMatchObject({ status: 'skipped' });
    expect(tablas.boost_contactos[0].ultimo_aviso_at).toBeNull();
  });

  it('apagado o plan Esencial: no manda nada', async () => {
    const { db } = fakeDb(base({ tenants: [tenant({ plan: 'esencial' })], boost_contactos: [contacto()] }));
    const enviar = enviarOk();
    expect((await avisarHuecoLiberado(db, 'T1', HUECO, { ahora: AHORA, enviar })).avisadas).toBe(0);
    expect(enviar).not.toHaveBeenCalled();
  });
});

describe('tope mensual', () => {
  it(`al llegar a ${TOPE_BOOST_MENSAJES_MES} mensajes del mes ya no manda`, async () => {
    const usados = Array.from({ length: TOPE_BOOST_MENSAJES_MES - 1 }, (_, i) => ({ id: `M${i}`, tenant_id: 'T1', status: 'sent', tipo: 'vip', created_at: '2026-11-10T12:00:00Z' }));
    const { db } = fakeDb(base({ boost_contactos: [contacto(), contacto(), contacto()], boost_mensajes: usados }));
    const enviar = enviarOk();
    const r = await avisarHuecoLiberado(db, 'T1', HUECO, { ahora: AHORA, enviar });
    expect(r).toEqual({ avisadas: 1, motivo: 'tope' });
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('los mensajes del mes pasado y los de otro negocio no cuentan', async () => {
    const otros = Array.from({ length: TOPE_BOOST_MENSAJES_MES }, (_, i) => ({
      id: `M${i}`, tenant_id: i % 2 ? 'T2' : 'T1', status: 'sent', tipo: 'vip', created_at: i % 2 ? '2026-11-10T12:00:00Z' : '2026-10-20T12:00:00Z',
    }));
    const { db } = fakeDb(base({ boost_contactos: [contacto()], boost_mensajes: otros }));
    expect((await avisarHuecoLiberado(db, 'T1', HUECO, { ahora: AHORA, enviar: enviarOk() })).avisadas).toBe(1);
  });
});

describe('horas flojas y anti-spam', () => {
  const slots = { get_available_slots: () => ({ data: [{ slot_start: '2026-11-17T19:00:00Z', slot_end: '2026-11-17T20:00:00Z' }] }) }; // 13:00
  const historia = (tel: string) => ({ tenant_id: 'T1', starts_at: '2026-11-03T19:30:00Z', service_type_id: 'S1', status: 'completed', customers: { phone: tel } });

  it('ofrece con el descuento del negocio solo a quien suele reservar en esa franja y aceptó promos', async () => {
    const a = contacto();
    const sinPromo = contacto({ consentimiento_promos: false });
    const otraFranja = contacto();
    const { db, tablas } = fakeDb(
      base({
        boost_contactos: [a, sinPromo, otraFranja],
        bookings: [historia(a.telefono), historia(sinPromo.telefono), { ...historia(otraFranja.telefono), starts_at: '2026-11-03T14:00:00Z' }],
      }),
      { rpc: slots }
    );
    const enviar = enviarOk();
    const r = await correrHorasFlojas(db, { ahora: AHORA, enviar });
    expect(r.enviadas).toBe(1);
    expect(enviar.mock.calls[0][0]).toBe('flojas');
    expect(enviar.mock.calls[0][3][4]).toBe('20%');
    expect(tablas.boost_ofertas[0]).toMatchObject({ contacto_id: a.id, precio_normal_cents: 30000, precio_oferta_cents: 24000 });
    expect(new Date(String(tablas.boost_ofertas[0].expira_at)).getTime()).toBe(AHORA.getTime() + 20 * 60_000);
  });

  it(`una promo cada ${BOOST_DIAS_ENTRE_PROMOS} días por clienta: la segunda corrida no le vuelve a escribir`, async () => {
    const a = contacto();
    const { db } = fakeDb(base({ boost_contactos: [a], bookings: [historia(a.telefono)] }), { rpc: slots });
    const enviar = enviarOk();
    await correrHorasFlojas(db, { ahora: AHORA, enviar });
    await correrHorasFlojas(db, { ahora: new Date(AHORA.getTime() + 3 * 86_400_000), enviar });
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(puedeRecibirPromo({ consentimiento_promos: true, baja_at: null, ultima_promo_at: AHORA.toISOString() }, new Date(AHORA.getTime() + BOOST_DIAS_ENTRE_PROMOS * 86_400_000))).toBe(true);
  });

  it('día no permitido: nada', async () => {
    const a = contacto();
    const { db } = fakeDb(base({ tenants: [tenant({ boost_dias: [6] })], boost_contactos: [a], bookings: [historia(a.telefono)] }), { rpc: slots });
    expect((await correrHorasFlojas(db, { ahora: AHORA, enviar: enviarOk() })).enviadas).toBe(0);
  });

  it('el precio piso se redondea a peso y nunca pasa de 50%', () => {
    expect(precioConDescuento(35000, 15)).toBe(29800);
    expect(precioConDescuento(30000, 90)).toBe(15000);
  });
});

describe('consentimiento obligatorio', () => {
  it('sin la casilla no se guarda; con ella, sí (y anula una baja vieja)', async () => {
    const { db, tablas } = fakeDb(base({ boost_contactos: [contacto({ telefono: '526181234567', baja_at: '2026-10-01T00:00:00Z' })] }));
    const entrada = { nombre: 'Ana', telefono: '618 123 4567', dias: [1, 9], franjas: ['tarde', 'x'] };
    expect(await apuntarseVip(db, 'salon', { ...entrada, consentimiento_avisos: false })).toMatchObject({ ok: false });
    expect(await apuntarseVip(db, 'salon', entrada)).toMatchObject({ ok: false });
    expect(tablas.boost_contactos[0].baja_at).not.toBeNull();

    expect(await apuntarseVip(db, 'salon', { ...entrada, consentimiento_avisos: true }, AHORA)).toEqual({ ok: true });
    expect(tablas.boost_contactos).toHaveLength(1);
    expect(tablas.boost_contactos[0]).toMatchObject({ nombre: 'Ana', dias: [1], franjas: ['tarde'], baja_at: null, consentimiento_promos: false });
  });

  it('un servicio de otro negocio no se acepta', async () => {
    const { db } = fakeDb(base());
    expect(await apuntarseVip(db, 'salon', { nombre: 'Ana', telefono: '6181234567', service_type_id: 'S9', consentimiento_avisos: true })).toMatchObject({ ok: false });
  });
});

describe('apartar una oferta', () => {
  function conOferta(over: Record<string, unknown> = {}) {
    const c = contacto();
    const oferta = {
      id: '11111111-1111-4111-8111-111111111111', tenant_id: 'T1', contacto_id: c.id, tipo: 'flojas', ...HUECO,
      precio_normal_cents: 30000, precio_oferta_cents: 24000, expira_at: new Date(AHORA.getTime() + 20 * 60_000).toISOString(), booking_id: null,
      ...over,
    };
    return { c, oferta };
  }
  const reservaOk = () => vi.fn().mockResolvedValue({ ok: true, bookingId: 'B1', serviceName: 'Corte' });

  it('dentro de la ventana: precio con descuento, guardado en la cita', async () => {
    const { c, oferta } = conOferta();
    const { db, tablas } = fakeDb(base({ boost_contactos: [c], boost_ofertas: [oferta], bookings: [{ id: 'B1', tenant_id: 'T1' }] }));
    const crear = reservaOk();
    const r = await apartarOferta(db, 'salon', oferta.id, new Date(AHORA.getTime() + 5 * 60_000), crear);
    expect(r).toEqual({ ok: true, bookingId: 'B1', precioCents: 24000, conDescuento: true });
    expect(crear.mock.calls[0][2]).toMatchObject({ customer_name: c.nombre, customer_phone: c.telefono, starts_at: HUECO.starts_at });
    expect(tablas.bookings[0]).toMatchObject({ boost_oferta_id: oferta.id, boost_precio_cents: 24000 });
    expect(tablas.boost_ofertas[0]).toMatchObject({ booking_id: 'B1', precio_cobrado_cents: 24000 });
  });

  it('oferta expirada → precio normal', async () => {
    const { c, oferta } = conOferta();
    const { db, tablas } = fakeDb(base({ boost_contactos: [c], boost_ofertas: [oferta], bookings: [{ id: 'B1', tenant_id: 'T1' }] }));
    const r = await apartarOferta(db, 'salon', oferta.id, new Date(AHORA.getTime() + 21 * 60_000), reservaOk());
    expect(r).toMatchObject({ ok: true, precioCents: 30000, conDescuento: false });
    expect(tablas.bookings[0].boost_precio_cents).toBe(30000);
    expect(precioAplicable(oferta, 32000, new Date(AHORA.getTime() + 21 * 60_000))).toEqual({ cents: 32000, conDescuento: false });
  });

  it('dos clientas peleando el mismo hueco: la segunda recibe "ya lo ganaron"', async () => {
    const a = conOferta();
    const b = conOferta({ id: '22222222-2222-4222-8222-222222222222' });
    b.oferta.contacto_id = b.c.id;
    // create_booking real: el exclusion constraint deja pasar a la primera y rechaza a la segunda (23P01).
    let ocupado = false;
    const { db, tablas } = fakeDb(
      base({ boost_contactos: [a.c, b.c], boost_ofertas: [a.oferta, b.oferta], bookings: [] }),
      { rpc: { create_booking: () => (ocupado ? { error: { code: '23P01' } } : ((ocupado = true), { data: 'B1' })) } }
    );
    const en = new Date(AHORA.getTime() + 60_000);
    expect(await apartarOferta(db, 'salon', a.oferta.id, en)).toMatchObject({ ok: true, bookingId: 'B1' });
    expect(await apartarOferta(db, 'salon', b.oferta.id, en)).toEqual({ ok: false, status: 409, error: YA_LO_GANARON });
    expect(tablas.boost_ofertas.find((o) => o.id === b.oferta.id)?.booking_id).toBeNull();
    // Volver a abrir el link propio después de apartar no crea otra cita.
    expect(await apartarOferta(db, 'salon', a.oferta.id, en)).toMatchObject({ ok: false, status: 409 });
  });
});

describe('aislamiento entre tenants', () => {
  it('una oferta de un negocio no se aparta desde el slug de otro', async () => {
    const c = contacto();
    const oferta = { id: '33333333-3333-4333-8333-333333333333', tenant_id: 'T1', contacto_id: c.id, ...HUECO, precio_normal_cents: 1, precio_oferta_cents: 1, expira_at: AHORA.toISOString(), booking_id: null };
    const { db } = fakeDb(base({ boost_contactos: [c], boost_ofertas: [oferta] }));
    const crear = vi.fn();
    expect(await apartarOferta(db, 'otro', oferta.id, AHORA, crear)).toMatchObject({ ok: false, status: 404 });
    expect(crear).not.toHaveBeenCalled();
  });

  it('un hueco liberado solo avisa a la lista VIP de SU negocio', async () => {
    const { db, tablas } = fakeDb(base({ boost_contactos: [contacto({ tenant_id: 'T2' }), contacto()] }));
    const enviar = enviarOk();
    await avisarHuecoLiberado(db, 'T1', HUECO, { ahora: AHORA, enviar });
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(tablas.boost_ofertas.every((o) => o.tenant_id === 'T1')).toBe(true);
  });
});

describe('baja', () => {
  it('reconoce BAJA y equivalentes, no "cancelar mi cita"', () => {
    for (const t of ['BAJA', 'baja.', ' Stop ', 'No más promociones', 'darme de baja']) expect(esBaja(t)).toBe(true);
    for (const t of ['quiero cancelar mi cita', 'hola', 'bajar de precio?']) expect(esBaja(t)).toBe(false);
  });

  it('BAJA al número propio de un negocio: solo ese negocio; al de la plataforma: todos', async () => {
    const tel = '526181112233';
    const { db, tablas } = fakeDb(base({ boost_contactos: [contacto({ telefono: tel }), contacto({ telefono: tel, tenant_id: 'T2' })] }));
    expect(await darDeBaja(db, `521${tel.slice(2)}`, 'T1', AHORA)).toBe(1);
    expect(tablas.boost_contactos.map((c) => Boolean(c.baja_at))).toEqual([true, false]);
    expect(await darDeBaja(db, tel, null, AHORA)).toBe(2);
  });

  it('el webhook marca la baja, confirma y no despierta al agente; después ya no le llegan avisos', async () => {
    const tel = '526181112233';
    const { db, tablas } = fakeDb(base({ boost_contactos: [contacto({ telefono: tel })], whatsapp_mensajes_procesados: [] }));
    const responder = vi.fn().mockResolvedValue({ ok: true });
    const r = await procesarMensaje({ id: 'w1', from: tel, timestamp: '1', type: 'text', texto: 'BAJA', phoneNumberId: 'pnid-plataforma' }, { db, enviar: responder });
    expect(r).toBe('baja');
    expect(responder).toHaveBeenCalledTimes(1);
    expect(tablas.boost_contactos[0].baja_at).toBeTruthy();

    const enviar = enviarOk();
    expect((await avisarHuecoLiberado(db, 'T1', HUECO, { ahora: AHORA, enviar })).avisadas).toBe(0);
    expect(enviar).not.toHaveBeenCalled();
  });
});

describe('resultados del panel', () => {
  it('cuenta huecos distintos, citas vivas, pesos recuperados y costo solo de lo enviado', async () => {
    const { resumirResultados } = await import('./reglas');
    const r = resumirResultados(
      [{ resource_id: 'R1', starts_at: 'a' }, { resource_id: 'R1', starts_at: 'a' }, { resource_id: 'R2', starts_at: 'a' }],
      [{ status: 'confirmed', boost_precio_cents: 24000 }, { status: 'completed', boost_precio_cents: 30000 }, { status: 'cancelled', boost_precio_cents: 30000 }],
      [{ tipo: 'vip', status: 'sent' }, { tipo: 'flojas', status: 'sent' }, { tipo: 'vip', status: 'skipped' }]
    );
    expect(r).toEqual({ huecosOfrecidos: 2, huecosLlenados: 2, recuperadoCents: 54000, mensajes: { vip: 1, flojas: 1 }, costoEstimadoMxn: 0.8 });
  });
});
