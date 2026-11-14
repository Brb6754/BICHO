import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firmaValida, igualSeguro } from '@/lib/whatsapp/firma';
import { fakeDb } from './fakeDb';
import { slugDelCodigo, agenteDisponible } from './ruteo';
import { extraerMensajes, procesarMensaje, type MensajeEntrante } from './procesar';
import { ejecutarHerramienta, type Contexto } from './herramientas';
import { recortarHistorial } from './agente';

// Graph API (enviar) y Claude (client) van siempre mockeados: nada sale a la red.

// `after` de Next solo funciona dentro de un request real: se captura.
const { pendientes } = vi.hoisted(() => ({ pendientes: [] as (() => Promise<void>)[] }));
vi.mock('next/server', async (orig) => ({
  ...(await orig<typeof import('next/server')>()),
  after: (fn: () => Promise<void>) => pendientes.push(fn),
}));

const PLATAFORMA = 'pnid-plataforma';
const TEL_A = '5216181234567'; // así lo manda Meta
const TEL_B = '5216189999999';
const manana = () => new Date(Date.now() + 86_400_000);

function tenants() {
  return [
    { id: 'T-A', slug: 'salon-a', name: 'Salón A', timezone: 'America/Mexico_City', plan: 'pro', agente_whatsapp_enabled: true, whatsapp_phone_number_id: null },
    { id: 'T-B', slug: 'barber-b', name: 'Barber B', timezone: 'America/Mexico_City', plan: 'pro', agente_whatsapp_enabled: true, whatsapp_phone_number_id: 'pnid-b' },
    { id: 'T-C', slug: 'spa-c', name: 'Spa C', timezone: 'America/Mexico_City', plan: 'negocio', agente_whatsapp_enabled: true, whatsapp_phone_number_id: null },
  ];
}

function msg(over: Partial<MensajeEntrante> = {}): MensajeEntrante {
  return { id: `wamid-${Math.random()}`, from: TEL_A, timestamp: '1', type: 'text', texto: 'Hola', phoneNumberId: PLATAFORMA, ...over };
}

function respuestaTexto(texto: string) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text: texto }] };
}

beforeEach(() => {
  process.env.WHATSAPP_PHONE_NUMBER_ID = PLATAFORMA;
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('firma X-Hub-Signature-256', () => {
  const secret = 'app-secret-de-prueba';
  const body = '{"entry":[]}';
  const firma = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  it('acepta la firma correcta sobre el body crudo', () => {
    expect(firmaValida(body, firma, secret)).toBe(true);
  });
  it('rechaza firma alterada, body alterado, sin header o sin secreto', () => {
    expect(firmaValida(body, firma.replace(/.$/, (c) => (c === '0' ? '1' : '0')), secret)).toBe(false);
    expect(firmaValida(body + ' ', firma, secret)).toBe(false);
    expect(firmaValida(body, null, secret)).toBe(false);
    expect(firmaValida(body, firma, undefined)).toBe(false);
    expect(firmaValida(body, 'sha256=corta', secret)).toBe(false);
  });
  it('verify token en tiempo constante', () => {
    expect(igualSeguro('abc', 'abc')).toBe(true);
    expect(igualSeguro('abc', 'abd')).toBe(false);
    expect(igualSeguro(null, 'abc')).toBe(false);
    expect(igualSeguro('abc', undefined)).toBe(false);
  });
});

describe('webhook route', () => {

  it('POST con firma inválida → 401 y no agenda nada; válida → 200', async () => {
    process.env.WHATSAPP_APP_SECRET = 's3cr3t';
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const body = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: PLATAFORMA }, messages: [{ id: 'w1', from: TEL_A, type: 'text', text: { body: 'hola' } }] } }] }] });
    const mala = await POST(new Request('http://x/api/webhooks/whatsapp', { method: 'POST', body, headers: { 'x-hub-signature-256': 'sha256=00' } }));
    expect(mala.status).toBe(401);
    expect(pendientes).toHaveLength(0);

    const firma = 'sha256=' + createHmac('sha256', 's3cr3t').update(body).digest('hex');
    const buena = await POST(new Request('http://x/api/webhooks/whatsapp', { method: 'POST', body, headers: { 'x-hub-signature-256': firma } }));
    expect(buena.status).toBe(200);
    expect(pendientes).toHaveLength(1); // el agente corre después de responder
  });

  it('GET verifica hub.verify_token', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'tok';
    const { GET } = await import('@/app/api/webhooks/whatsapp/route');
    const ok = await GET(new Request('http://x/?hub.mode=subscribe&hub.verify_token=tok&hub.challenge=123'));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('123');
    expect((await GET(new Request('http://x/?hub.mode=subscribe&hub.verify_token=no&hub.challenge=123'))).status).toBe(403);
  });
});

