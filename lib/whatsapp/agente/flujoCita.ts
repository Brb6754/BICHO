import { addDaysKey, appointmentWhen, dayKey, dayLabel, formatTime } from '@/lib/dates/tenantTime';
import { tenantBookingPageUrl, tenantManageBookingUrl } from '@/lib/urls';
import { apartarCita } from '@/lib/anticipos/apartar';
import { faltaMigracion, leerConfigAnticipo, montoAnticipo } from '@/lib/anticipos/config';
import { obtenerLinkAnticipo } from '@/lib/anticipos/pago';
import { puedeReagendar, reagendarConservandoAnticipo, type Plazo } from '@/lib/anticipos/reagendar';
import { LIMITES, type Opcion, type Saliente } from '@/lib/whatsapp/interactivo';
import { citasDelTelefono, huecos, recursosDelServicio, servicios, telefonoLocal, type Contexto, type Hueco, type Servicio } from './herramientas';

// Agendar con botones, sin pasar por Claude: servicio → especialista →
// día → hora → apartar. No hay estado guardado: cada opción lleva en su
// id lo ya elegido (`c|s=<servicio>|r=<recurso>|d=<día>`). Por eso el id
// NUNCA se cree: se parsea con una gramática cerrada y todo se vuelve a
// verificar contra la base — que el servicio y el recurso sean de ESTE
// negocio y que el hueco siga libre (get_available_slots) al apartar.
// Lo único guardado es el `pendiente` del historial cuando falta el nombre.

export const DIAS_A_MOSTRAR = 14;

export type OpcionCita = { a: 'c' | 'ok' | 'rg'; s?: string; r?: string; b?: string; d?: string; t?: string; o?: number };

const RE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const VALIDA: Record<string, (v: string) => boolean> = {
  s: (v) => RE_ID.test(v),
  r: (v) => v === '*' || RE_ID.test(v),
  b: (v) => RE_ID.test(v),
  d: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
  t: (v) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(v) && !Number.isNaN(Date.parse(v)),
  o: (v) => /^\d{1,3}$/.test(v),
};
const ORDEN = ['s', 'r', 'b', 'd', 't', 'o'] as const;

export function armarId(o: OpcionCita): string {
  return [o.a, ...ORDEN.filter((k) => o[k] !== undefined).map((k) => `${k}=${o[k]}`)].join('|');
}

/** Id de una opción → lo elegido, o null si no sigue la gramática (manipulado o de otra versión). */
export function leerId(id: string | null | undefined): OpcionCita | null {
  if (!id || id.length > LIMITES.idFila) return null;
  const [a, ...partes] = id.split('|');
  if (a !== 'c' && a !== 'ok' && a !== 'rg') return null;
  const o: OpcionCita = { a };
  for (const p of partes) {
    const i = p.indexOf('=');
    const k = p.slice(0, i);
    const v = p.slice(i + 1);
    if (i < 1 || !(k in VALIDA) || k in o || !VALIDA[k](v)) return null;
    (o as Record<string, unknown>)[k] = k === 'o' ? Number(v) : v;
  }
  if (a === 'c' ? o.b !== undefined : !o.b || o.s !== undefined || o.r !== undefined) return null;
  return o;
}

const RE_AGENDAR = /\b(agendar|agenda|reservar|reserva|cita|turno)\b/i;
const RE_OTRA_COSA = /cancel|cambi|mover|mueve|reagend|\bmi cita\b|confirm|precio|cu[aá]nto|d[oó]nde|horario de/i;

/** "Quiero una cita", "agendar", "reservar mañana": se contesta con la lista, sin gastar a Claude. */
export function quiereAgendar(texto: string | null | undefined): boolean {
  const t = (texto ?? '').trim();
  return t.length > 0 && t.length <= 60 && RE_AGENDAR.test(t) && !RE_OTRA_COSA.test(t);
}

export type CtxFlujo = Contexto & {
  nombrePerfil?: string | null;
  ahora?: Date;
  linkAnticipo?: typeof obtenerLinkAnticipo;
  mover?: Parameters<typeof reagendarConservandoAnticipo>[3];
};

