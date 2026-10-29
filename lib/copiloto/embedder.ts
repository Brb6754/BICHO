// El mismo modelo que db/026 dejó documentado para el catálogo
// (paraphrase-multilingual-MiniLM-L12-v2, 384 dims, normalizado). db/026
// creó la columna, pero el código que la llenaba nunca llegó al repo:
// este archivo es ese embedder, y es el que debería reutilizar quien
// termine la búsqueda semántica de servicios.
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

const MODELO = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
let pipe: Promise<FeatureExtractionPipeline> | null = null;

async function extractor() {
  if (!pipe) {
    pipe = import('@huggingface/transformers').then(
      ({ pipeline }) => pipeline('feature-extraction', MODELO, { dtype: 'q8' }) as Promise<FeatureExtractionPipeline>,
    );
  }
  return pipe;
}

/** Un vector normalizado por texto: el coseno queda como producto punto. */
export async function embeber(textos: string[]): Promise<number[][]> {
  if (textos.length === 0) return [];
  const ex = await extractor();
  const out = await ex(textos, { pooling: 'mean', normalize: true });
  return out.tolist() as number[][];
}

export function coseno(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
