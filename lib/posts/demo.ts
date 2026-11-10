import { addDaysKey, dayKey, instantFromLocal } from '@/lib/dates/tenantTime';
import { tenantShareUrl } from '@/lib/urls';
import type { PanelDemo } from '@/lib/demo/panelData';
import { FECHAS, TOPE, baseImagen, lineasDeHorarios, precioMx, resumenDe, type Contexto } from './contexto';
import type { Catalogo, Generacion, Pedido } from './datos';

// Posts con IA en el panel de demostración: el catálogo real del negocio
// demo, una promo y huecos inventados, y textos pre-escritos — sin
// llamar a Claude (la demo es pública y cada llamada cuesta).

export function catalogoDemo(d: PanelDemo): Catalogo {
  const hoy = dayKey(d.now, d.tenant.timezone);
  return {
    servicios: d.services.map((s) => ({ id: s.id, nombre: s.name, precioCents: s.price_cents, minutos: s.duration_minutes })),
    promos: [{ id: 'demo-promo', titulo: '2x1 los martes', detalle: 'Trae a una amiga y la segunda va por nuestra cuenta', codigo: null, vigencia: `del ${hoy} al ${addDaysKey(hoy, 20)}` }],
    lealtad: { sellos: 6, premio: 'Tu siguiente visita gratis' },
  };
}

function horariosDemo(d: PanelDemo): string[] {
  const hoy = dayKey(d.now, d.tenant.timezone);
  const inicios = [1, 2, 4].flatMap((n) =>
    ['10:00', '12:30', '17:00'].map((h) => instantFromLocal(addDaysKey(hoy, n), h, d.tenant.timezone))
  );
  return lineasDeHorarios(inicios, d.now, d.tenant.timezone);
}

export function contextoDemo(d: PanelDemo, slug: string, pedido: Pedido): Contexto {
  const cat = catalogoDemo(d);
  const servicio = cat.servicios.find((s) => s.id === pedido.servicioId) ?? cat.servicios[0] ?? null;
  const base: Contexto = {
    negocio: d.tenant.name,
    link: tenantShareUrl(slug),
    tipo: pedido.tipo,
    formato: pedido.formato,
    servicios: cat.servicios.map((s) => ({ nombre: s.nombre, precioCents: s.precioCents })),
    lealtad: cat.lealtad,
  };
  switch (pedido.tipo) {
    case 'servicio':
      return { ...base, servicio };
    case 'promo':
      return { ...base, promo: pedido.promoId ? cat.promos[0] : null };
    case 'horarios':
      return { ...base, servicio, horarios: horariosDemo(d) };
    case 'fecha':
      return { ...base, fecha: (FECHAS.find((f) => f.id === pedido.fechaId) ?? FECHAS[0]).nombre };
    default:
      return { ...base, tipo: 'libre', tema: (pedido.tema ?? '').trim().slice(0, TOPE.tema) || 'Novedades del mes' };
  }
}

function textos(ctx: Contexto): [string, string][] {
  const n = ctx.negocio;
  const s = ctx.servicio;
  switch (ctx.tipo) {
    case 'servicio':
      return [
        [`${s?.nombre ?? 'Tu cita'} sin prisas`, `¿Ya te toca tu ${s?.nombre.toLowerCase()}? 💅\nEn ${n} lo hacemos con calma, ${s?.minutos} minutos solo para ti.\n${s && s.precioCents ? `${precioMx(s.precioCents)}.` : ''}\nAparta tu lugar aquí:`],
        [`Hoy toca ${s?.nombre ?? 'consentirte'}`, `Date ese ratito que llevas semanas posponiendo ✨\n${s?.nombre}${s && s.precioCents ? ` · ${precioMx(s.precioCents)}` : ''}\nReserva en línea en un minuto:`],
        [`Tu lugar te espera`, `Escoge tu horario y nosotras nos encargamos del resto.\n${s?.nombre} en ${n}.`],
      ];
    case 'promo':
      return ctx.promo
        ? [
            ['2x1 los martes', `${ctx.promo.titulo} 👯‍♀️\n${ctx.promo.detalle}.\nVálido ${ctx.promo.vigencia}.`],
            ['Trae a tu amiga', `¿Con quién vienes el martes? ${ctx.promo.detalle} 💛`],
            ['Martes de amigas', `Los martes en ${n} se disfrutan en compañía: ${ctx.promo.titulo.toLowerCase()}.`],
          ]
        : [
            ['Tu visita cuenta', `En ${n} cada cita suma un sello 💛\nAl juntar ${ctx.lealtad?.sellos}: ${ctx.lealtad?.premio.toLowerCase()}.`],
            ['Junta tus sellos', `Tu tarjeta de lealtad vive en tu teléfono, sin papelitos que se pierden.`],
            ['Gracias por volver', `Te queremos de regreso, y por eso cada visita cuenta. Reserva la siguiente:`],
          ];
    case 'horarios':
      return [
        ['Quedan lugares esta semana', `Todavía hay espacio esta semana 🗓️\n${(ctx.horarios ?? []).join('\n')}\nAparta el tuyo:`],
        ['¿Te acomoda alguno?', `Se liberaron estos horarios:\n${(ctx.horarios ?? []).join('\n')}`],
        ['Agenda sin mensajes', `Ve los horarios libres y reserva tú misma, sin esperar respuesta.`],
      ];
    case 'fecha':
      return [
        [`Lista para ${ctx.fecha}`, `Se acerca ${ctx.fecha} ✨ y las agendas se llenan rápido.\nAparta tu cita con tiempo:`],
        [`${ctx.fecha} en ${n}`, `Llega a ${ctx.fecha} sintiéndote tú. Te esperamos.`],
        ['Aparta con tiempo', `Para ${ctx.fecha} ya estamos agendando. ¿Te apartamos un lugar?`],
      ];
    default:
      return [
        ['Novedades', `${ctx.tema} ✨\nPregúntanos en tu próxima visita.`],
        [`Esto es nuevo en ${n}`, `Te contamos: ${ctx.tema}.`],
        ['Ven a conocerlo', `${ctx.tema}. Ven a verlo en persona.`],
      ];
  }
}

export function generacionDemo(ctx: Contexto, id: string, cuando: string): Generacion {
  const opciones = textos(ctx).map(([titular, texto]) => ({ titular, texto: `${texto.replace(/\n{2,}/g, '\n').trim()}\n\n${ctx.link}` }));
  return { id, tipo: ctx.tipo, formato: ctx.formato, resumen: resumenDe(ctx), opciones, base: baseImagen(ctx), cuando };
}

/** Un par de posts "ya generados" para que el historial no esté vacío. */
export function historialDemo(d: PanelDemo, slug: string): Generacion[] {
  const ayer = new Date(d.now.getTime() - 86400000).toISOString();
  const antier = new Date(d.now.getTime() - 3 * 86400000).toISOString();
  return [
    generacionDemo(contextoDemo(d, slug, { tipo: 'horarios', formato: 'historia' }), 'demo-h1', ayer),
    generacionDemo(contextoDemo(d, slug, { tipo: 'fecha', formato: 'feed', fechaId: 'buen-fin' }), 'demo-h2', antier),
  ];
}