export type RespuestaFlujo = { mensajes: Saliente[]; pendiente?: string; humano?: boolean };

const texto = (t: string): Saliente => ({ tipo: 'texto', texto: t });
const solo = (t: string): RespuestaFlujo => ({ mensajes: [texto(t)] });
const pesos = (n: number) => `$${n.toLocaleString('es-MX')}`;
const iso = (s: string) => new Date(s).toISOString();

/** `o` null = el id no se pudo leer (manipulado o viejo): se le ofrecen las opciones de nuevo. */
export async function manejarOpcion(ctx: CtxFlujo, o: OpcionCita | null, nombre?: string): Promise<RespuestaFlujo> {
  try {
    if (!o) return await opcionInvalida(ctx);
    if (o.a === 'ok') return await confirmar(ctx, o.b!);
    if (o.a === 'rg') return await reagendar(ctx, o);
    return await agendar(ctx, o, nombre);
  } catch (e) {
    console.error('whatsapp flujo cita falló', { error: e instanceof Error ? e.message : 'unknown' });
    return solo('Perdón, tuve un problema. ¿Me escribes qué necesitas?');
  }
}

/** Una opción que no se pudo leer o ya no es válida: se empieza de nuevo. */
async function opcionInvalida(ctx: CtxFlujo): Promise<RespuestaFlujo> {
  const r = await listaServicios(ctx, await servicios(ctx), 0);
  return { mensajes: [texto('Esa opción ya no está disponible. Te mando las opciones de nuevo.'), ...r.mensajes] };
}

// ── Agendar ──────────────────────────────────────────────────────────

async function agendar(ctx: CtxFlujo, o: OpcionCita, nombre?: string): Promise<RespuestaFlujo> {
  const lista = await servicios(ctx);
  if (!o.s) return listaServicios(ctx, lista, o.o ?? 0);
  const s = lista.find((x) => x.id === o.s);
  if (!s) return opcionInvalida(ctx);

  const recursos = await recursosDelServicio(ctx, s.id);
  if (!recursos.length) return solo(`Por ahora no hay horarios para ${s.name}. Puedes ver otras opciones en ${tenantBookingPageUrl(ctx.slug)}`);
  // Un solo recurso: preguntar entre una opción no informa nada.
  const r = o.r ?? (recursos.length === 1 ? '*' : null);
  if (!r) return listaRecursos(s, recursos);
  if (r !== '*' && !recursos.some((x) => x.id === r)) return opcionInvalida(ctx);

  const rec = r === '*' ? undefined : r;
  const base: OpcionCita = { a: 'c', s: s.id, r };
  if (o.t) return elegirHora(ctx, s, r, o.t, nombre);
  if (o.d) return listaHoras(ctx, s.id, rec, o.d, o.o ?? 0, base, `¿A qué hora te acomoda tu ${s.name}?`);
  return listaDias(ctx, s.id, rec, base, `¿Qué día quieres tu ${s.name}?`);
}

async function listaServicios(ctx: CtxFlujo, lista: Servicio[], offset: number): Promise<RespuestaFlujo> {
  if (!lista.length) return solo(`Por aquí todavía no puedo agendar. Puedes reservar en ${tenantBookingPageUrl(ctx.slug)}`);
  const config = await leerConfigAnticipo(ctx.db, ctx.tenantId);
  const filas = lista.map((s) => {
    const precio = s.show_price !== false && s.price_cents ? ` · ${pesos(s.price_cents / 100)}` : '';
    const anticipo = montoAnticipo(config, s);
    return {
      id: armarId({ a: 'c', s: s.id }),
      titulo: s.name,
      descripcion: `${s.duration_minutes} min${precio}${anticipo > 0 ? ` · anticipo ${pesos(anticipo)}` : ''}`,
    };
  });
  return lista1('¿Qué servicio quieres agendar?', 'Ver servicios', paginar(filas, offset, (o) => armarId({ a: 'c', o })));
}

