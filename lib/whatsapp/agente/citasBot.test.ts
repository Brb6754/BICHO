import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from './fakeDb';
import { extraerMensajes, procesarMensaje, type MensajeEntrante } from './procesar';
import { armarId, leerId, paginar, quiereAgendar } from './flujoCita';
import { correrCronCitas } from './avisos';
import { ejecutarHerramienta } from './herramientas';
import { cuerpoInteractivo, enviarInteractivo, enviarPlantillaConBotones, type Saliente } from '@/lib/whatsapp/interactivo';

// Bot de citas con botones + anticipo. Meta (Graph) y Claude van mockeados; nada sale a la red.

type Row = Record<string, unknown>;
const TZ = 'America/Mexico_City';
const AHORA = new Date('2026-11-18T18:00:00.000Z'); // 12:00 en CDMX
const PLATAFORMA = 'pnid-plataforma';
const TEL = '5216181234567';
const MANANA = '2026-11-19';

function tenant(over: Row = {}): Row {
  return { id: 'T-A', slug: 'salon-a', name: 'Salón A', timezone: TZ, plan: 'pro', agente_whatsapp_enabled: true, whatsapp_phone_number_id: null, ...over };
}

// Slots diarios 17:00Z y 18:00Z (11:00 y 12:00 locales) por recurso; r-2 además 19:00Z.
// Un slot ocupado por una cita viva de ese recurso no se ofrece.
function mundo(opts: { anticipo?: boolean; recursos?: 1 | 2; bookings?: Row[]; tenantOver?: Row; conversacion?: boolean } = {}) {
  const tablas: Record<string, Row[]> = {
    // La deja registrarEnConversacion al mandar la plantilla: así el botón rutea a este negocio.
    whatsapp_conversaciones: opts.conversacion
      ? [{ id: 'C1', tenant_id: 'T-A', telefono: TEL, phone_number_id: PLATAFORMA, estado: 'ia', historial: [], last_message_at: '2026-11-18T10:00:00.000Z' }]
      : [],
    tenants: [
      tenant({ ...(opts.anticipo ? { anticipo_enabled: true, anticipo_mxn: 150, anticipo_apartado_min: 20, anticipo_reagendar_horas: 24 } : {}), ...opts.tenantOver }),
      tenant({ id: 'T-B', slug: 'otro', name: 'Otro', whatsapp_phone_number_id: 'pnid-b' }),
    ],
    service_types: [
      { id: 's-a', tenant_id: 'T-A', active: true, name: 'Corte', duration_minutes: 30, price_cents: 25000 },
      { id: 's-b', tenant_id: 'T-B', active: true, name: 'Ajeno', duration_minutes: 30, price_cents: 100 },
    ],
    resources: [
      { id: 'r-1', tenant_id: 'T-A', active: true, name: 'Ana' },
      ...(opts.recursos === 2 ? [{ id: 'r-2', tenant_id: 'T-A', active: true, name: 'Luis' }] : []),
      { id: 'r-b', tenant_id: 'T-B', active: true, name: 'Ajena' },
    ],
    bookings: opts.bookings ?? [],
  };
  const slots = (resourceId: string, desde: string, hasta: string) => {
    const out: { slot_start: string; slot_end: string }[] = [];
    for (let d = desde; d <= hasta; d = new Date(Date.parse(`${d}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) {
      for (const h of ['17', '18', ...(resourceId === 'r-2' ? ['19'] : [])]) {
        const ini = `${d}T${h}:00:00.000Z`;
        const ocupado = tablas.bookings.some((b) => b.resource_id === resourceId && b.status !== 'cancelled' && b.starts_at === ini);
        if (!ocupado) out.push({ slot_start: ini, slot_end: `${d}T${h}:30:00.000Z` });
      }
    }
    return out;
  };
  return fakeDb(tablas, {
    unicas: { whatsapp_mensajes_procesados: ['wamid'] },
    rpc: {
      get_available_slots: (a) => ({ data: slots(String(a.p_resource_id), String(a.p_from), String(a.p_to)) }),
      create_booking: (a) => {
        const id = `b-${tablas.bookings.length + 1}`;
        tablas.bookings.push({
          id,
          tenant_id: a.p_tenant_id,
          resource_id: a.p_resource_id,
          service_type_id: a.p_service_type_id,
          starts_at: a.p_starts_at,
          ends_at: a.p_ends_at,
          status: 'confirmed',
          customers: { name: a.p_customer_name, phone: a.p_customer_phone },
        });
        return { data: id };
      },
    },
  });
}

function crearMeta() {
  const enviar = vi.fn().mockResolvedValue({ ok: true });
  const interactivo = vi.fn().mockResolvedValue({ ok: true });
  const plantilla = vi.fn().mockResolvedValue({ ok: true });
  const client = { messages: { create: vi.fn() } };
  /** La lista/botones más recientes mandados. */
  const ultimo = () => interactivo.mock.calls.at(-1)![2] as Exclude<Saliente, { tipo: 'texto' }>;
  const opciones = () => {
    const s = ultimo();
    return s.tipo === 'lista' ? s.filas : s.botones;
  };
  const textos = () => enviar.mock.calls.map((c) => String(c[2]));
  return { enviar, interactivo, plantilla, client, ultimo, opciones, textos };
}

let n = 0;
function msg(over: Partial<MensajeEntrante> = {}): MensajeEntrante {
  return { id: `wamid-${++n}`, from: TEL, timestamp: '1', type: 'text', texto: 'Hola salon-a', phoneNumberId: PLATAFORMA, ...over };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AHORA);
  process.env.WHATSAPP_PHONE_NUMBER_ID = PLATAFORMA;
  process.env.WHATSAPP_ACCESS_TOKEN = 'token-de-prueba';
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const k of ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_TEMPLATE_RECORDATORIO', 'WHATSAPP_TEMPLATE_SEGUIMIENTO', 'WHATSAPP_TEMPLATE_APARTADO_VENCIDO']) delete process.env[k];
});

/** Procesa un mensaje y, si se pide, elige la opción con ese título de la última lista. */
async function elegir(w: ReturnType<typeof mundo>, meta: ReturnType<typeof crearMeta>, titulo: string, over: Partial<MensajeEntrante> = {}) {
  const op = meta.opciones().find((o) => o.titulo === titulo);
  if (!op) throw new Error(`No hay opción "${titulo}": ${meta.opciones().map((o) => o.titulo).join(', ')}`);
  return procesarMensaje(msg({ type: 'interactive', texto: titulo, opcion: op.id, ...over }), { db: w.db, ...meta, client: meta.client as never });
}

describe('ids de opción', () => {
  it('ida y vuelta, y rechaza lo que no sigue la gramática', () => {
    const o = { a: 'c' as const, s: 's-a', r: '*', t: '2026-11-19T17:00:00.000Z' };
    expect(leerId(armarId(o))).toEqual(o);
    expect(leerId('ok|b=b-1')).toEqual({ a: 'ok', b: 'b-1' });
    for (const malo of ['x|s=1', 'c|s=a|x=1', 'c|s=a b', 'c|s=a|s=b', 'ok', 'rg|b=1|s=2', 'c|b=1', 'c|t=mañana', 'c|d=2026-1-1', `c|s=${'a'.repeat(300)}`, '']) {
      expect(leerId(malo)).toBeNull();
    }
  });

  it('paginar deja 9 + "Ver más" cuando hay más de 10', () => {
    const filas = Array.from({ length: 15 }, (_, i) => ({ id: `x${i}`, titulo: `${i}` }));
    expect(paginar(filas, 0, (o) => `m${o}`).map((f) => f.id)).toEqual([...filas.slice(0, 9).map((f) => f.id), 'm9']);
    expect(paginar(filas, 9, (o) => `m${o}`)).toHaveLength(6);
  });

  it('quiereAgendar solo con intención clara de agendar', () => {
    expect(quiereAgendar('Quiero una cita')).toBe(true);
    expect(quiereAgendar('agendar')).toBe(true);
    expect(quiereAgendar('quiero cancelar mi cita')).toBe(false);
    expect(quiereAgendar('¿cuánto cuesta una cita?')).toBe(false);
    expect(quiereAgendar('hola')).toBe(false);
  });
});

describe('mensajes interactivos (Graph mockeado)', () => {
  it('respeta los límites de Meta: 10 filas, títulos 24, descripción 72, botón 20, 3 botones de 20', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const filas = Array.from({ length: 12 }, (_, i) => ({ id: `f${i}`, titulo: 'T'.repeat(40), descripcion: 'D'.repeat(100) }));
    await enviarInteractivo('pn', '52618', { tipo: 'lista', texto: 'Elige', boton: 'Un botón muy largo para Meta', filas });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '52618', type: 'interactive' });
    const rows = body.interactive.action.sections[0].rows;
    expect(rows).toHaveLength(10);
    expect(rows.every((r: { title: string; description: string }) => r.title.length <= 24 && r.description.length <= 72)).toBe(true);
    expect(body.interactive.action.button.length).toBeLessThanOrEqual(20);

    const b = cuerpoInteractivo({ tipo: 'botones', texto: 'x', botones: [1, 2, 3, 4].map((i) => ({ id: `b${i}`, titulo: 'Un título demasiado largo' })) });
    const botones = (b.action as { buttons: { reply: { title: string } }[] }).buttons;
    expect(botones).toHaveLength(3);
    expect(botones.every((x) => x.reply.title.length <= 20)).toBe(true);

    await enviarPlantillaConBotones('pn', '52618', 'recordatorio_cita', ['Ana'], ['ok|b=1', 'rg|b=1']);
    const tpl = JSON.parse(fetch.mock.calls[1][1].body).template;
    expect(tpl.components[1]).toEqual({ type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'ok|b=1' }] });
    expect(tpl.components[2].index).toBe('1');
    vi.unstubAllGlobals();
  });

  it('extraerMensajes lee list_reply, button_reply, button de plantilla y el nombre del perfil', () => {
    const out = extraerMensajes({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'p' },
                contacts: [{ wa_id: TEL, profile: { name: 'Daniela' } }],
                messages: [
                  { id: 'm1', from: TEL, type: 'interactive', interactive: { type: 'list_reply', list_reply: { id: 'c|s=s-a', title: 'Corte' } } },
                  { id: 'm2', from: TEL, type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'c', title: 'Buscar otro' } } },
                  { id: 'm3', from: TEL, type: 'button', button: { payload: 'ok|b=b-1', text: 'Confirmo' } },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(out.map((m) => [m.opcion, m.texto, m.nombrePerfil])).toEqual([
      ['c|s=s-a', 'Corte', 'Daniela'],
      ['c', 'Buscar otro', 'Daniela'],
      ['ok|b=b-1', 'Confirmo', 'Daniela'],
    ]);
  });
});

describe('flujo guiado de cita', () => {
  it('un recurso, sin anticipo: servicio → día → hora → confirmada, sin pasar por Claude', async () => {
    const w = mundo();
    const meta = crearMeta();
    expect(await procesarMensaje(msg({ texto: 'Hola salon-a, quiero una cita' }), { db: w.db, ...meta, client: meta.client as never })).toBe('respondido');
    expect(meta.opciones().map((o) => o.titulo)).toEqual(['Corte']);
    expect(meta.opciones()[0].descripcion).toBe('30 min · $250');

    await elegir(w, meta, 'Corte'); // un solo recurso: salta "¿con quién?"
    expect(meta.ultimo().texto).toMatch(/qué día/i);
    await elegir(w, meta, 'Mañana');
    expect(meta.opciones().map((o) => o.titulo)).toEqual(['11:00', '12:00']);
    await elegir(w, meta, '12:00', { nombrePerfil: 'Daniela' });

    expect(meta.client.messages.create).not.toHaveBeenCalled();
    expect(w.tablas.bookings).toHaveLength(1);
    expect(w.tablas.bookings[0]).toMatchObject({ tenant_id: 'T-A', resource_id: 'r-1', starts_at: `${MANANA}T18:00:00.000Z` });
    expect(w.tablas.bookings[0].deposit_status).toBeUndefined();
    expect(meta.textos().at(-1)).toMatch(/^¡Listo, Daniela! Quedó tu cita: Corte, Jueves 19 de noviembre, 12:00\./);
  });

  it('varios recursos, con anticipo y sin link: pide el nombre, aparta y explica el pago', async () => {
    const w = mundo({ anticipo: true, recursos: 2 });
    const meta = crearMeta();
    await procesarMensaje(msg({ texto: 'Hola salon-a, agendar' }), { db: w.db, ...meta, client: meta.client as never });
    expect(meta.opciones()[0].descripcion).toBe('30 min · $250 · anticipo $150');
    await elegir(w, meta, 'Corte');
    expect(meta.opciones().map((o) => o.titulo)).toEqual(['Cualquiera disponible', 'Ana', 'Luis']);
    await elegir(w, meta, 'Luis');
    await elegir(w, meta, 'Mañana');
    expect(meta.opciones().map((o) => o.titulo)).toEqual(['11:00', '12:00', '13:00']);
    await elegir(w, meta, '13:00');
    expect(meta.textos().at(-1)).toBe('¿A nombre de quién agendo la cita?');
    expect(w.tablas.bookings).toHaveLength(0);

    await procesarMensaje(msg({ texto: 'Daniela Ruiz' }), { db: w.db, ...meta, client: meta.client as never });
    expect(w.tablas.bookings).toHaveLength(1);
    expect(w.tablas.bookings[0]).toMatchObject({ resource_id: 'r-2', deposit_status: 'pending', deposit_mxn: 150 });
    const final = meta.textos().at(-1)!;
    expect(final).toContain('Te aparté Corte el Jueves 19 de noviembre, 13:00');
    expect(final).toContain('anticipo de $150');
    expect(final).toContain('20 minutos (hasta las 12:20)');
    expect(final).toContain('El negocio te compartirá por aquí cómo pagarlo.');
    expect(meta.client.messages.create).not.toHaveBeenCalled();
  });

  it('con anticipo, sin link y con instrucciones del negocio (db/062): manda las instrucciones', async () => {
    const instr = 'Transferencia a la CLABE 0123 a nombre de Ana López.';
    const w = mundo({ anticipo: true, tenantOver: { anticipo_instrucciones: instr } });
    const meta = crearMeta();
    await procesarMensaje(msg({ texto: 'Hola salon-a, agendar' }), { db: w.db, ...meta, client: meta.client as never });
    await elegir(w, meta, 'Corte');
    await elegir(w, meta, 'Mañana');
    await elegir(w, meta, '12:00', { nombrePerfil: 'Daniela' });
    const final = meta.textos().at(-1)!;
    expect(final).toContain(`Para pagarlo: ${instr}`);
    expect(final).not.toContain('El negocio te compartirá');
  });

  it('crear_cita de la IA sin link: pasa las instrucciones del negocio en si_no_hay_link', async () => {
    const instr = 'Efectivo en el local o transferencia a la CLABE 0123.';
    const w = mundo({ anticipo: true, tenantOver: { anticipo_instrucciones: instr } });
    const ctx = { db: w.db, tenantId: 'T-A', slug: 'salon-a', timezone: TZ, telefono: TEL, conversacionId: 'C1' };
    const r = (await ejecutarHerramienta(ctx, 'crear_cita', { servicio: 'Corte', inicio: `${MANANA}T17:00:00.000Z`, nombre: 'Daniela' })) as Record<string, unknown>;
    expect(r).toMatchObject({ requiere_anticipo: true, link_de_pago: null });
    expect(String(r.si_no_hay_link)).toContain(instr);

    // Sin instrucciones: la frase genérica de siempre.
    const w2 = mundo({ anticipo: true });
    const r2 = (await ejecutarHerramienta({ ...ctx, db: w2.db }, 'crear_cita', { servicio: 'Corte', inicio: `${MANANA}T17:00:00.000Z`, nombre: 'Daniela' })) as Record<string, unknown>;
    expect(r2.si_no_hay_link).toBe('El negocio le compartirá por aquí cómo pagar el anticipo.');
  });

  it('con anticipo y link de pago: "Cualquiera disponible" elige un recurso libre y manda el link', async () => {
    const w = mundo({ anticipo: true, recursos: 2 });
    const meta = crearMeta();
    const linkAnticipo = vi.fn().mockResolvedValue({ url: 'https://pago.test/abc', referencia: 'ref' });
    const deps = { db: w.db, ...meta, client: meta.client as never, linkAnticipo };
    await procesarMensaje(msg({ texto: 'Hola salon-a quiero cita' }), deps);
    for (const t of ['Corte', 'Cualquiera disponible', 'Mañana']) {
      const op = meta.opciones().find((o) => o.titulo === t)!;
      await procesarMensaje(msg({ type: 'interactive', texto: t, opcion: op.id }), deps);
    }
    // La unión de horarios sin repetir la hora que tienen los dos.
    expect(meta.opciones().map((o) => o.titulo)).toEqual(['11:00', '12:00', '13:00']);
    const op = meta.opciones().find((o) => o.titulo === '11:00')!;
    await procesarMensaje(msg({ type: 'interactive', texto: '11:00', opcion: op.id, nombrePerfil: 'Daniela' }), deps);
    expect(w.tablas.bookings[0]).toMatchObject({ starts_at: `${MANANA}T17:00:00.000Z`, deposit_status: 'pending' });
    expect(linkAnticipo).toHaveBeenCalledWith(w.db, expect.objectContaining({ tenantId: 'T-A', bookingId: 'b-1', montoMxn: 150 }));
    expect(meta.textos().at(-1)).toContain('Págalo aquí: https://pago.test/abc');
  });

  it('un id manipulado (servicio o recurso de otro negocio, hora inventada, basura) no agenda nada', async () => {
    const w = mundo({ recursos: 2 });
    const meta = crearMeta();
    const deps = { db: w.db, ...meta, client: meta.client as never };
    await procesarMensaje(msg({ texto: 'Hola salon-a' }), { ...deps, client: { messages: { create: vi.fn().mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hola' }] }) } } as never });

    for (const opcion of ['c|s=s-b', 'c|s=s-a|r=r-b', 'c|s=s-a|r=r-b|t=2026-11-19T17:00:00.000Z', 'c|s=s-a|x=1', "c|s=s-a'; drop"]) {
      await procesarMensaje(msg({ type: 'interactive', texto: '?', opcion, nombrePerfil: 'X' }), deps);
      expect(meta.textos().at(-1)).toBe('Esa opción ya no está disponible. Te mando las opciones de nuevo.');
      expect(meta.opciones().map((o) => o.titulo)).toEqual(['Corte']);
    }
    // Hora con formato válido pero que no es un hueco libre real.
    await procesarMensaje(msg({ type: 'interactive', texto: '?', opcion: 'c|s=s-a|r=r-1|t=2026-11-19T20:00:00.000Z', nombrePerfil: 'X' }), deps);
    expect(meta.textos().at(-1)).toBe('Ese horario se acaba de ocupar. Estos siguen libres:');
    expect(w.tablas.bookings).toHaveLength(0);
    expect(w.llamadas.some((l) => l.rpc === 'create_booking')).toBe(false);
  });

  it('crear_cita del agente aparta con anticipo y se lo dice al modelo', async () => {
    const w = mundo({ anticipo: true });
    const meta = crearMeta();
    const inicio = `${MANANA}T17:00:00.000Z`;
    const tool = (name: string, input: object) => ({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: `tu-${name}`, name, input }] });
    meta.client.messages.create
      .mockResolvedValueOnce(tool('crear_cita', { servicio: 'Corte', inicio, nombre: 'Daniela' }))
      .mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Te aparté la cita' }] });
    await procesarMensaje(msg({ texto: 'Hola salon-a, corte mañana 11 a nombre de Daniela' }), { db: w.db, ...meta, client: meta.client as never });
    const resultado = JSON.parse(meta.client.messages.create.mock.calls[1][0].messages.at(-2).content[0].content);
    expect(resultado).toMatchObject({ requiere_anticipo: true, anticipo_mxn: 150, apartada_hasta: '12:20', link_de_pago: null });
    expect(w.tablas.bookings[0].deposit_status).toBe('pending');
  });

  it('la herramienta mostrar_menu_citas manda la lista después de la respuesta del agente', async () => {
    const w = mundo();
    const meta = crearMeta();
    meta.client.messages.create
      .mockResolvedValueOnce({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu-1', name: 'mostrar_menu_citas', input: {} }] })
      .mockResolvedValueOnce({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Claro, te paso las opciones.' }] });
    await procesarMensaje(msg({ texto: 'Hola salon-a, me gustaría ir esta semana' }), { db: w.db, ...meta, client: meta.client as never });
    expect(meta.textos()).toEqual(['Claro, te paso las opciones.']);
    expect(meta.opciones().map((o) => o.titulo)).toEqual(['Corte']);
  });
});

describe('barrido perezoso', () => {
  it('al llegar un mensaje libera el apartado vencido y le avisa a esa clienta con botón', async () => {
    const w = mundo({
      anticipo: true,
      bookings: [
        {
          id: 'b-vieja',
          tenant_id: 'T-A',
          resource_id: 'r-1',
          status: 'confirmed',
          deposit_status: 'pending',
          hold_expires_at: '2026-11-18T17:30:00.000Z',
          starts_at: `${MANANA}T17:00:00.000Z`,
          customers: { name: 'Ana López', phone: '618 555 0000' },
          service_types: { name: 'Corte' },
        },
      ],
    });
    const meta = crearMeta();
    await procesarMensaje(msg({ texto: 'Hola salon-a, quiero una cita' }), { db: w.db, ...meta, client: meta.client as never });
    expect(w.tablas.bookings[0]).toMatchObject({ status: 'cancelled', deposit_status: 'released' });
    const aviso = meta.interactivo.mock.calls.find((c) => c[1] === '526185550000')!;
    expect(aviso[2].tipo).toBe('botones');
    expect(aviso[2].texto).toContain('Ana, el horario que te apartamos en Salón A (Corte, Jueves 19 de noviembre, 11:00) se liberó');
    expect(aviso[2].botones[0]).toEqual({ id: 'c', titulo: 'Buscar otro horario' });
    expect(w.tablas.whatsapp_messages).toEqual([expect.objectContaining({ kind: 'cancelled', status: 'sent', booking_id: 'b-vieja', to_phone: '526185550000' })]);
    // Queda en su conversación (así su respuesta al botón llega a este negocio).
    expect(w.tablas.whatsapp_conversaciones.some((c) => c.telefono === '526185550000' && c.tenant_id === 'T-A')).toBe(true);
    // El horario liberado vuelve a ofrecerse a quien escribió.
    const corte = meta.opciones().find((o) => o.titulo === 'Corte');
    expect(corte).toBeTruthy();
  });

  it('si Meta rechaza el botón (fuera de 24 h), cae a la plantilla; sin plantilla queda skipped', async () => {
    const w = mundo({
      bookings: [
        { id: 'b-v', tenant_id: 'T-A', status: 'confirmed', deposit_status: 'pending', hold_expires_at: '2026-11-18T17:00:00.000Z', starts_at: `${MANANA}T17:00:00.000Z`, customers: { name: 'Ana', phone: '6185550000' }, service_types: { name: 'Corte' } },
      ],
    });
    const meta = crearMeta();
    meta.interactivo.mockResolvedValue({ ok: false, error: 'Re-engagement message' });
    await procesarMensaje(msg({ texto: 'Hola salon-a' }), { db: w.db, ...meta, client: { messages: { create: vi.fn().mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hola' }] }) } } as never });
    expect(meta.plantilla).not.toHaveBeenCalled();
    expect(w.tablas.whatsapp_messages[0]).toMatchObject({ status: 'skipped', error: 'Falta la plantilla WHATSAPP_TEMPLATE_APARTADO_VENCIDO' });
  });
});

describe('cron de citas', () => {
  const t = () => tenant();
  function citasCron() {
    return [
      // En 20 h, sin recordatorio: toca el de 24 h.
      { id: 'b-24', tenant_id: 'T-A', status: 'confirmed', starts_at: '2026-11-19T14:00:00.000Z', created_at: '2026-11-10T00:00:00.000Z', customers: { name: 'Ana López', phone: '6181110000' }, service_types: { name: 'Corte' }, tenants: t() },
      // En 1 h: toca el de 2 h.
      { id: 'b-2', tenant_id: 'T-A', status: 'confirmed', starts_at: '2026-11-18T19:00:00.000Z', created_at: '2026-11-10T00:00:00.000Z', customers: { name: 'Bety', phone: '6182220000' }, service_types: { name: 'Tinte' }, tenants: t() },
      // Apartado sin pagar: no se recuerda.
      { id: 'b-pend', tenant_id: 'T-A', status: 'confirmed', deposit_status: 'pending', hold_expires_at: '2026-11-18T19:00:00.000Z', starts_at: '2026-11-19T15:00:00.000Z', created_at: '2026-11-10T00:00:00.000Z', customers: { name: 'C', phone: '6183330000' }, service_types: { name: 'Corte' }, tenants: t() },
      // Negocio sin la recepcionista (plan sin Pro): nada.
      { id: 'b-noPro', tenant_id: 'T-C', status: 'confirmed', starts_at: '2026-11-19T14:00:00.000Z', created_at: '2026-11-10T00:00:00.000Z', customers: { name: 'D', phone: '6184440000' }, service_types: { name: 'Corte' }, tenants: tenant({ id: 'T-C', plan: 'negocio' }) },
      // Ya pasó (ayer): seguimiento. Y otra de la misma clienta: una sola invitación.
      { id: 'b-pasada', tenant_id: 'T-A', status: 'completed', starts_at: '2026-11-17T17:00:00.000Z', ends_at: '2026-11-17T17:30:00.000Z', customers: { name: 'Eva', phone: '6185550000' }, service_types: { name: 'Corte' }, tenants: t() },
      { id: 'b-pasada2', tenant_id: 'T-A', status: 'confirmed', starts_at: '2026-11-17T18:00:00.000Z', ends_at: '2026-11-17T18:30:00.000Z', customers: { name: 'Eva', phone: '618 555 0000' }, service_types: { name: 'Uñas' }, tenants: t() },
    ];
  }

  it('dos corridas = un solo recordatorio por cita; plantillas con botones Confirmo/Reagendar', async () => {
    process.env.WHATSAPP_TEMPLATE_RECORDATORIO = 'recordatorio_cita';
    process.env.WHATSAPP_TEMPLATE_SEGUIMIENTO = 'seguimiento_cita';
    const w = fakeDb({ tenants: [t()], bookings: citasCron() });
    const plantilla = vi.fn().mockResolvedValue({ ok: true });
    const r1 = await correrCronCitas(w.db, AHORA, { plantilla });
    const r2 = await correrCronCitas(w.db, AHORA, { plantilla });
    expect(r1).toMatchObject({ ok: true, recordatorios24h: 1, recordatorios2h: 1, seguimientos: 1 });
    expect(r2).toMatchObject({ ok: true, recordatorios24h: 0, recordatorios2h: 0, seguimientos: 0 });
    expect(plantilla).toHaveBeenCalledTimes(3);

    const a = plantilla.mock.calls.find((c) => c[1] === '526181110000')!;
    expect(a).toEqual([PLATAFORMA, '526181110000', 'recordatorio_cita', ['Ana', 'Salón A', 'Corte', 'Jueves 19 de noviembre, 08:00'], ['ok|b=b-24', 'rg|b=b-24']]);
    const seg = plantilla.mock.calls.find((c) => c[2] === 'seguimiento_cita')!;
    expect(seg).toEqual([PLATAFORMA, '526185550000', 'seguimiento_cita', ['Eva', 'Salón A', 'Corte'], ['c']]);

    const b = (id: string) => w.tablas.bookings.find((x) => x.id === id)!;
    expect(b('b-24').reminder_24h_sent_at).toBeTruthy();
    expect(b('b-2')).toMatchObject({ reminder_2h_sent_at: AHORA.toISOString(), reminder_24h_sent_at: AHORA.toISOString() });
    expect(b('b-pend').reminder_24h_sent_at).toBeUndefined();
    expect(b('b-noPro').reminder_24h_sent_at).toBeUndefined();
    expect(b('b-pasada2').followup_sent_at).toBeTruthy(); // marcada, pero sin segundo mensaje
  });

  it('sin plantilla configurada: se marca y queda skipped con motivo, no se reintenta', async () => {
    const w = fakeDb({ tenants: [t()], bookings: citasCron().slice(0, 1) });
    const plantilla = vi.fn();
    await correrCronCitas(w.db, AHORA, { plantilla });
    await correrCronCitas(w.db, AHORA, { plantilla });
    expect(plantilla).not.toHaveBeenCalled();
    expect(w.tablas.whatsapp_messages).toEqual([expect.objectContaining({ status: 'skipped', error: 'Falta la plantilla WHATSAPP_TEMPLATE_RECORDATORIO', booking_id: 'b-24' })]);
  });

  it('sin db/061 no manda nada y lo dice', async () => {
    process.env.WHATSAPP_TEMPLATE_RECORDATORIO = 'recordatorio_cita';
    const w = fakeDb({ tenants: [t()], bookings: citasCron().slice(0, 1) }, { sinColumnas: { bookings: ['reminder_24h_sent_at'] } });
    const plantilla = vi.fn();
    expect(await correrCronCitas(w.db, AHORA, { plantilla })).toMatchObject({ ok: false, reason: 'Falta correr db/061_anticipos.sql.' });
    expect(plantilla).not.toHaveBeenCalled();
  });
});

describe('botones Confirmo y Reagendar', () => {
  const cita = (over: Row = {}): Row => ({
    id: 'b-1',
    tenant_id: 'T-A',
    resource_id: 'r-1',
    service_type_id: 's-a',
    status: 'confirmed',
    deposit_status: 'paid',
    starts_at: '2026-11-21T17:00:00.000Z',
    ends_at: '2026-11-21T17:30:00.000Z',
    customers: { name: 'Daniela', phone: '618 123 4567' },
    service_types: { name: 'Corte' },
    ...over,
  });
  const boton = (payload: string, text: string) => msg({ type: 'button', texto: text, opcion: payload });

  it('Confirmo marca customer_confirmed_at solo en una cita propia', async () => {
    const w = mundo({ conversacion: true, bookings: [cita(), cita({ id: 'b-ajena', customers: { phone: '6189999999' } })] });
    const meta = crearMeta();
    const deps = { db: w.db, ...meta, client: meta.client as never };
    await procesarMensaje(boton('ok|b=b-1', 'Confirmo'), deps);
    expect(w.tablas.bookings[0].customer_confirmed_at).toBe(AHORA.toISOString());
    expect(meta.textos().at(-1)).toBe('¡Gracias por confirmar! Te esperamos el Sábado 21 de noviembre, 11:00.');
    await procesarMensaje(boton('ok|b=b-ajena', 'Confirmo'), deps);
    expect(w.tablas.bookings[1].customer_confirmed_at).toBeUndefined();
    expect(meta.client.messages.create).not.toHaveBeenCalled();
  });

  it('Reagendar dentro de plazo: elige día y hora y mueve la misma cita conservando el anticipo', async () => {
    const w = mundo({ anticipo: true, conversacion: true, bookings: [cita()] });
    const meta = crearMeta();
    const mover = vi.fn().mockResolvedValue({ error: null });
    const deps = { db: w.db, ...meta, client: meta.client as never, mover };
    await procesarMensaje(boton('rg|b=b-1', 'Reagendar'), deps);
    expect(meta.ultimo().texto).toBe('¿Para qué día cambiamos tu cita?');
    for (const titulo of ['Mañana', '12:00']) {
      const op = meta.opciones().find((o) => o.titulo === titulo)!;
      await procesarMensaje(msg({ type: 'interactive', texto: titulo, opcion: op.id }), deps);
    }
    expect(mover).toHaveBeenCalledWith({ bookingId: 'b-1', slug: 'salon-a', newStartsAt: `${MANANA}T18:00:00.000Z`, newEndsAt: `${MANANA}T18:30:00.000Z` });
    expect(meta.textos().at(-1)).toBe('Listo, cambié tu cita al Jueves 19 de noviembre, 12:00. Tu anticipo sigue ligado a la cita.');
  });

  it('Reagendar fuera de plazo: explica la política con el límite en hora local y pasa a humano', async () => {
    const w = mundo({
      anticipo: true,
      conversacion: true,
      tenantOver: { anticipo_politica: 'Los cambios con menos de 24 horas pierden el anticipo.' },
      bookings: [cita({ starts_at: '2026-11-19T02:00:00.000Z' })],
    });
    const meta = crearMeta();
    const mover = vi.fn();
    await procesarMensaje(boton('rg|b=b-1', 'Reagendar'), { db: w.db, ...meta, client: meta.client as never, mover });
    expect(meta.textos().at(-1)).toBe(
      'Los cambios con menos de 24 horas pierden el anticipo.\nPara cambiar tu cita conservando el anticipo había que avisar antes del Martes 17 de noviembre, 20:00.\nLe aviso a alguien del negocio para que te ayude por aquí.'
    );
    expect(mover).not.toHaveBeenCalled();
    expect(w.tablas.whatsapp_conversaciones[0].estado).toBe('humano');
  });
});
