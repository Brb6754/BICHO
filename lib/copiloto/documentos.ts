import { createAdminClient } from '@/lib/supabase/admin';
import { ejecutarConsulta } from './frontera';
import { embeber } from './embedder';

// Documentos del copiloto (db/041). Dos mitades con permisos distintos:
//   · SUBIR escribe con service_role, después de que la ruta verificó
//     que quien sube es miembro del negocio.
//   · BUSCAR lee a través de la frontera, como `authenticated` con el JWT
//     del dueño: el RLS decide qué fragmentos existen para él.

export const MAX_BYTES = 4 * 1024 * 1024; // Vercel corta el cuerpo de una función en 4.5 MB
export const MAX_CARACTERES = 300_000;
const TAM_FRAGMENTO = 900;
const SOLAPE = 150;

export type TipoDoc = 'pdf' | 'docx' | 'txt';

export function tipoDeArchivo(nombre: string): TipoDoc | null {
  const ext = nombre.toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'txt' || ext === 'md' || ext === 'csv') return 'txt';
  return null;
}

export async function extraerTexto(tipo: TipoDoc, buf: Buffer): Promise<string> {
  if (tipo === 'pdf') {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  if (tipo === 'docx') {
    const mammoth = await import('mammoth');
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  return buf.toString('utf8');
}

/**
 * Parte el texto en fragmentos de ~900 caracteres con 150 de solape,
 * cortando en un fin de párrafo u oración cuando hay uno cerca. El solape
 * evita que una idea partida a la mitad quede sin contexto en los dos.
 */
export function fragmentar(texto: string): string[] {
  const limpio = texto.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const out: string[] = [];
  let i = 0;
  while (i < limpio.length) {
    let fin = Math.min(i + TAM_FRAGMENTO, limpio.length);
    if (fin < limpio.length) {
      const ventana = limpio.slice(i + TAM_FRAGMENTO / 2, fin);
      const corte = Math.max(ventana.lastIndexOf('\n\n'), ventana.lastIndexOf('. '), ventana.lastIndexOf('\n'));
      if (corte > 0) fin = i + TAM_FRAGMENTO / 2 + corte + 1;
    }
    const f = limpio.slice(i, fin).trim();
    if (f) out.push(f);
    if (fin >= limpio.length) break;
    i = Math.max(fin - SOLAPE, i + 1);
  }
  return out;
}

export async function guardarDocumento(opts: {
  tenantId: string;
  userId: string;
  nombre: string;
  tipo: TipoDoc;
  texto: string;
}): Promise<{ id: string; fragmentos: number }> {
  const fragmentos = fragmentar(opts.texto.slice(0, MAX_CARACTERES));
  if (fragmentos.length === 0) throw new Error('No se encontró texto en el archivo. ¿Es un PDF escaneado?');

  const vectores: number[][] = [];
  for (let i = 0; i < fragmentos.length; i += 32) vectores.push(...(await embeber(fragmentos.slice(i, i + 32))));

  const db = createAdminClient();
  const { data: doc, error } = await db
    .from('copiloto_documentos')
    .insert({
      tenant_id: opts.tenantId,
      nombre: opts.nombre.slice(0, 200),
      tipo: opts.tipo,
      caracteres: opts.texto.length,
      fragmentos: fragmentos.length,
      subido_por: opts.userId,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.code === '42P01' ? 'Falta correr la migración db/041.' : error.message);

  const filas = fragmentos.map((texto, posicion) => ({
    documento_id: doc.id,
    tenant_id: opts.tenantId,
    posicion,
    texto,
    embedding: JSON.stringify(vectores[posicion]),
  }));
  for (let i = 0; i < filas.length; i += 200) {
    const { error: e } = await db.from('copiloto_fragmentos').insert(filas.slice(i, i + 200));
    if (e) {
      // Sin fragmentos el documento es invisible para el copiloto: mejor no dejarlo listado.
      await db.from('copiloto_documentos').delete().eq('id', doc.id);
      throw new Error(e.message);
    }
  }
  return { id: doc.id, fragmentos: fragmentos.length };
}

export type Fragmento = { documento: string; posicion: number; texto: string; similitud: number };

export async function buscarEnDocumentos(
  userId: string,
  consulta: string,
  k = 5,
): Promise<{ ok: true; fragmentos: Fragmento[] } | { ok: false; error: string }> {
  const [q] = await embeber([consulta]);
  // El vector lo arma este código, no el modelo: son 384 números, sin
  // texto que pueda inyectar SQL. Igual pasa por la frontera, así que el
  // RLS sigue decidiendo qué fragmentos existen para este dueño.
  const vector = `[${q.map((n) => Number(n).toFixed(6)).join(',')}]`;
  const r = await ejecutarConsulta(
    userId,
    `select d.nombre as documento, f.posicion, f.texto,
            round((1 - (f.embedding operator(extensions.<=>) '${vector}'::extensions.vector))::numeric, 2) as similitud
       from copiloto_fragmentos f join copiloto_documentos d on d.id = f.documento_id
      order by f.embedding operator(extensions.<=>) '${vector}'::extensions.vector
      limit ${k}`,
  );
  if (!r.ok) return r;
  return { ok: true, fragmentos: r.filas as unknown as Fragmento[] };
}
