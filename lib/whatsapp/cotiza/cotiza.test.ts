import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/lib/whatsapp/agente/fakeDb';
import { procesarMensaje, type MensajeEntrante } from '@/lib/whatsapp/agente/procesar';
import { cotizaDisponible } from '@/lib/whatsapp/agente/ruteo';
import { TOPE_TEL_HORA, revisarTope } from '@/lib/whatsapp/agente/tope';
import { timbrarCotizacion } from '@/lib/billing/timbrar';
import { validarDatosFiscales } from '@/lib/billing/validarFiscal';
import { extraerConstancia, MODELO_CONSTANCIA } from './constancia';
import { ejecutarHerramientaCotiza, type ContextoCotiza } from './herramientas';
import { correrSeguimiento } from './seguimiento';
import { estadoCotizaWA } from './estado';

// Claude, Meta y Facturapi siempre mockeados: nada sale a la red.

const PROPIO = 'pnid-nova';
const TEL_A = '5216181234567';
const TEL_B = '5216189999999';
const RFC_PRUEBA = 'EKU9003173C9'; // RFC de pruebas del SAT

function tenants() {
  return [
    {
      id: 'T-N', slug: 'nova', name: 'Nova Solar', timezone: 'America/Mexico_City', plan: 'pro',
      agente_whatsapp_enabled: false, whatsapp_phone_number_id: PROPIO,
      quotes_enabled: true, facturacion_enabled: true, cotiza_whatsapp_enabled: true, cotiza_confirmar_facturas: true,
    },
    {
      id: 'T-O', slug: 'otra', name: 'Otra', timezone: 'America/Mexico_City', plan: 'pro',
      agente_whatsapp_enabled: false, whatsapp_phone_number_id: 'pnid-otra',
      quotes_enabled: true, facturacion_enabled: true, cotiza_whatsapp_enabled: true,
    },
  ];
}

function quote(over: Record<string, unknown> = {}) {
  return {
    id: 'Q1', tenant_id: 'T-N', folio: 7, customer_name: 'Laura', origen: 'whatsapp', whatsapp_telefono: TEL_A,
    status: 'accepted', tax_rate: 16, discount_cents: 0, created_at: new Date().toISOString(),
    factura_estado: null, factura_datos_at: null, seguimiento_enviado_at: null,
    receptor_rfc: null, receptor_razon_social: null, receptor_regimen: null, receptor_codigo_postal: null, receptor_uso_cfdi: null,
    ...over,
  };
}

const DATOS_OK = { rfc: RFC_PRUEBA, razon_social: 'Escuela Kemper Urgate', regimen: '601', codigo_postal: '42501', uso_cfdi: 'G03' };

function ctx(db: ContextoCotiza['db'], over: Partial<ContextoCotiza> = {}): ContextoCotiza {
  return {
    db, tenantId: 'T-N', slug: 'nova', timezone: 'America/Mexico_City', telefono: TEL_A, conversacionId: 'C1',
    phoneNumberId: PROPIO, facturacion: true, confirmarFacturas: true, turnoInicio: new Date().toISOString(),
    ...over,
  };
}