function listaRecursos(s: Servicio, recursos: { id: string; name?: string | null }[]): RespuestaFlujo {
  // shortcut: con más de 9 especialistas solo salen los primeros 9 (más "Cualquiera"); paginar si algún negocio lo necesita.
  return lista1(`¿Con quién quieres tu ${s.name}?`, 'Elegir', [
    { id: armarId({ a: 'c', s: s.id, r: '*' }), titulo: 'Cualquiera disponible', descripcion: 'Te doy el primer horario libre' },
    ...recursos.slice(0, LIMITES.filas - 1).map((r) => ({ id: armarId({ a: 'c', s: s.id, r: r.id }), titulo: r.name || 'Especialista' })),
  ]);
}

async function elegirHora(ctx: CtxFlujo, s: Servicio, r: string, t: string, nombre?: string): Promise<RespuestaFlujo> {
  const tz = ctx.timezone;
  const dia = dayKey(t, tz);
  const rec = r === '*' ? undefined : r;
  const hueco = await huecoLibre(ctx, s.id, rec, t);
  const otraVez = async () => ({
    mensajes: [
      texto('Ese horario se acaba de ocupar. Estos siguen libres:'),
      ...(await listaHoras(ctx, s.id, rec, dia, 0, { a: 'c', s: s.id, r }, '¿Cuál te acomoda?')).mensajes,
    ],
  });
  if (!hueco) return otraVez();

  const nom = (nombre ?? ctx.nombrePerfil ?? '').trim().slice(0, 80);
  if (!nom) return { mensajes: [texto('¿A nombre de quién agendo la cita?')], pendiente: armarId({ a: 'c', s: s.id, r, t }) };

  const ahora = ctx.ahora ?? new Date();
  const res = await apartarCita(
    ctx.db,
    ctx.tenantId,
    {
      resource_id: hueco.resource_id,
      service_type_id: s.id,
      starts_at: hueco.slot_start,
      ends_at: hueco.slot_end,
      customer_name: nom,
      customer_phone: telefonoLocal(ctx.telefono),
      notes: 'Agendada por WhatsApp (botones)',
    },
    ahora
  );
  if (!res.ok) return res.status === 409 ? otraVez() : solo(res.error);

  const cuando = appointmentWhen(hueco.slot_start, tz);
  const gestionar = tenantManageBookingUrl(ctx.slug, res.bookingId);
  if (!res.requiereAnticipo || !res.venceEn) {
    return solo(`¡Listo, ${nom}! Quedó tu cita: ${res.serviceName}, ${cuando}.\nSi necesitas cambiarla o cancelarla: ${gestionar}`);
  }
  const pago = await (ctx.linkAnticipo ?? obtenerLinkAnticipo)(ctx.db, {
    tenantId: ctx.tenantId,
    bookingId: res.bookingId,
    montoMxn: res.montoMxn,
    descripcion: `Anticipo ${res.serviceName}`,
    vence: res.venceEn,
  });
  const minutos = Math.max(1, Math.round((res.venceEn.getTime() - ahora.getTime()) / 60_000));
  return solo(
    [
      `¡Listo, ${nom}! Te aparté ${res.serviceName} el ${cuando}.`,
      `Para confirmarla falta un anticipo de ${pesos(res.montoMxn)}. El horario queda apartado ${minutos} minutos (hasta las ${formatTime(res.venceEn.toISOString(), tz)}); si no se recibe, se libera.`,
      pago ? `Págalo aquí: ${pago.url}` : 'El negocio te compartirá por aquí cómo pagarlo.',
    ].join('\n')
  );
}

// ── Días y horas (compartido con reagendar) ─────────────────────────

async function huecoLibre(ctx: CtxFlujo, servicioId: string, recursoId: string | undefined, t: string): Promise<Hueco | undefined> {
  const dia = dayKey(t, ctx.timezone);
  const ms = new Date(t).getTime();
  return (await huecos(ctx, servicioId, dia, dia, recursoId)).find((h) => new Date(h.slot_start).getTime() === ms);
}