describe('extraerMensajes', () => {
  it('saca id/from/texto e ignora estados de entrega', () => {
    const out = extraerMensajes({
      entry: [{ changes: [{ value: { metadata: { phone_number_id: 'p' }, statuses: [{ id: 's' }], messages: [{ id: 'm1', from: '+52 1 618', type: 'text', timestamp: '9', text: { body: 'hola' } }, { id: 'm2', from: '52', type: 'image' }] } }] }],
    });
    expect(out).toEqual([
      { id: 'm1', from: '521618', timestamp: '9', type: 'text', texto: 'hola', phoneNumberId: 'p' },
      { id: 'm2', from: '52', timestamp: '', type: 'image', texto: null, phoneNumberId: 'p' },
    ]);
    expect(extraerMensajes({ basura: true })).toEqual([]);
  });
});

describe('dedup', () => {
  it('el mismo id de WhatsApp se procesa una sola vez', async () => {
    const { db } = fakeDb({ tenants: tenants() }, { unicas: { whatsapp_mensajes_procesados: ['wamid'] } });
    const enviar = vi.fn().mockResolvedValue({ ok: true });
    const client = { messages: { create: vi.fn().mockResolvedValue(respuestaTexto('¡Hola!')) } };
    const m = msg({ id: 'wamid-fijo', texto: 'Hola salon-a' });
    expect(await procesarMensaje(m, { db, enviar, client: client as never })).toBe('respondido');
    expect(await procesarMensaje(m, { db, enviar, client: client as never })).toBe('duplicado');
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });
});

describe('ruteo multi-tenant', () => {
  it('lee el código "Hola <slug>"', () => {
    expect(slugDelCodigo('Hola salon-a')).toBe('salon-a');
    expect(slugDelCodigo('  hola   Salon-A, quiero cita')).toBe('salon-a');
    expect(slugDelCodigo('Buenas tardes')).toBeNull();
    expect(slugDelCodigo(null)).toBeNull();
  });

  it('plataforma: código → negocio; sin código → conversación previa; nada → pregunta', async () => {
    const { db, tablas } = fakeDb({ tenants: tenants() }, { unicas: { whatsapp_mensajes_procesados: ['wamid'] } });
    const enviar = vi.fn().mockResolvedValue({ ok: true });
    const client = { messages: { create: vi.fn().mockResolvedValue(respuestaTexto('Claro')) } };

    // Otro teléfono sin código ni historia → se le pregunta el negocio, sin Claude.
    expect(await procesarMensaje(msg({ from: TEL_B, texto: 'quiero una cita' }), { db, enviar, client: client as never })).toBe('sin_resolver');
    expect(client.messages.create).not.toHaveBeenCalled();

    expect(await procesarMensaje(msg({ texto: 'Hola salon-a' }), { db, enviar, client: client as never })).toBe('respondido');
    expect(tablas.whatsapp_conversaciones).toHaveLength(1);
    expect(tablas.whatsapp_conversaciones[0]).toMatchObject({ tenant_id: 'T-A', telefono: TEL_A, phone_number_id: PLATAFORMA });

    // Segundo mensaje sin código: sigue en el mismo negocio.
    expect(await procesarMensaje(msg({ texto: '¿mañana a las 5?' }), { db, enviar, client: client as never })).toBe('respondido');
    expect(tablas.whatsapp_conversaciones).toHaveLength(1);
    expect((tablas.whatsapp_conversaciones[0].historial as unknown[]).length).toBe(4);
  });

  it('número propio de un negocio rutea a ese negocio aunque el texto traiga otro código', async () => {
    const { db, tablas } = fakeDb({ tenants: tenants() }, { unicas: { whatsapp_mensajes_procesados: ['wamid'] } });
    const client = { messages: { create: vi.fn().mockResolvedValue(respuestaTexto('Hola')) } };
    await procesarMensaje(msg({ phoneNumberId: 'pnid-b', texto: 'Hola salon-a' }), { db, enviar: vi.fn().mockResolvedValue({ ok: true }), client: client as never });
    expect(tablas.whatsapp_conversaciones[0].tenant_id).toBe('T-B');
  });

  it('número desconocido se ignora; plan sin Pro no usa la IA', async () => {
    const { db } = fakeDb({ tenants: tenants() }, { unicas: { whatsapp_mensajes_procesados: ['wamid'] } });
    const enviar = vi.fn().mockResolvedValue({ ok: true });
    const client = { messages: { create: vi.fn() } };
    expect(await procesarMensaje(msg({ phoneNumberId: 'otro' }), { db, enviar, client: client as never })).toBe('ignorado');
    expect(await procesarMensaje(msg({ texto: 'Hola spa-c' }), { db, enviar, client: client as never })).toBe('agente_apagado');
    expect(client.messages.create).not.toHaveBeenCalled();
    expect(agenteDisponible({ plan: 'pro', agente_whatsapp_enabled: false })).toBe(false);
    expect(agenteDisponible({ plan: null, agente_whatsapp_enabled: true })).toBe(false);
  });

  it('en modo humano la IA no contesta, pero el mensaje queda en el historial', async () => {
    const { db, tablas } = fakeDb(
      {
        tenants: tenants(),
        whatsapp_conversaciones: [{ id: 'C1', tenant_id: 'T-A', telefono: TEL_A, phone_number_id: PLATAFORMA, estado: 'humano', historial: [] }],
      },
      { unicas: { whatsapp_mensajes_procesados: ['wamid'] } }
    );
    const enviar = vi.fn();
    const client = { messages: { create: vi.fn() } };
    expect(await procesarMensaje(msg({ texto: 'hola?' }), { db, enviar, client: client as never })).toBe('humano');
    expect(client.messages.create).not.toHaveBeenCalled();
    expect(enviar).not.toHaveBeenCalled();
    expect(tablas.whatsapp_conversaciones[0].historial).toHaveLength(1);
  });
});

