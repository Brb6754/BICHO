'use client';

import { useEffect, useState } from 'react';
import { Copy, Download, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import {
  FECHAS,
  LIMITE_MENSUAL,
  PLANTILLAS,
  TOPE,
  imagenUrl,
  waShareHref,
  type BaseImagen,
  type Formato,
  type Plantilla,
  type Tipo,
} from '@/lib/posts/contexto';
import type { Catalogo, Generacion, Pedido, RespGenerar } from '@/lib/posts/datos';

// Posts con IA: elegir qué anunciar → 3 textos → editar → imagen en vivo.
// La misma vista sirve al panel real y a la demo; la diferencia es solo
// qué hace `generar` (Claude vs. opciones pre-escritas).

const TIPO_LABEL: Record<Tipo, string> = {
  servicio: 'Un servicio',
  promo: 'Promoción',
  horarios: 'Horarios libres',
  fecha: 'Fecha especial',
  libre: 'Tema libre',
};
const FORMATO_LABEL: Record<Formato, string> = { feed: 'Post (cuadrado)', historia: 'Historia', whatsapp: 'WhatsApp' };
const PLANTILLA_LABEL: Record<Plantilla, string> = {
  precio: 'Precio grande',
  horarios: 'Horarios libres',
  temporada: 'Temporada',
  servicio: 'Servicio destacado',
  lealtad: 'Tarjeta de lealtad',
};

const chip = (activo: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
    activo ? 'bg-primary text-[rgb(var(--color-cta-fg))]' : 'bg-ink/[0.05] text-ink hover:bg-ink/[0.09]'
  }`;
const area =
  'w-full rounded-xl border border-border bg-surface px-3 py-2 text-[15px] leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';

export function PostsVista({
  slug,
  catalogo,
  usadas,
  historial: historialInicial,
  generar,
  demo = false,
}: {
  slug: string;
  catalogo: Catalogo;
  usadas: number;
  historial: Generacion[];
  generar: (pedido: Pedido) => Promise<RespGenerar>;
  demo?: boolean;
}) {
  const hayPromo = catalogo.promos.length > 0 || catalogo.lealtad !== null;
  const [tipo, setTipo] = useState<Tipo>('servicio');
  const [formato, setFormato] = useState<Formato>('feed');
  const [servicioId, setServicioId] = useState(catalogo.servicios[0]?.id ?? '');
  const [promoId, setPromoId] = useState(catalogo.promos[0]?.id ?? '');
  const [fechaId, setFechaId] = useState<string>(FECHAS[0].id);
  const [tema, setTema] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quedan, setQuedan] = useState(Math.max(0, LIMITE_MENSUAL - usadas));
  const [historial, setHistorial] = useState(historialInicial);

  // Lo que se está editando.
  const [gen, setGen] = useState<Generacion | null>(null);
  const [elegida, setElegida] = useState(0);
  const [texto, setTexto] = useState('');
  const [titular, setTitular] = useState('');
  const [base, setBase] = useState<BaseImagen | null>(null);
  const [formatoImg, setFormatoImg] = useState<Formato>('feed');
  const [copiado, setCopiado] = useState(false);

  function abrir(g: Generacion, i = 0) {
    setGen(g);
    setElegida(i);
    setTexto(g.opciones[i]?.texto ?? '');
    setTitular(g.opciones[i]?.titular ?? '');
    setBase(g.base);
    setFormatoImg(g.formato === 'historia' ? 'historia' : 'feed');
  }

  async function onGenerar() {
    setCargando(true);
    setError(null);
    const r = await generar({ tipo, formato, servicioId, promoId, fechaId, tema });
    setCargando(false);
    if (!r.ok) return setError(r.error);
    setQuedan(r.restantes);
    setHistorial((h) => [r.generacion, ...h.filter((x) => x.id !== r.generacion.id)].slice(0, 20));
    abrir(r.generacion);
  }

  // La imagen se pide 400 ms después de la última tecla, no en cada una.
  const urlActual = gen && base && gen.formato !== 'whatsapp' ? imagenUrl(slug, formatoImg, titular, base) : null;
  const [url, setUrl] = useState<string | null>(urlActual);
  useEffect(() => {
    const t = setTimeout(() => setUrl(urlActual), 400);
    return () => clearTimeout(t);
  }, [urlActual]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      setError('No se pudo copiar. Selecciona el texto y cópialo a mano.');
    }
  }

  const editarBase = (cambio: Partial<BaseImagen>) => setBase((b) => (b ? { ...b, ...cambio } : b));
  const sinServicios = catalogo.servicios.length === 0;

  return (
    <div className="mt-8 flex flex-col gap-8">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink">¿Qué quieres anunciar?</h2>
          <p className="text-sm text-muted">
            {demo ? 'Demo: opciones de ejemplo' : `Te quedan ${quedan} de ${LIMITE_MENSUAL} este mes`}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(TIPO_LABEL) as Tipo[])
            .filter((t) => t !== 'promo' || hayPromo)
            .map((t) => (
              <button key={t} type="button" className={chip(tipo === t)} onClick={() => setTipo(t)} aria-pressed={tipo === t}>
                {TIPO_LABEL[t]}
              </button>
            ))}
        </div>

        <div className="mt-4">
          {(tipo === 'servicio' || tipo === 'horarios') &&
            (sinServicios ? (
              <p className="text-sm text-muted">Primero da de alta tus servicios.</p>
            ) : (
              <>
                <Label htmlFor="post-servicio">{tipo === 'horarios' ? 'Para qué servicio buscar huecos' : 'Servicio'}</Label>
                <Select id="post-servicio" className="w-full" value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
                  {catalogo.servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </>
            ))}
          {tipo === 'promo' && (
            <>
              <Label htmlFor="post-promo">Promoción</Label>
              <Select id="post-promo" className="w-full" value={promoId} onChange={(e) => setPromoId(e.target.value)}>
                {catalogo.promos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titulo}
                  </option>
                ))}
                {catalogo.lealtad && <option value="">Mi tarjeta de lealtad</option>}
              </Select>
            </>
          )}
          {tipo === 'fecha' && (
            <>
              <Label htmlFor="post-fecha">Fecha</Label>
              <Select id="post-fecha" className="w-full" value={fechaId} onChange={(e) => setFechaId(e.target.value)}>
                {FECHAS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </Select>
            </>
          )}
          {tipo === 'libre' && (
            <>
              <Label htmlFor="post-tema">De qué quieres el post</Label>
              <textarea
                id="post-tema"
                rows={3}
                maxLength={TOPE.tema}
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ej. ya tenemos esmaltes nuevos de temporada"
                className={area}
              />
            </>
          )}
        </div>

        <h2 className="mt-6 text-[15px] font-semibold text-ink">Formato</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(FORMATO_LABEL) as Formato[]).map((f) => (
            <button key={f} type="button" className={chip(formato === f)} onClick={() => setFormato(f)} aria-pressed={formato === f}>
              {FORMATO_LABEL[f]}
            </button>
          ))}
        </div>

        <Button
          className="mt-6 w-full sm:w-auto"
          onClick={onGenerar}
          isLoading={cargando}
          disabled={(!demo && quedan === 0) || ((tipo === 'servicio' || tipo === 'horarios') && sinServicios)}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {cargando ? 'Escribiendo…' : 'Generar 3 opciones'}
        </Button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-error">
            {error}
          </p>
        )}
      </Card>

      {gen && (
        <section>
          <SectionHeading title="Escoge una y edítala" />
          <div className="grid gap-3 sm:grid-cols-3">
            {gen.opciones.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => abrir(gen, i)}
                aria-pressed={elegida === i}
                className={`rounded-2xl p-4 text-left text-sm leading-relaxed ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  elegida === i ? 'bg-surface ring-2 ring-primary' : 'bg-paper ring-border hover:bg-surface'
                }`}
              >
                <span className="block font-semibold text-ink">Opción {i + 1}</span>
                <span className="mt-1 line-clamp-5 whitespace-pre-line text-muted">{o.texto}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="post-texto">Texto</Label>
                <textarea id="post-texto" rows={9} value={texto} onChange={(e) => setTexto(e.target.value)} className={area} />
              </div>

              {base && gen.formato !== 'whatsapp' && (
                <>
                  <div>
                    <Label htmlFor="post-titular">Titular de la imagen</Label>
                    <Input id="post-titular" className="w-full" maxLength={TOPE.titular} value={titular} onChange={(e) => setTitular(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="post-plantilla">Diseño</Label>
                      <Select
                        id="post-plantilla"
                        className="w-full"
                        value={base.plantilla}
                        onChange={(e) => editarBase({ plantilla: e.target.value as Plantilla })}
                      >
                        {PLANTILLAS.map((p) => (
                          <option key={p} value={p}>
                            {PLANTILLA_LABEL[p]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="post-fimg">Tamaño</Label>
                      <Select id="post-fimg" className="w-full" value={formatoImg} onChange={(e) => setFormatoImg(e.target.value as Formato)}>
                        <option value="feed">Cuadrado</option>
                        <option value="historia">Historia</option>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="post-detalle">Texto chico</Label>
                    <Input id="post-detalle" className="w-full" maxLength={TOPE.detalle} value={base.detalle} onChange={(e) => editarBase({ detalle: e.target.value })} />
                  </div>
                  {(base.plantilla === 'precio' || base.plantilla === 'servicio') && (
                    <div>
                      <Label htmlFor="post-precio">Precio (opcional)</Label>
                      <Input id="post-precio" className="w-full" maxLength={TOPE.precio} value={base.precio} onChange={(e) => editarBase({ precio: e.target.value })} />
                    </div>
                  )}
                  {base.plantilla === 'horarios' && (
                    <div>
                      <Label htmlFor="post-lineas">Horarios (uno por renglón)</Label>
                      <textarea
                        id="post-lineas"
                        rows={4}
                        value={base.lineas.join('\n')}
                        onChange={(e) => editarBase({ lineas: e.target.value.split('\n').slice(0, TOPE.lineas) })}
                        className={area}
                      />
                    </div>
                  )}
                  {base.plantilla === 'lealtad' && (
                    <div>
                      <Label htmlFor="post-sellos">Sellos de la tarjeta</Label>
                      <Input
                        id="post-sellos"
                        type="number"
                        min={2}
                        max={12}
                        className="w-full"
                        value={base.sellos}
                        onChange={(e) => editarBase({ sellos: Math.min(12, Math.max(2, Number(e.target.value) || 2)) })}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={copiar}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copiado ? '¡Copiado!' : 'Copiar texto'}
                </Button>
                {url && (
                  <a
                    href={url}
                    download="post.png"
                    className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-glass/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Descargar imagen
                  </a>
                )}
                <a
                  href={waShareHref(texto)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-[rgb(var(--color-cta-fg))] shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Compartir en WhatsApp
                </a>
              </div>
            </div>

            {url && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Vista previa</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Vista previa de la imagen del post"
                  className={`w-full rounded-2xl bg-ink/[0.04] ring-1 ring-border ${formatoImg === 'historia' ? 'mx-auto aspect-[9/16] max-w-xs' : 'aspect-square'}`}
                />
              </div>
            )}
          </div>
        </section>
      )}

      <section>
        <SectionHeading title="Lo que has generado" />
        {historial.length === 0 ? (
          <p className="text-sm text-muted">Todavía nada. Tus posts aparecerán aquí.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
            {historial.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => abrir(g)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-ink/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="min-w-0 truncate font-medium text-ink">{g.resumen}</span>
                  <span className="shrink-0 text-muted">
                    {FORMATO_LABEL[g.formato]} · {new Date(g.cuando).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
