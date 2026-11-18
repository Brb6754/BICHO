'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Minus, Package, PackagePlus, Pencil, Plus } from 'lucide-react';
import { Barra, Chip } from '@/components/tenant-dash/dinero/Visual';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { addDaysKey, dayLabel } from '@/lib/dates/tenantTime';
import { METODOS, formatoPesos, type Metodo } from '@/lib/caja/resumen';
import {
  TIPOS_MOVIMIENTO,
  formatoCantidad,
  ordenarProductos,
  parseCantidad,
  seAcaba,
  ventaSugeridaCents,
  type MovimientoInventario,
  type Producto,
  type TipoMovimiento,
} from '@/lib/inventario/logica';
import { borrarProducto, guardarProducto, registrarMovimiento } from '@/app/t/[slug]/dashboard/inventario/actions';

// INVENTARIO — "¿qué tengo y qué se me está acabando?" en una pantalla.
// Celular primero: el aviso arriba, "Llegó producto" (lo que más se
// hace) como acción principal, la lista con los que se acaban primero y
// el historial.

const METODO_LABEL: Record<Metodo, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
};

// Lo que pasó con el producto, dicho como lo diría ella.
const QUE_PASO: Record<TipoMovimiento, { boton: string; historial: string; cantidad: string }> = {
  entrada: { boton: 'Llegó / compré', historial: 'Llegó', cantidad: '¿Cuántos llegaron?' },
  uso: { boton: 'Lo usé', historial: 'Se usó', cantidad: '¿Cuántos usaste?' },
  venta: { boton: 'Lo vendí', historial: 'Se vendió', cantidad: '¿Cuántos vendiste?' },
  ajuste: { boton: 'Lo conté', historial: 'Conteo', cantidad: '¿Cuántos hay ahora?' },
};

const CHIP =
  'inline-flex min-h-11 items-center justify-center rounded-xl px-2 text-sm font-medium ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const chip = (activo: boolean) =>
  `${CHIP} ${activo ? 'bg-primary/[0.14] text-ink ring-primary/40' : 'text-muted ring-border hover:text-ink'}`;

type Res = { ok: true } | { ok: false; error: string };

/**
 * "2 tubos", "1 frasco", "3 ml". La unidad se guarda en singular; aquí
 * se pluraliza como en español. Las abreviaturas (ml, kg, gr, pz.) se
 * quedan igual.
 */
function conUnidad(n: number, unidad: string): string {
  const u = unidad.trim();
  const cant = formatoCantidad(n);
  if (!u) return cant;
  if (n === 1 || u.length <= 2 || u.endsWith('.')) return `${cant} ${u}`;
  if (/[aeiouáéó]$/i.test(u)) return `${cant} ${u}s`;
  if (/z$/i.test(u)) return `${cant} ${u.slice(0, -1)}ces`;
  if (/s$/i.test(u)) return `${cant} ${u}`;
  return `${cant} ${u}es`;
}

function etiquetaDia(key: string, hoy: string): string {
  if (key === hoy) return 'Hoy';
  if (key === addDaysKey(hoy, -1)) return 'Ayer';
  return dayLabel(key, new Date(0), 'UTC');
}