describe('aislamiento entre teléfonos y negocios', () => {
  const futuro = manana().toISOString();
  function mundo() {
    return fakeDb({
      tenants: tenants(),
      bookings: [
        { id: 'A-mia', tenant_id: 'T-A', status: 'confirmed', starts_at: futuro, customers: { phone: '618 123 4567' }, service_types: { name: 'Corte' } },
        { id: 'A-otro-tel', tenant_id: 'T-A', status: 'confirmed', starts_at: futuro, customers: { phone: '6189999999' }, service_types: { name: 'Tinte' } },
        { id: 'B-mismo-tel', tenant_id: 'T-B', status: 'confirmed', starts_at: futuro, customers: { phone: TEL_A }, service_types: { name: 'Barba' } },
      ],
    });
  }
  const ctx = (db: Contexto['db']): Contexto => ({ db, tenantId: 'T-A', slug: 'salon-a', timezone: 'America/Mexico_City', telefono: TEL_A, conversacionId: 'C1' });

  it('ver_mi_cita solo trae citas de ESTE teléfono en ESTE negocio', async () => {
    const { db } = mundo();
    const citas = (await ejecutarHerramienta(ctx(db), 'ver_mi_cita', {})) as { cita_id: string }[];
    expect(citas.map((c) => c.cita_id)).toEqual(['A-mia']);
  });

  it('cancelar_cita no toca citas de otro teléfono ni de otro negocio', async () => {
    const { db, tablas } = mundo();
    await expect(ejecutarHerramienta(ctx(db), 'cancelar_cita', { cita_id: 'A-otro-tel' })).rejects.toThrow();
    await expect(ejecutarHerramienta(ctx(db), 'cancelar_cita', { cita_id: 'B-mismo-tel' })).rejects.toThrow();
    expect(tablas.bookings.every((b) => b.status === 'confirmed')).toBe(true);

    await expect(ejecutarHerramienta(ctx(db), 'cancelar_cita', { cita_id: 'A-mia' })).resolves.toEqual({ cancelada: true });
    expect(tablas.bookings.find((b) => b.id === 'A-mia')!.status).toBe('cancelled');
    expect(tablas.bookings.filter((b) => b.status === 'cancelled')).toHaveLength(1);
  });

  it('ver_servicios no lista servicios de otro negocio', async () => {
    const { db } = fakeDb({
      service_types: [
        { id: 's-a', tenant_id: 'T-A', active: true, name: 'Corte', duration_minutes: 30, price_cents: 25000 },
        { id: 's-b', tenant_id: 'T-B', active: true, name: 'Secreto', duration_minutes: 30, price_cents: 1 },
      ],
    });
    expect(await ejecutarHerramienta(ctx(db), 'ver_servicios', {})).toEqual([{ id: 's-a', servicio: 'Corte', duracion_min: 30, precio: '$250' }]);
    await expect(ejecutarHerramienta(ctx(db), 'ver_disponibilidad', { servicio: 's-b', fecha: '2099-01-01' })).rejects.toThrow();
  });
});