function etiquetaDia(key: string, ahora: Date, tz: string | null): string {
  let l = dayLabel(key, ahora, tz);
  // "miércoles 23 de septiembre" no cabe en 24: "miércoles 23 sep".
  if (l.length > LIMITES.tituloFila) l = l.replace(/^(\S+) (\d+) de (\S+)$/, (_, w, d, m) => `${w} ${d} ${m.slice(0, 3)}`);
  return l.charAt(0).toUpperCase() + l.slice(1);
}

async function listaDias(ctx: CtxFlujo, servicioId: string, rec: string | undefined, base: OpcionCita, pregunta: string): Promise<RespuestaFlujo> {
  const ahora = ctx.ahora ?? new Date();
  const hoy = dayKey(ahora, ctx.timezone);
  const hs = await huecos(ctx, servicioId, hoy, addDaysKey(hoy, DIAS_A_MOSTRAR - 1), rec);
  const porDia = new Map<string, { primero: string; horas: Set<number> }>();
  for (const h of hs) {
    const k = dayKey(h.slot_start, ctx.timezone);
    const dia = porDia.get(k) ?? porDia.set(k, { primero: h.slot_start, horas: new Set() }).get(k)!;
    dia.horas.add(new Date(h.slot_start).getTime());
  }
  if (!porDia.size) {
    return solo(`No encontré horarios libres en los próximos ${DIAS_A_MOSTRAR} días. Escríbeme si quieres que alguien del negocio te ayude.`);
  }
  const filas = [...porDia].slice(0, LIMITES.filas).map(([k, d]) => ({
    id: armarId({ ...base, d: k }),
    titulo: etiquetaDia(k, ahora, ctx.timezone),
    descripcion: `${d.horas.size} ${d.horas.size === 1 ? 'horario' : 'horarios'} · desde ${formatTime(d.primero, ctx.timezone)}`,
  }));
  return lista1(pregunta, 'Ver días', filas);
}

async function listaHoras(
  ctx: CtxFlujo,
  servicioId: string,
  rec: string | undefined,
  d: string,
  offset: number,
  base: OpcionCita,
  pregunta: string
): Promise<RespuestaFlujo> {
  const hoy = dayKey(ctx.ahora ?? new Date(), ctx.timezone);
  if (d < hoy || d > addDaysKey(hoy, DIAS_A_MOSTRAR - 1)) return listaDias(ctx, servicioId, rec, base, '¿Qué día te acomoda?');
  const vistos = new Set<number>();
  // "Cualquiera disponible": la unión de horarios, una vez cada hora.
  const hs = (await huecos(ctx, servicioId, d, d, rec)).filter((h) => {
    const ms = new Date(h.slot_start).getTime();
    return !vistos.has(ms) && Boolean(vistos.add(ms));
  });
  if (!hs.length) {
    const dias = await listaDias(ctx, servicioId, rec, base, '¿Qué otro día te acomoda?');
    return { mensajes: [texto('Ese día ya no tiene horarios libres.'), ...dias.mensajes] };
  }
  const filas = hs.map((h) => ({ id: armarId({ ...base, t: iso(h.slot_start) }), titulo: formatTime(h.slot_start, ctx.timezone) }));
  return lista1(pregunta, 'Ver horarios', paginar(filas, offset, (o) => armarId({ ...base, d, o })));
}

function lista1(pregunta: string, boton: string, filas: Opcion[]): RespuestaFlujo {
  return { mensajes: [{ tipo: 'lista', texto: pregunta, boton, filas }] };
}

/** Máximo 10 filas por lista: 9 + "Ver más" que trae las siguientes. */
export function paginar(filas: Opcion[], offset: number, idMas: (o: number) => string): Opcion[] {
  const resto = filas.slice(offset);
  if (resto.length <= LIMITES.filas) return resto;
  const max = LIMITES.filas - 1;
  return [...resto.slice(0, max), { id: idMas(offset + max), titulo: 'Ver más', descripcion: `${resto.length - max} opciones más` }];
}

// ── Botones de los recordatorios ─────────────────────────────────────