function msg(over: Partial<MensajeEntrante> = {}): MensajeEntrante {
  return { id: `w-${Math.random()}`, from: TEL_A, timestamp: '1', type: 'text', texto: 'hola', phoneNumberId: PROPIO, ...over };
}

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('extracción de la constancia (Claude mockeado)', () => {
  const respuesta = (obj: unknown) => ({ beta: { messages: { create: vi.fn().mockResolvedValue({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(obj) }] }) } } });

  it('PDF → bloque document, datos normalizados y validados; sin uso de CFDI cae a G03', async () => {
    const client = respuesta({ es_constancia: true, rfc: 'eku900317 3c9', razon_social: 'Escuela  Kemper Urgate', regimen: '601', codigo_postal: '42501', uso_cfdi: null });
    const r = await extraerConstancia(new TextEncoder().encode('%PDF').buffer, 'application/pdf', client as never);
    expect(r).toEqual({ ok: true, faltantes: [], datos: { ...DATOS_OK, razon_social: 'ESCUELA KEMPER URGATE' } });
    const pedido = client.beta.messages.create.mock.calls[0][0];
    expect(pedido.model).toBe(MODELO_CONSTANCIA);
    expect(pedido.messages[0].content[0]).toMatchObject({ type: 'document', source: { media_type: 'application/pdf' } });
    expect(pedido.output_config.format.type).toBe('json_schema');
  });

  it('foto → bloque image; un régimen que no corresponde se reporta en vez de aceptarse', async () => {
    const client = respuesta({ es_constancia: true, rfc: RFC_PRUEBA, razon_social: 'X SA', regimen: '612', codigo_postal: '42501', uso_cfdi: 'G03' });
    const r = await extraerConstancia(new ArrayBuffer(4), 'image/jpeg', client as never);
    expect(client.beta.messages.create.mock.calls[0][0].messages[0].content[0].type).toBe('image');
    expect(r.ok && r.faltantes.length).toBe(1); // 612 es de persona física; el RFC es de empresa
  });

  it('no es constancia, formato raro o rechazo → no hay datos', async () => {
    expect(await extraerConstancia(new ArrayBuffer(1), 'image/png', respuesta({ es_constancia: false }) as never)).toEqual({ ok: false, motivo: 'no_es_constancia' });
    const nunca = respuesta({});
    expect(await extraerConstancia(new ArrayBuffer(1), 'audio/ogg', nunca as never)).toEqual({ ok: false, motivo: 'formato' });
    expect(nunca.beta.messages.create).not.toHaveBeenCalled();
    const rechazo = { beta: { messages: { create: vi.fn().mockResolvedValue({ stop_reason: 'refusal', content: [] }) } } };
    expect(await extraerConstancia(new ArrayBuffer(1), 'image/png', rechazo as never)).toEqual({ ok: false, motivo: 'ilegible' });
  });

  it('validarDatosFiscales: formato de RFC, CP, régimen por persona y uso D* solo física', () => {
    expect(validarDatosFiscales(DATOS_OK).errores).toEqual([]);
    expect(validarDatosFiscales({ ...DATOS_OK, rfc: 'ABC' }).errores.length).toBeGreaterThan(0);
    expect(validarDatosFiscales({ ...DATOS_OK, codigo_postal: '123' }).errores).toHaveLength(1);
    expect(validarDatosFiscales({ ...DATOS_OK, uso_cfdi: 'D01' }).errores).toHaveLength(1);
    expect(validarDatosFiscales({ rfc: 'GODE561231GR8', razon_social: 'EMILIO GOMEZ', regimen: '612', codigo_postal: '34000', uso_cfdi: 'D01' }).errores).toEqual([]);
  });

  it('la constancia por WhatsApp queda "por confirmar" y se le enseñan los datos al cliente, sin timbrar', async () => {
    const { db, tablas } = fakeDb({ tenants: tenants(), quotes: [quote({ factura_estado: 'esperando_datos' })] }, { unicas: { whatsapp_mensajes_procesados: ['wamid'] } });
    const enviar = vi.fn().mockResolvedValue({ ok: true });
    const timbrar = vi.fn();
    const r = await procesarMensaje(msg({ type: 'document', texto: null, mediaId: 'm1' }), {
      db, enviar,
      descargar: vi.fn().mockResolvedValue({ ok: true, bytes: new ArrayBuffer(4), mime: 'application/pdf' }),
      extraer: vi.fn().mockResolvedValue({ ok: true, datos: DATOS_OK, faltantes: [] }),
      factura: { timbrar },
    });
    expect(r).toBe('respondido');
    expect(tablas.quotes[0]).toMatchObject({ factura_estado: 'por_confirmar', receptor_rfc: RFC_PRUEBA });
    expect(enviar.mock.calls[0][2]).toContain(RFC_PRUEBA);
    expect(timbrar).not.toHaveBeenCalled();
    // Los datos fiscales no aparecen en los logs.
    expect(JSON.stringify((console.info as ReturnType<typeof vi.fn>).mock.calls)).not.toContain(RFC_PRUEBA);
  });
});