describe('flujo de agendar (Claude y Graph mockeados)', () => {
  it('servicios → disponibilidad → crear_cita con el teléfono del remitente', async () => {
    const inicio = new Date(manana().setUTCHours(17, 0, 0, 0)).toISOString();
    const fin = new Date(new Date(inicio).getTime() + 30 * 60_000).toISOString();
    const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date(inicio));
    const { db, tablas, llamadas } = fakeDb(
      {
        tenants: tenants(),
        service_types: [{ id: 's-a', tenant_id: 'T-A', active: true, name: 'Corte', duration_minutes: 30, price_cents: 25000 }],
        resources: [{ id: 'r-a', tenant_id: 'T-A', active: true }, { id: 'r-b', tenant_id: 'T-B', active: true }],
      },
      {
        unicas: { whatsapp_mensajes_procesados: ['wamid'] },
        rpc: {
          get_available_slots: (a) => ({ data: a.p_resource_id === 'r-a' ? [{ slot_start: inicio, slot_end: fin }] : [] }),
          create_booking: () => ({ data: 'booking-1' }),
        },
      }
    );
    const tool = (name: string, input: object) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `tu-${name}`, name, input }] });
    const create = vi
      .fn()
      .mockResolvedValueOnce(tool('ver_servicios', {}))
      .mockResolvedValueOnce(tool('ver_disponibilidad', { servicio: 'Corte', fecha }))
      .mockResolvedValueOnce(tool('crear_cita', { servicio: 'Corte', inicio, nombre: 'Daniela' }))
      .mockResolvedValueOnce(respuestaTexto('Listo, Daniela, quedó tu cita.'));
    const enviar = vi.fn().mockResolvedValue({ ok: true });

    const r = await procesarMensaje(msg({ texto: 'Hola salon-a, un corte mañana a las 11' }), { db, enviar, client: { messages: { create } } as never });
    expect(r).toBe('respondido');

    const reserva = llamadas.find((l) => l.rpc === 'create_booking')!;
    expect(reserva.args).toMatchObject({
      p_tenant_id: 'T-A',
      p_resource_id: 'r-a',
      p_service_type_id: 's-a',
      p_starts_at: inicio,
      p_ends_at: fin,
      p_customer_name: 'Daniela',
      p_customer_phone: '6181234567',
    });
    // Los resultados de herramientas regresan a Claude como tool_result.
    // (El arreglo es el mismo objeto que después recibió la respuesta final: el tool_result es el penúltimo.)
    const ultimaLlamada = create.mock.calls[3][0];
    const resultado = ultimaLlamada.messages.at(-2).content[0];
    expect(resultado).toMatchObject({ type: 'tool_result', tool_use_id: 'tu-crear_cita' });
    expect(JSON.parse(resultado.content).cita_id).toBe('booking-1');
    expect(ultimaLlamada.model).toBe('claude-haiku-5-5');

    expect(enviar).toHaveBeenCalledWith(PLATAFORMA, TEL_A, 'Listo, Daniela, quedó tu cita.');
    expect(tablas.whatsapp_conversaciones[0].historial).toHaveLength(2);
  });

  it('una hora que no está libre no se agenda', async () => {
    const { db, llamadas } = fakeDb(
      {
        service_types: [{ id: 's-a', tenant_id: 'T-A', active: true, name: 'Corte', duration_minutes: 30, price_cents: 0 }],
        resources: [{ id: 'r-a', tenant_id: 'T-A', active: true }],
      },
      { rpc: { get_available_slots: () => ({ data: [] }) } }
    );
    const ctx: Contexto = { db, tenantId: 'T-A', slug: 'salon-a', timezone: 'America/Mexico_City', telefono: TEL_A, conversacionId: 'C1' };
    await expect(ejecutarHerramienta(ctx, 'crear_cita', { servicio: 'Corte', inicio: manana().toISOString(), nombre: 'X' })).rejects.toThrow(/no está libre/);
    expect(llamadas.some((l) => l.rpc === 'create_booking')).toBe(false);
  });

  it('el historial que ve el modelo empieza con el cliente y se acota', () => {
    const h = Array.from({ length: 15 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: String(i) }));
    const r = recortarHistorial(h, 10);
    expect(r[0].role).toBe('user');
    expect(r.length).toBeLessThanOrEqual(10);
    expect(r.at(-1)!.content).toBe('14');
  });
});