export function InventarioBoard({
  slug,
  hoy,
  productos,
  movimientos,
  cajaActiva = false,
  soloLectura = false,
}: {
  slug: string;
  hoy: string;
  productos: Producto[];
  movimientos: MovimientoInventario[];
  /** Caja (db/045) prendida: una venta puede anotarse también ahí. */
  cajaActiva?: boolean;
  /** El panel de demostración: se ve todo, no se guarda nada. */
  soloLectura?: boolean;
}) {
  const [producto, setProducto] = useState<Producto | 'nuevo' | null>(null);
  const [mover, setMover] = useState<{ p: Producto; tipo: TipoMovimiento } | null>(null);

  // En la demo nada se guarda: lo que "llega" o se "usa" se suma aquí,
  // para que se vea moverse como en el panel de verdad.
  const [ajusteDemo, setAjusteDemo] = useState<Record<string, number>>({});
  const vistos = soloLectura ? productos.map((p) => ({ ...p, stock: Math.max(0, p.stock + (ajusteDemo[p.id] ?? 0)) })) : productos;
  const simular = (id: string, cambio: number) => setAjusteDemo((a) => ({ ...a, [id]: (a[id] ?? 0) + cambio }));
  const ordenados = ordenarProductos(vistos);
  const acabandose = ordenados.filter(seAcaba);
  const nombreDe = new Map(productos.map((p) => [p.id, p]));
  const hay = ordenados.length > 0;

  const llego = () => hay && setMover({ p: acabandose[0] ?? ordenados[0], tipo: 'entrada' });
  const agregar = () => setProducto('nuevo');

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Cuánto te queda de cada producto y qué pedir."
        action={
          hay ? (
            <Button type="button" onClick={llego} className="min-h-11">
              <PackagePlus className="h-4 w-4" aria-hidden="true" /> Llegó producto
            </Button>
          ) : soloLectura ? undefined : (
            <Button type="button" onClick={agregar} className="min-h-11">
              <Plus className="h-4 w-4" aria-hidden="true" /> Agregar producto
            </Button>
          )
        }
        actions={
          !soloLectura &&
          hay && (
            <Button type="button" variant="outline" onClick={agregar} className="min-h-11 max-sm:flex-1">
              <Plus className="h-4 w-4" aria-hidden="true" /> Producto nuevo
            </Button>
          )
        }
      />

      {!hay ? (
        <div className="mt-6 rounded-3xl bg-surface ring-1 ring-border">
          <EmptyState
            icon={Package}
            title="Todavía no tienes productos"
            description="Agrega los esmaltes, tintes o cremas que usas o vendes, y cuántos tienes hoy."
            why="Te avisamos antes de que se te acaben, para que no le quedes mal a una clienta."
            action={
              !soloLectura && (
                <Button type="button" onClick={agregar} className="min-h-11">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Agregar mi primer producto
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          {acabandose.length > 0 && (
            <section className="mt-6" aria-labelledby="inv-acaban">
              <h2 id="inv-acaban" role="status" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink">
                <AlertTriangle className="h-5 w-5 shrink-0 text-error" aria-hidden="true" />
                {acabandose.length === 1 ? 'Se te está acabando 1 producto' : `Se te están acabando ${acabandose.length} productos`}
              </h2>
              <p className="mt-1 text-[15px] text-muted">Cuando llegue el pedido, súmalo con «+» o con «Llegó producto».</p>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {acabandose.map((p) => (
                  <TarjetaProducto
                    key={p.id}
                    slug={slug}
                    hoy={hoy}
                    p={p}
                    soloLectura={soloLectura}
                    onAnotar={() => setMover({ p, tipo: p.precioCents != null ? 'venta' : 'uso' })}
                    onEditar={() => setProducto(p)}
                    onDemo={(cambio) => simular(p.id, cambio)}
                  />
                ))}
              </ul>
            </section>
          )}
          {ordenados.length > acabandose.length && (
            <section className="mt-8" aria-labelledby="inv-bien">
              <h2 id="inv-bien" className="text-[17px] font-semibold tracking-tight text-ink">
                {acabandose.length > 0 ? 'Bien surtidos' : 'Tus productos'}
              </h2>
              <p className="mt-1 text-[15px] text-muted">Toca «+» o «−» para sumar o restar uno al momento.</p>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {ordenados.filter((p) => !seAcaba(p)).map((p) => (
                  <TarjetaProducto
                    key={p.id}
                    slug={slug}
                    hoy={hoy}
                    p={p}
                    soloLectura={soloLectura}
                    onAnotar={() => setMover({ p, tipo: p.precioCents != null ? 'venta' : 'uso' })}
                    onEditar={() => setProducto(p)}
                    onDemo={(cambio) => simular(p.id, cambio)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {movimientos.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[17px] font-semibold tracking-tight text-ink">Lo último que anotaste</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {movimientos.map((m) => {
              const p = nombreDe.get(m.productoId);
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-ink">{p?.nombre ?? 'Producto borrado'}</p>
                    <p className="mt-0.5 truncate text-[13px] text-muted">
                      {etiquetaDia(m.dia, hoy)} · {QUE_PASO[m.tipo].historial}
                      {m.nota && ` · ${m.nota}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`text-[15px] font-semibold tabular-nums ${m.cantidad < 0 ? 'text-ink' : 'text-success'}`}
                    >
                      {m.cantidad > 0 ? '+' : m.cantidad < 0 ? '−' : '±'}
                      {formatoCantidad(Math.abs(m.cantidad))}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">quedan {formatoCantidad(m.stockDespues)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {producto && (
        <FormProducto slug={slug} producto={producto === 'nuevo' ? null : producto} onClose={() => setProducto(null)} />
      )}
      {mover && (
        <FormMovimiento
          slug={slug}
          hoy={hoy}
          productos={ordenados}
          inicial={mover.p}
          tipoInicial={mover.tipo}
          cajaActiva={cajaActiva}
          onClose={() => setMover(null)}
          onDemo={soloLectura ? simular : undefined}
        />
      )}
    </div>
  );
}

// El medidor: verde = bien surtido, amarillo = queda poco, rojo = pide más.
// Siempre con su texto: el color solo no le dice nada a quien no lo distingue.
function nivelDe(p: Pick<Producto, 'stock' | 'stockMinimo'>): { tono: 'success' | 'warning' | 'error'; texto: string } {
  if (seAcaba(p)) return { tono: 'error', texto: 'Pide más' };
  if (p.stock <= p.stockMinimo * 2) return { tono: 'warning', texto: 'Queda poco' };
  return { tono: 'success', texto: 'Bien surtido' };
}

const BOTON_PASO =
  'inline-flex min-h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl text-[17px] font-semibold ring-1 transition active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40';

function TarjetaProducto({
  slug,
  hoy,
  p,
  soloLectura,
  onAnotar,
  onEditar,
  onDemo,
}: {
  slug: string;
  hoy: string;
  p: Producto;
  soloLectura: boolean;
  onAnotar: () => void;
  onEditar: () => void;
  /** Demo: el tablero suma el cambio en pantalla, sin guardar. */
  onDemo: (cambio: number) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Lo que se ve al instante mientras el servidor confirma (+/- optimista).
  // Al llegar el stock nuevo del servidor, el ajuste local vuelve a cero.
  const [delta, setDelta] = useState(0);
  const [base, setBase] = useState(p.stock);
  if (base !== p.stock) {
    setBase(p.stock);
    setDelta(0);
  }

  const stock = p.stock + delta;
  const nivel = nivelDe({ stock, stockMinimo: p.stockMinimo });
  const tope = Math.max(p.stockMinimo * 3, stock, 1);

  function mover(signo: 1 | -1) {
    if (pending || (signo < 0 && stock < 1)) return;
    const nuevo = stock + signo;
    if (soloLectura) {
      onDemo(signo);
      return toast(`${signo > 0 ? 'Sumaste' : 'Restaste'} 1: ahora tienes ${conUnidad(nuevo, p.unidad)} (demo, no se guarda)`);
    }
    setDelta((d) => d + signo);
    startTransition(async () => {
      const r = await registrarMovimiento(slug, {
        productoId: p.id,
        tipo: signo > 0 ? 'entrada' : 'uso',
        cantidad: '1',
        dia: hoy,
        nota: '',
      });
      if (!r.ok) {
        setDelta((d) => d - signo);
        toast(r.error, 'error');
        return;
      }
      toast(`${signo > 0 ? 'Sumaste' : 'Restaste'} 1: ahora tienes ${conUnidad(nuevo, p.unidad)}`);
      router.refresh();
    });
  }

  const unidad = p.unidad ? conUnidad(stock, p.unidad).replace(/^\S+\s?/, '') : '';

  return (
    <li
      className={`flex flex-col rounded-3xl bg-surface p-5 ${nivel.tono === 'error' ? 'ring-2 ring-error/40' : 'ring-1 ring-border'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-ink">{p.nombre}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            Aviso cuando {p.stockMinimo === 1 ? 'quede' : 'queden'} {conUnidad(p.stockMinimo, p.unidad)}
          </p>
        </div>
        <Chip tono={nivel.tono}>{nivel.texto}</Chip>
      </div>

      <p className="mt-4 flex items-baseline gap-2" aria-live="polite">
        <span className="text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-ink">{formatoCantidad(stock)}</span>
        <span className="text-[15px] font-medium text-muted">{unidad || (stock === 1 ? 'queda' : 'quedan')}</span>
      </p>
      <div className="mt-3">
        <Barra pct={(stock / tope) * 100} tono={nivel.tono} label={`Cuánto queda de ${p.nombre}`} grueso />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => mover(-1)}
          disabled={stock < 1 || pending}
          aria-label={`Restar 1 a ${p.nombre}`}
          className={`${BOTON_PASO} bg-surface text-ink ring-border hover:bg-ink/[0.04]`}
        >
          <Minus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /> 1
        </button>
        <button
          type="button"
          onClick={() => mover(1)}
          disabled={pending}
          aria-label={`Sumar 1 a ${p.nombre}`}
          className={`${BOTON_PASO} bg-primary/10 text-ink ring-primary/30 hover:bg-primary/15`}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" /> 1
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2">
          <button
            type="button"
            onClick={onAnotar}
            className="inline-flex min-h-11 items-center text-[15px] font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Lo vendí, llegó o lo conté
          </button>
          {!soloLectura && (
            <button
              type="button"
              onClick={onEditar}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-medium text-muted hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
            </button>
          )}
        </div>
    </li>
  );
}

function useCorrer(onClose: () => void) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function correr(accion: () => Promise<Res>, listo: string) {
    setGuardando(true);
    setError(null);
    const r = await accion();
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    toast(listo);
    router.refresh();
    onClose();
  }
  return { guardando, error, correr };
}

function AvisoError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-error-soft px-4 py-3 text-sm text-error">
      {error}
    </p>
  );
}

const pesos = (cents: number | null) => (cents == null ? '' : String(cents / 100));

function FormProducto({ slug, producto, onClose }: { slug: string; producto: Producto | null; onClose: () => void }) {
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [unidad, setUnidad] = useState(producto?.unidad ?? 'pieza');
  const [stockInicial, setStockInicial] = useState('');
  const [stockMinimo, setStockMinimo] = useState(producto ? formatoCantidad(producto.stockMinimo) : '');
  const [costo, setCosto] = useState(pesos(producto?.costoCents ?? null));
  const [precio, setPrecio] = useState(pesos(producto?.precioCents ?? null));
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const { guardando, error, correr } = useCorrer(onClose);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    correr(
      () => guardarProducto(slug, { id: producto?.id, nombre, unidad, stockInicial, stockMinimo, costo, precio }),
      producto ? 'Cambios guardados' : 'Producto agregado',
    );
  }

  return (
    <Modal open onClose={onClose} title={producto ? `Editar ${producto.nombre}` : 'Producto nuevo'} size="lg">
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <FormField label="¿Cómo se llama?">
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={80}
            placeholder="Ej. esmalte gel rojo, tinte 7.1"
            className="w-full"
            required
            autoFocus
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="¿Cómo lo cuentas?" hint="pieza, frasco, tubo, litro">
            <Input value={unidad} onChange={(e) => setUnidad(e.target.value)} maxLength={20} className="w-full" />
          </FormField>
          {producto ? (
            <div>
              <p className="text-[13px] font-medium text-ink">Tienes hoy</p>
              <p className="py-2.5 text-[15px] font-semibold tabular-nums text-ink">
                {conUnidad(producto.stock, producto.unidad)}
              </p>
              <p className="text-xs text-muted">Se cambia con «Lo conté» desde la lista.</p>
            </div>
          ) : (
            <FormField label="¿Cuántos tienes hoy?">
              <Input
                inputMode="decimal"
                value={stockInicial}
                onChange={(e) => setStockInicial(e.target.value)}
                placeholder="0"
                className="w-full tabular-nums"
              />
            </FormField>
          )}
        </div>
        <FormField label="Avísame cuando queden" hint="Te sale un aviso en tu inicio y aquí arriba.">
          <Input
            inputMode="decimal"
            value={stockMinimo}
            onChange={(e) => setStockMinimo(e.target.value)}
            placeholder="2"
            className="w-full tabular-nums"
          />
        </FormField>

        <details className="group" open={Boolean(costo || precio)}>
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-muted underline decoration-dotted underline-offset-4 hover:text-ink">
            Precio y costo (opcional)
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <FormField label="A cuánto lo vendes" hint="Vacío si solo lo usas tú.">
              <Input
                inputMode="decimal"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="$0"
                className="w-full tabular-nums"
              />
            </FormField>
            <FormField label="Cuánto te cuesta">
              <Input
                inputMode="decimal"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="$0"
                className="w-full tabular-nums"
              />
            </FormField>
          </div>
        </details>

        <AvisoError error={error} />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {producto ? (
            confirmarBorrar ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink">¿Borrarlo? También se borra su historial.</span>
                <Button
                  type="button"
                  variant="danger"
                  className="min-h-11"
                  disabled={guardando}
                  onClick={() => correr(() => borrarProducto(slug, producto.id), 'Producto borrado')}
                >
                  Sí, borrar
                </Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setConfirmarBorrar(false)}>
                  No, conservarlo
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => setConfirmarBorrar(true)}
                disabled={guardando}
              >
                Borrar producto
              </Button>
            )
          ) : (
            <span />
          )}
          <Button type="submit" isLoading={guardando} className="min-h-11 max-sm:w-full">
            {guardando ? 'Guardando…' : producto ? 'Guardar cambios' : 'Agregar producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FormMovimiento({
  slug,
  hoy,
  productos,
  inicial,
  tipoInicial,
  cajaActiva,
  onClose,
  onDemo,
}: {
  slug: string;
  hoy: string;
  productos: Producto[];
  inicial: Producto;
  tipoInicial: TipoMovimiento;
  cajaActiva: boolean;
  onClose: () => void;
  /** Demo: suma el cambio en pantalla en vez de guardarlo. */
  onDemo?: (productoId: string, cambio: number) => void;
}) {
  const [productoId, setProductoId] = useState(inicial.id);
  const [tipo, setTipo] = useState<TipoMovimiento>(tipoInicial);
  const [cantidad, setCantidad] = useState(tipoInicial === 'ajuste' ? formatoCantidad(inicial.stock) : '1');
  const [dia, setDia] = useState(hoy);
  const [nota, setNota] = useState('');
  const [enCaja, setEnCaja] = useState(cajaActiva);
  const [monto, setMonto] = useState<string | null>(null); // null = sugerido
  const [metodo, setMetodo] = useState<Metodo>('efectivo');
  const { guardando, error, correr } = useCorrer(onClose);

  const p = productos.find((x) => x.id === productoId) ?? inicial;
  const n = parseCantidad(cantidad);
  const sugerido = ventaSugeridaCents(p.precioCents, n ?? 0);
  const montoVisible = monto ?? (sugerido != null ? String(sugerido / 100) : '');
  const conCaja = tipo === 'venta' && cajaActiva && enCaja;
  // Lo que va a quedar, antes de guardar: así nota si se equivocó de número.
  const quedara = n === null ? null : tipo === 'ajuste' ? n : tipo === 'entrada' ? p.stock + n : p.stock - n;

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (onDemo) {
      if (quedara === null || quedara < 0) return;
      onDemo(productoId, quedara - p.stock);
      toast(`Anotado: ahora tienes ${conUnidad(quedara, p.unidad)} (demo, no se guarda)`);
      return onClose();
    }
    correr(
      () =>
        registrarMovimiento(slug, {
          productoId,
          tipo,
          cantidad,
          dia,
          nota,
          enCaja: conCaja ? { monto: montoVisible, metodo } : null,
        }),
      quedara === null ? 'Anotado' : `Anotado: ahora tienes ${conUnidad(quedara, p.unidad)}`,
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={tipoInicial === 'entrada' ? 'Llegó producto' : `¿Qué pasó con ${inicial.nombre}?`}
      size="lg"
    >
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <FormField label="Producto" hint={`Tienes ${conUnidad(p.stock, p.unidad)}`}>
          <Select value={productoId} onChange={(e) => setProductoId(e.target.value)} className="w-full">
            {productos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
              </option>
            ))}
          </Select>
        </FormField>

        <fieldset className="min-w-0">
          <legend className="mb-1.5 block text-[13px] font-medium text-ink">¿Qué pasó?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIPOS_MOVIMIENTO.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tipo === t}
                onClick={() => setTipo(t)}
                className={chip(tipo === t)}
              >
                {QUE_PASO[t].boton}
              </button>
            ))}
          </div>
        </fieldset>

        <FormField
          label={`${QUE_PASO[tipo].cantidad} (${p.unidad || 'piezas'})`}
          hint={tipo === 'ajuste' ? 'Lo que contaste en el anaquel.' : undefined}
        >
          <Input
            inputMode="decimal"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            className="w-full text-lg tabular-nums"
            required
            autoFocus
          />
        </FormField>
        {quedara !== null && (
          <p className={`-mt-2 text-sm ${quedara < 0 ? 'text-error' : 'text-muted'}`}>
            {quedara < 0
              ? `Solo tienes ${conUnidad(p.stock, p.unidad)}. Si contaste más, usa «Lo conté».`
              : `Te van a quedar ${conUnidad(quedara, p.unidad)}.`}
          </p>
        )}

        {tipo === 'venta' && cajaActiva && (
          <div className="rounded-2xl bg-paper p-4 ring-1 ring-border">
            <label className="flex min-h-11 items-center gap-3 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={enCaja}
                onChange={(e) => setEnCaja(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-[rgb(var(--color-primary))]"
              />
              Anotar también el cobro en tu Caja
            </label>
            {enCaja && (
              <div className="mt-3 flex flex-col gap-3">
                <FormField label="¿Cuánto cobraste?">
                  <Input
                    inputMode="decimal"
                    value={montoVisible}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="$0"
                    className="w-full tabular-nums"
                    required
                  />
                </FormField>
                <fieldset className="min-w-0">
                  <legend className="mb-1.5 block text-[13px] font-medium text-ink">¿Cómo te pagaron?</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {METODOS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={metodo === m}
                        onClick={() => setMetodo(m)}
                        className={chip(metodo === m)}
                      >
                        {METODO_LABEL[m]}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
          </div>
        )}

        <details className="group" open={dia !== hoy || nota !== ''}>
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-muted underline decoration-dotted underline-offset-4 hover:text-ink">
            Agregar una nota o cambiar el día
          </summary>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="¿Qué día fue?">
              <Input type="date" value={dia} max={hoy} onChange={(e) => setDia(e.target.value)} className="w-full" />
            </FormField>
            <FormField label="Nota" optional>
              <Input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                maxLength={200}
                placeholder="Ej. proveedor, se rompió"
                className="w-full"
              />
            </FormField>
          </div>
        </details>

        <AvisoError error={error} />

        <div className="flex justify-end pt-1">
          <Button type="submit" isLoading={guardando} className="min-h-11 max-sm:w-full">
            {guardando ? 'Guardando…' : 'Anotar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
