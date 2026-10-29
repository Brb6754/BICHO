import Anthropic from '@anthropic-ai/sdk';
import { MODELO_COPILOTO, MAX_PASOS } from './modelo';
import { promptDeSistema } from './esquema';
import { ejecutarConsulta } from './frontera';
import { buscarEnNotas } from './notas';
import { buscarEnDocumentos } from './documentos';

// El copiloto tiene exactamente tres herramientas y las tres LEEN. No hay
// ninguna que escriba ni que mande mensajes: el peor caso de una
// inyección de prompt escondida en una nota es una respuesta rara, no
// una acción.
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'consultar_sql',
    description: 'Ejecuta UN select (o with … select) de solo lectura en Postgres sobre los datos de este negocio. Máximo 200 filas.',
    input_schema: {
      type: 'object',
      properties: { sql: { type: 'string', description: 'Una sola sentencia SELECT, sin punto y coma intermedio.' } },
      required: ['sql'],
    },
  },
  {
    name: 'buscar_en_notas',
    description: 'Búsqueda por significado en las notas libres (contactos, cotizaciones, resultados de reuniones). Devuelve las 5 más parecidas.',
    input_schema: {
      type: 'object',
      properties: { texto: { type: 'string', description: 'Lo que buscas, en lenguaje natural. Ej: "le pareció caro".' } },
      required: ['texto'],
    },
  },
  {
    name: 'buscar_en_documentos',
    description:
      'Búsqueda por significado en los documentos que subió el negocio (listas de precios, fichas técnicas, políticas, garantías). Devuelve los 5 fragmentos más parecidos con el nombre del documento.',
    input_schema: {
      type: 'object',
      properties: { texto: { type: 'string', description: 'Lo que buscas. Ej: "garantía de los paneles".' } },
      required: ['texto'],
    },
  },
];

export type Evento =
  | { type: 'tool'; name: NombreTool; input: string; ok: boolean; filas?: number }
  | { type: 'text'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type NombreTool = 'consultar_sql' | 'buscar_en_notas' | 'buscar_en_documentos';

export type Turno = { role: 'user' | 'assistant'; content: string };

/** Los resultados van marcados como datos; un "</datos>" dentro de un dato no puede cerrar el sobre. */
function comoDatos(valor: unknown) {
  const json = JSON.stringify(valor, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  return `<datos>${json.replace(/<\/?datos>/gi, '')}</datos>`;
}

export async function* correrAgente(opts: {
  userId: string;
  negocio: string;
  zona: string;
  historial: Turno[];
}): AsyncGenerator<Evento> {
  const client = new Anthropic();
  const hoy = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: opts.zona }).format(new Date());
  // "Mañana" calculado aquí y no por el modelo: Haiku se equivocó de día
  // de la semana en la prueba en vivo ("mañana, jueves 30" un jueves 29).
  const manana = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeZone: opts.zona }).format(new Date(Date.now() + 86_400_000));
  const system = promptDeSistema({ negocio: opts.negocio, hoy, manana, zona: opts.zona });
  const messages: Anthropic.MessageParam[] = opts.historial.map((t) => ({ role: t.role, content: t.content }));

  for (let paso = 0; paso < MAX_PASOS; paso++) {
    const stream = client.messages.stream({ model: MODELO_COPILOTO, max_tokens: 1500, system, tools: TOOLS, messages });
    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') yield { type: 'text', delta: ev.delta.text };
    }
    const msg = await stream.finalMessage();
    messages.push({ role: 'assistant', content: msg.content });
    if (msg.stop_reason !== 'tool_use') {
      yield { type: 'done' };
      return;
    }

    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const b of msg.content) {
      if (b.type !== 'tool_use') continue;
      const input = b.input as { sql?: string; texto?: string };
      if (b.name === 'consultar_sql') {
        const r = await ejecutarConsulta(opts.userId, String(input.sql ?? ''));
        yield { type: 'tool', name: 'consultar_sql', input: String(input.sql ?? ''), ok: r.ok, filas: r.ok ? r.filas.length : undefined };
        resultados.push({
          type: 'tool_result',
          tool_use_id: b.id,
          is_error: !r.ok,
          content: r.ok ? comoDatos({ filas: r.filas, truncado: r.truncado }) : `Error de SQL: ${r.error}`,
        });
      } else if (b.name === 'buscar_en_documentos') {
        const r = await buscarEnDocumentos(opts.userId, String(input.texto ?? ''));
        yield { type: 'tool', name: 'buscar_en_documentos', input: String(input.texto ?? ''), ok: r.ok, filas: r.ok ? r.fragmentos.length : undefined };
        resultados.push({
          type: 'tool_result',
          tool_use_id: b.id,
          is_error: !r.ok,
          content: r.ok ? comoDatos(r.fragmentos) : `Error: ${r.error}`,
        });
      } else {
        const r = await buscarEnNotas(opts.userId, String(input.texto ?? ''));
        yield { type: 'tool', name: 'buscar_en_notas', input: String(input.texto ?? ''), ok: r.ok, filas: r.ok ? r.notas.length : undefined };
        resultados.push({
          type: 'tool_result',
          tool_use_id: b.id,
          is_error: !r.ok,
          content: r.ok ? comoDatos(r.notas) : `Error: ${r.error}`,
        });
      }
    }
    messages.push({ role: 'user', content: resultados });
  }
  yield { type: 'text', delta: '\n\nNo alcancé a terminar la consulta en los pasos permitidos. Intenta una pregunta más concreta.' };
  yield { type: 'done' };
}