async function citaPropia(ctx: CtxFlujo, bookingId: string) {
  return (await citasDelTelefono(ctx)).find((c) => c.id === bookingId) ?? null;
}

async function confirmar(ctx: CtxFlujo, bookingId: string): Promise<RespuestaFlujo> {
  const cita = await citaPropia(ctx, bookingId);
  if (!cita) return solo('No encontré esa cita próxima a tu nombre. Si necesitas algo, escríbeme.');
  const { error } = await ctx.db
    .from('bookings')
    .update({ customer_confirmed_at: (ctx.ahora ?? new Date()).toISOString() })
    .eq('id', bookingId)
    .eq('tenant_id', ctx.tenantId)
    .is('customer_confirmed_at', null);
  if (error && !faltaMigracion(error)) console.error('whatsapp confirmar cita', { code: error.code });
  return solo(`¡Gracias por confirmar! Te esperamos el ${appointmentWhen(cita.starts_at, ctx.timezone)}.`);
}

function fueraDePlazo(plazo: Plazo): RespuestaFlujo {
  return {
    mensajes: [
      texto(
        [
          plazo.politica,
          `Para cambiar tu cita conservando el anticipo había que avisar antes del ${plazo.limiteTexto}.`,
          'Le aviso a alguien del negocio para que te ayude por aquí.',
        ]
          .filter(Boolean)
          .join('\n')
      ),
    ],
    humano: true,
  };
}

async function reagendar(ctx: CtxFlujo, o: OpcionCita): Promise<RespuestaFlujo> {
  if (!(await citaPropia(ctx, o.b!))) return solo('No encontré una cita próxima a tu nombre para cambiar. ¿Quieres agendar una nueva? Escribe "agendar".');
  const { data } = await ctx.db.from('bookings').select('*').eq('id', o.b!).eq('tenant_id', ctx.tenantId).maybeSingle();
  const cita = data as { id: string; starts_at: string; resource_id: string; service_type_id: string; deposit_status?: string | null } | null;
  if (!cita) return solo('No encontré esa cita.');

  const ahora = ctx.ahora ?? new Date();
  // El plazo solo aplica a citas con anticipo (misma regla que reagendarConservandoAnticipo).
  if (cita.deposit_status === 'pending' || cita.deposit_status === 'paid') {
    const plazo = puedeReagendar(cita, await leerConfigAnticipo(ctx.db, ctx.tenantId), ahora);
    if (!plazo.puede) return fueraDePlazo(plazo);
  }

  // Se mueve la misma fila, así que el horario nuevo tiene que ser del mismo recurso.
  const base: OpcionCita = { a: 'rg', b: cita.id };
  if (o.d) return listaHoras(ctx, cita.service_type_id, cita.resource_id, o.d, o.o ?? 0, base, '¿A qué hora la cambiamos?');
  if (!o.t) return listaDias(ctx, cita.service_type_id, cita.resource_id, base, '¿Para qué día cambiamos tu cita?');

  const hueco = await huecoLibre(ctx, cita.service_type_id, cita.resource_id, o.t);
  if (!hueco) {
    const r = await listaHoras(ctx, cita.service_type_id, cita.resource_id, dayKey(o.t, ctx.timezone), 0, base, '¿Cuál te acomoda?');
    return { mensajes: [texto('Ese horario se acaba de ocupar. Estos siguen libres:'), ...r.mensajes] };
  }
  const r = await reagendarConservandoAnticipo(
    ctx.db,
    { tenantId: ctx.tenantId, slug: ctx.slug, bookingId: cita.id, newStartsAt: hueco.slot_start, newEndsAt: hueco.slot_end },
    ahora,
    ctx.mover
  );
  if (!r.ok) return r.motivo === 'fuera_de_plazo' && r.plazo ? fueraDePlazo(r.plazo) : solo(r.error);
  const conserva = cita.deposit_status === 'pending' || cita.deposit_status === 'paid' ? ' Tu anticipo sigue ligado a la cita.' : '';
  return solo(`Listo, cambié tu cita al ${appointmentWhen(hueco.slot_start, ctx.timezone)}.${conserva}`);
}