describe('confirmación antes de timbrar', () => {
  it('no se confirma en el mismo turno en que se guardaron los datos', async () => {
    const { db, tablas } = fakeDb({ quotes: [quote()] });
    const timbrar = vi.fn();
    const c = ctx(db, { confirmarFacturas: false, turnoInicio: new Date(Date.now() - 1000).toISOString(), deps: { timbrar } });
    await ejecutarHerramientaCotiza(c, 'guardar_datos_fiscales', { folio: 7, ...DATOS_OK });
    expect(tablas.quotes[0].factura_estado).toBe('por_confirmar');
    await expect(ejecutarHerramientaCotiza(c, 'confirmar_datos_factura', { folio: 7 })).rejects.toThrow(/muéstrale/);
    expect(timbrar).not.toHaveBeenCalled();
  });

  it('con "confirmar facturas" prendido queda por aprobar y NO se timbra', async () => {
    const { db, tablas } = fakeDb({ quotes: [quote({ factura_estado: 'por_confirmar', factura_datos_at: new Date(Date.now() - 60_000).toISOString(), receptor_rfc: RFC_PRUEBA })] });
    const timbrar = vi.fn();
    const r = await ejecutarHerramientaCotiza(ctx(db, { confirmarFacturas: true, deps: { timbrar } }), 'confirmar_datos_factura', { folio: 7 });
    expect(r).toMatchObject({ en_revision: true });
    expect(tablas.quotes[0].factura_estado).toBe('por_aprobar');
    expect(timbrar).not.toHaveBeenCalled();
  });

  it('apagado: el cliente confirma → se timbra UNA vez y se mandan PDF y XML', async () => {
    const { db, tablas } = fakeDb({
      quotes: [quote({ factura_estado: 'por_confirmar', factura_datos_at: new Date(Date.now() - 60_000).toISOString(), receptor_rfc: RFC_PRUEBA, receptor_razon_social: 'ESCUELA KEMPER URGATE', receptor_regimen: '601', receptor_codigo_postal: '42501', receptor_uso_cfdi: 'G03' })],
      tenant_billing_credentials: [{ tenant_id: 'T-N', api_key: 'sk_test_x' }],
    });
    const timbrar = vi.fn().mockResolvedValue({ ok: true, invoiceId: 'I1', providerId: 'fp1', uuid: 'UUID-1', total: 100 });
    const descargar = vi.fn().mockResolvedValue({ ok: true, data: new ArrayBuffer(2) });
    const enviarDoc = vi.fn().mockResolvedValue({ ok: true });
    const c = ctx(db, { confirmarFacturas: false, deps: { timbrar, descargar, enviarDoc } });
    expect(await ejecutarHerramientaCotiza(c, 'confirmar_datos_factura', { folio: 7 })).toMatchObject({ timbrada: true, archivos_enviados: true });
    expect(timbrar).toHaveBeenCalledTimes(1);
    expect(timbrar.mock.calls[0][3].receptor).toMatchObject({ rfc: RFC_PRUEBA, taxSystem: '601', zip: '42501' });
    expect(enviarDoc).toHaveBeenCalledTimes(2);
    expect(tablas.quotes[0].factura_estado).toBe('timbrada');
    // Un segundo "sí" ya no timbra.
    await expect(ejecutarHerramientaCotiza(c, 'confirmar_datos_factura', { folio: 7 })).rejects.toThrow();
    expect(timbrar).toHaveBeenCalledTimes(1);
  });

  it('solo se factura una cotización aceptada', async () => {
    const { db } = fakeDb({ quotes: [quote({ status: 'sent' })] });
    await expect(ejecutarHerramientaCotiza(ctx(db), 'solicitar_factura', { folio: 7 })).rejects.toThrow(/aceptada/);
  });
});

