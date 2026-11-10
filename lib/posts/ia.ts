import Anthropic from '@anthropic-ai/sdk';
import { MODELO_COPILOTO } from '@/lib/copiloto/modelo';
import { ESQUEMA_SALIDA, armarPrompt, validarOpciones, type Contexto, type Opcion } from './contexto';

// Las 3 opciones de texto. Mismo cliente y modelo que el Copiloto
// (lib/copiloto/agente.ts). Salida estructurada + validación propia:
// el esquema garantiza la forma, no que no invente un precio.
export async function generarOpciones(ctx: Contexto): Promise<Opcion[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('La IA no está configurada (falta ANTHROPIC_API_KEY).');
  const { system, user } = armarPrompt(ctx);
  let res: Anthropic.Message;
  try {
    res = await new Anthropic().messages.create({
      model: MODELO_COPILOTO,
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema: ESQUEMA_SALIDA as unknown as Record<string, unknown> } },
    });
  } catch (e) {
    console.error('[posts] Claude falló', e);
    throw new Error('La IA no respondió. Intenta de nuevo en un momento.');
  }
  const texto = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';
  return validarOpciones(texto, ctx);
}