describe('tope de timbres', () => {
  function mundo() {
    return fakeDb({
      quotes: [quote()],
      quote_items: [{ quote_id: 'Q1', description: 'Panel', quantity: 1, unit_price_cents: 10000, position: 0 }],
      tenant_billing_credentials: [{ tenant_id: 'T-N', api_key: 'sk_test_x' }],
    });
  }
  const datos = { receptor: { rfc: RFC_PRUEBA, legalName: 'ESCUELA KEMPER URGATE', taxSystem: '601', zip: '42501' } };

  it('con 100 timbres en el mes no llama al PAC', async () => {
    const { db, tablas } = mundo();
    const crear = vi.fn();
    const r = await timbrarCotizacion(db, { tenantId: 'T-N', timezone: null }, 'Q1', datos, { crear, contarTimbres: async () => 100 });
    expect(r).toMatchObject({ ok: false });
    expect(!r.ok && r.error).toMatch(/100/);
    expect(crear).not.toHaveBeenCalled();
    expect(tablas.invoices ?? []).toHaveLength(0);
  });

  it('con 99 timbra y guarda el folio fiscal', async () => {
    const { db, tablas } = mundo();
    const crear = vi.fn().mockResolvedValue({ ok: true, data: { id: 'fp1', uuid: 'UUID-1', total: 116 } });
    const r = await timbrarCotizacion(db, { tenantId: 'T-N', timezone: null }, 'Q1', datos, { crear, contarTimbres: async () => 99 });
    expect(r).toMatchObject({ ok: true, uuid: 'UUID-1', total: 11600 });
    expect(tablas.invoices[0]).toMatchObject({ status: 'stamped', uuid_fiscal: 'UUID-1', tenant_id: 'T-N' });
  });

  it('una cotización de otro negocio no se timbra', async () => {
    const { db } = mundo();
    const crear = vi.fn();
    const r = await timbrarCotizacion(db, { tenantId: 'T-O', timezone: null }, 'Q1', datos, { crear, contarTimbres: async () => 0 });
    expect(r.ok).toBe(false);
    expect(crear).not.toHaveBeenCalled();
  });
});

describe('seguimiento de 48 h', () => {
  const hace = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  beforeEach(() => {
    process.env.WHATSAPP_TEMPLATE_SEGUIMIENTO_COTIZACION = 'seguimiento_cotizacion';
  });

  function mundo() {
    return fakeDb({
      tenants: tenants(),
      quotes: [
        quote({ id: 'vieja', status: 'sent', sent_at: hace(50) }),
        quote({ id: 'nueva', folio: 8, status: 'sent', sent_at: hace(10) }),
        quote({ id: 'aceptada', folio: 9, status: 'accepted', sent_at: hace(50) }),
        quote({ id: 'antigua', folio: 10, status: 'sent', sent_at: hace(24 * 9) }),
        quote({ id: 'contesto', folio: 11, status: 'sent', sent_at: hace(50), whatsapp_telefono: TEL_B }),
      ],
      whatsapp_conversaciones: [{ id: 'C2', tenant_id: 'T-N', telefono: TEL_B, historial: [{ role: 'user', content: 'lo pienso', at: hace(30) }] }],
    });
  }

  it('manda UNA plantilla a la cotización enviada hace 48+ h sin respuesta, y no repite', async () => {
    const { db, tablas } = mundo();
    const enviar = vi.fn().mockResolvedValue({ ok: true });
    expect(await correrSeguimiento(db, new Date(), enviar)).toMatchObject({ enviadas: 1 });
    expect(enviar).toHaveBeenCalledWith(PROPIO, TEL_A, 'seguimiento_cotizacion', ['Laura', 'Nova Solar', expect.any(String)]);
    expect(tablas.quotes.find((q) => q.id === 'vieja')!.seguimiento_enviado_at).toBeTruthy();
    expect(await correrSeguimiento(db, new Date(), enviar)).toMatchObject({ enviadas: 0 });
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('sin plantilla configurada no manda nada; si Meta rechaza, se libera para reintentar', async () => {
    delete process.env.WHATSAPP_TEMPLATE_SEGUIMIENTO_COTIZACION;
    const { db, tablas } = mundo();
    const enviar = vi.fn();
    expect(await correrSeguimiento(db, new Date(), enviar)).toMatchObject({ plantilla: false });
    expect(enviar).not.toHaveBeenCalled();

    process.env.WHATSAPP_TEMPLATE_SEGUIMIENTO_COTIZACION = 'seguimiento_cotizacion';
    await correrSeguimiento(db, new Date(), vi.fn().mockResolvedValue({ ok: false, error: 'template no aprobada' }));
    expect(tablas.quotes.find((q) => q.id === 'vieja')!.seguimiento_enviado_at).toBeNull();
  });

  it('estado en el panel', () => {
    expect(estadoCotizaWA({ status: 'sent' })).toBe('enviada');
    expect(estadoCotizaWA({ status: 'viewed', seguimiento_enviado_at: hace(1) })).toBe('seguimiento');
    expect(estadoCotizaWA({ status: 'accepted' })).toBe('aceptada');
    expect(estadoCotizaWA({ status: 'accepted', factura_estado: 'timbrada' })).toBe('facturada');
  });
});

describe('aislamiento entre negocios y teléfonos', () => {
  function mundo() {
    return fakeDb({
      service_types: [
        { id: 'kit', tenant_id: 'T-N', active: true, name: 'Kit 4 paneles', price_cents: 3000000 },
        { id: 'oculto', tenant_id: 'T-N', active: true, name: 'Precio privado', price_cents: 100, show_price: false },
        { id: 'ajeno', tenant_id: 'T-O', active: true, name: 'Ajeno', price_cents: 1 },
      ],
      quotes: [
        quote({ id: 'mia', status: 'sent' }),
        quote({ id: 'otro-tel', status: 'sent', whatsapp_telefono: TEL_B }),
        quote({ id: 'otro-negocio', status: 'sent', tenant_id: 'T-O' }),
      ],
    });
  }

  it('aceptar_cotizacion solo toca la cotización de ESTE teléfono en ESTE negocio', async () => {
    const { db, tablas } = mundo();
    await ejecutarHerramientaCotiza(ctx(db), 'aceptar_cotizacion', { folio: 7 });
    expect(tablas.quotes.map((q) => [q.id, q.status])).toEqual([['mia', 'accepted'], ['otro-tel', 'sent'], ['otro-negocio', 'sent']]);
    // El teléfono B ve solo la suya.
    const deB = (await ejecutarHerramientaCotiza(ctx(db, { telefono: TEL_B }), 'ver_mis_cotizaciones', {})) as unknown[];
    expect(deB).toHaveLength(1);
  });

  it('crear_cotizacion: precio de la base, nunca del modelo; sin conceptos de otro negocio ni ocultos', async () => {
    const { db, tablas } = mundo();
    const enviarDoc = vi.fn().mockResolvedValue({ ok: true });
    await expect(ejecutarHerramientaCotiza(ctx(db, { deps: { enviarDoc } }), 'crear_cotizacion', { nombre: 'Laura', partidas: [{ id: 's:ajeno', cantidad: 1 }] })).rejects.toThrow(/catálogo/);
    await expect(ejecutarHerramientaCotiza(ctx(db, { deps: { enviarDoc } }), 'crear_cotizacion', { nombre: 'Laura', partidas: [{ id: 's:oculto', cantidad: 1 }] })).rejects.toThrow(/catálogo/);

    const r = await ejecutarHerramientaCotiza(ctx(db, { deps: { enviarDoc } }), 'crear_cotizacion', { nombre: 'Laura', partidas: [{ id: 's:kit', cantidad: 2, precio: 1 }] });
    expect(r).toMatchObject({ pdf_enviado: true });
    const nueva = tablas.quotes.at(-1)!;
    expect(nueva).toMatchObject({ tenant_id: 'T-N', origen: 'whatsapp', whatsapp_telefono: TEL_A, status: 'sent' });
    expect(tablas.quote_items.find((i) => i.quote_id === nueva.id)).toMatchObject({ unit_price_cents: 3000000, quantity: 2 });
    expect(enviarDoc.mock.calls[0][2].link).toContain(`/api/cotizacion/${nueva.id}/pdf`);
  });

  it('Cotiza solo corre en el número propio del negocio', () => {
    expect(cotizaDisponible({ plan: 'pro', cotiza_whatsapp_enabled: true, quotes_enabled: true }, false)).toBe(true);
    expect(cotizaDisponible({ plan: 'pro', cotiza_whatsapp_enabled: true, quotes_enabled: true }, true)).toBe(false);
    expect(cotizaDisponible({ plan: 'negocio', cotiza_whatsapp_enabled: true, quotes_enabled: true }, false)).toBe(false);
    expect(cotizaDisponible({ plan: 'pro', cotiza_whatsapp_enabled: true, quotes_enabled: false }, false)).toBe(false);
  });
});

describe('tope de mensajes y notas de voz', () => {
  const unicas = { unicas: { whatsapp_mensajes_procesados: ['wamid'] } };
  const texto = (t: string) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: t }] });

  it(`al pasar de ${TOPE_TEL_HORA} mensajes por hora avisa una vez y luego calla, sin llamar a Claude`, async () => {
    const previos = Array.from({ length: TOPE_TEL_HORA }, (_, i) => ({ wamid: `p${i}`, telefono: TEL_A, tenant_id: 'T-N', created_at: new Date().toISOString() }));
    const { db } = fakeDb({ tenants: tenants(), whatsapp_mensajes_procesados: previos }, unicas);
    const enviar = vi.fn().mockResolvedValue({ ok: true });
    const client = { messages: { create: vi.fn().mockResolvedValue(texto('hola')) } };
    expect(await procesarMensaje(msg(), { db, enviar, client: client as never })).toBe('tope');
    expect(await procesarMensaje(msg(), { db, enviar, client: client as never })).toBe('tope');
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  it('el tope cuenta por teléfono: otro teléfono del mismo negocio sigue', async () => {
    const previos = Array.from({ length: TOPE_TEL_HORA + 3 }, (_, i) => ({ wamid: `p${i}`, telefono: TEL_A, tenant_id: 'T-N', created_at: new Date().toISOString() }));
    const { db } = fakeDb({ whatsapp_mensajes_procesados: previos });
    expect(await revisarTope(db, TEL_A, 'T-N')).toBe('callar');
    expect(await revisarTope(db, TEL_B, 'T-N')).toBe('ok');
  });

  it('nota de voz: pide escribir, no descarga ni llama a Claude', async () => {
    const { db } = fakeDb({ tenants: tenants() }, unicas);
    const enviar = vi.fn().mockResolvedValue({ ok: true });
    const descargar = vi.fn();
    const client = { messages: { create: vi.fn() } };
    expect(await procesarMensaje(msg({ type: 'audio', texto: null, mediaId: 'a1' }), { db, enviar, descargar, client: client as never })).toBe('respondido');
    expect(enviar.mock.calls[0][2]).toMatch(/escribes/);
    expect(descargar).not.toHaveBeenCalled();
    expect(client.messages.create).not.toHaveBeenCalled();
  });

  it('el agente con Cotiza recibe las herramientas de cotizar y facturar, y no las de citas', async () => {
    const { db } = fakeDb({ tenants: tenants() }, unicas);
    const client = { messages: { create: vi.fn().mockResolvedValue(texto('¿Qué necesitas cotizar?')) } };
    await procesarMensaje(msg({ texto: 'quiero cotizar paneles' }), { db, enviar: vi.fn().mockResolvedValue({ ok: true }), client: client as never });
    const nombres = client.messages.create.mock.calls[0][0].tools.map((t: { name: string }) => t.name);
    expect(nombres).toEqual(expect.arrayContaining(['ver_catalogo', 'crear_cotizacion', 'confirmar_datos_factura', 'pasar_a_humano']));
    expect(nombres).not.toContain('crear_cita');
  });
});
