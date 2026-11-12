'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeftRight, Package, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { addDaysKey, dayLabel } from '@/lib/dates/tenantTime';
import { METODOS, formatoPesos, type Metodo } from '@/lib/caja/resumen';
import {
  TIPOS_MOVIMIENTO,
  TIPO_LABEL,
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
// Celular primero: el aviso arriba, el botón que se usa diario, la
// lista de productos (los que se acaban primero) y el historial.

const METODO_LABEL: Record<Metodo, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

type Res = { ok: true } | { ok: false; error: string };

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
  const [mover, setMover] = useState<Producto | null>(null);

  const ordenados = ordenarProductos(productos);
  const acabandose = ordenados.filter(seAcaba);
  const nombreDe = new Map(productos.map((p) => [p.id, p]));

  return (
    <div className="mt-6">
      {acabandose.length > 0 && (
        <section
          role="status"
          className="rounded-2xl border border-warning/30 bg-warning-soft px-5 py-4"
          aria-label="Productos que se están acabando"
        >
          <p className="flex items-center gap-2 font-semibold text-ink">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            {acabandose.length === 1 ? 'Se está acabando 1 producto' : `Se están acabando ${acabandose.length} productos`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {acabandose.map((p) => `${p.nombre} (${formatoCantidad(p.stock)} ${p.unidad})`).join(' · ')}
          </p>
        </section>
      )}

      {!soloLectura && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={() => setMover(ordenados[0] ?? null)}
            disabled={!productos.length}
            className="py-3.5"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" /> Movimiento
          </Button>
          <Button type="button" variant="secondary" onClick={() => setProducto('nuevo')} className="py-3.5">
            <Plus className="h-4 w-4" aria-hidden="true" /> Producto
          </Button>
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-[15px] font-semibold text-ink">Productos</h2>
        {!ordenados.length ? (
          <div className="mt-3">
            <EmptyState
              icon={Package}
              title="Todavía no hay productos"
              description="Agrega los esmaltes, tintes o cremas que usas o vendes y te avisamos cuando se estén acabando."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {ordenados.map((p) => {
              const bajo = seAcaba(p);
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    disabled={soloLectura}
                    onClick={() => setMover(p)}
                    className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default"
                    aria-label={soloLectura ? undefined : `Anotar movimiento de ${p.nombre}`}
                  >
                    <p className="truncate text-[15px] text-ink">{p.nombre}</p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      Mínimo {formatoCantidad(p.stockMinimo)}
                      {p.precioCents != null && ` · Venta ${formatoPesos(p.precioCents)}`}
                      {p.costoCents != null && ` · Costo ${formatoPesos(p.costoCents)}`}
                    </p>
                  </button>
                  <div className="shrink-0 text-right">
                    <p className={`text-lg font-bold leading-none tabular-nums ${bajo ? 'text-warning' : 'text-ink'}`}>
                      {formatoCantidad(p.stock)}
                    </p>
                    <p className="mt-1 text-[12px] text-muted">{bajo ? 'Se acaba' : p.unidad}</p>
                  </div>
                  {!soloLectura && (
                    <button
                      type="button"
                      onClick={() => setProducto(p)}
                      className="shrink-0 rounded-full p-2 text-muted transition hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label={`Editar ${p.nombre}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {movimientos.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[15px] font-semibold text-ink">Últimos movimientos</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {movimientos.map((m) => {
              const p = nombreDe.get(m.productoId);
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-ink">{p?.nombre ?? 'Producto borrado'}</p>
                    <p className="mt-0.5 truncate text-[13px] text-muted">
                      {etiquetaDia(m.dia, hoy)} · {TIPO_LABEL[m.tipo]}
                      {m.nota && ` · ${m.nota}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-[15px] font-semibold tabular-nums ${m.cantidad < 0 ? 'text-ink' : 'text-success'}`}>
                      {m.cantidad > 0 ? '+' : m.cantidad < 0 ? '−' : '±'}
                      {formatoCantidad(Math.abs(m.cantidad))}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">quedan {formatoCantidad(m.stockDespues)}</p>
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
          inicial={mover}
          cajaActiva={cajaActiva}
          onClose={() => setMover(null)}
        />
      )}
    </div>
  );
}

function useCorrer(onClose: () => void) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function correr(accion: () => Promise<Res>) {
    setGuardando(true);
    setError(null);
    const r = await accion();
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
    onClose();
  }
  return { guardando, error, correr };
}

const pesos = (cents: number | null) => (cents == null ? '' : String(cents / 100));

function FormProducto({ slug, producto, onClose }: { slug: string; producto: Producto | null; onClose: () => void }) {
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [unidad, setUnidad] = useState(producto?.unidad ?? 'pieza');
  const [stockInicial, setStockInicial] = useState('');
  const [stockMinimo, setStockMinimo] = useState(producto ? formatoCantidad(producto.stockMinimo) : '');
  const [costo, setCosto] = useState(pesos(producto?.costoCents ?? null));
  const [precio, setPrecio] = useState(pesos(producto?.precioCents ?? null));
  const { guardando, error, correr } = useCorrer(onClose);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    correr(() =>
      guardarProducto(slug, { id: producto?.id, nombre, unidad, stockInicial, stockMinimo, costo, precio })
    );
  }

  function borrar() {
    if (!producto) return;
    if (!window.confirm(`¿Borrar ${producto.nombre}? También se borra su historial de movimientos.`)) return;
    correr(() => borrarProducto(slug, producto.id));
  }

  return (
    <Modal open onClose={onClose} title={producto ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="inv-nombre">Nombre</Label>
          <Input
            id="inv-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={80}
            placeholder="Esmalte gel rojo, tinte 7.1…"
            className="w-full"
            required
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inv-unidad">Unidad</Label>
            <Input
              id="inv-unidad"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              maxLength={20}
              placeholder="pieza, frasco, litro"
              className="w-full"
            />
          </div>
          {producto ? (
            <div>
              <Label>Stock actual</Label>
              <p className="py-2.5 text-[15px] font-semibold tabular-nums text-ink">
                {formatoCantidad(producto.stock)}
                <span className="ml-1 text-xs font-normal text-muted">(cámbialo con un ajuste)</span>
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="inv-stock">¿Cuántos tienes hoy?</Label>
              <Input
                id="inv-stock"
                inputMode="decimal"
                value={stockInicial}
                onChange={(e) => setStockInicial(e.target.value)}
                placeholder="0"
                className="w-full tabular-nums"
              />
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="inv-minimo">Avísame cuando queden</Label>
          <Input
            id="inv-minimo"
            inputMode="decimal"
            value={stockMinimo}
            onChange={(e) => setStockMinimo(e.target.value)}
            placeholder="2"
            className="w-full tabular-nums"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inv-costo">Costo (opcional)</Label>
            <Input
              id="inv-costo"
              inputMode="decimal"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="$0"
              className="w-full tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="inv-precio">Precio de venta (opcional)</Label>
            <Input
              id="inv-precio"
              inputMode="decimal"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="$0"
              className="w-full tabular-nums"
            />
          </div>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {producto ? (
            <Button type="button" variant="ghost" onClick={borrar} disabled={guardando}>
              Borrar
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" isLoading={guardando}>
            Guardar
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
  cajaActiva,
  onClose,
}: {
  slug: string;
  hoy: string;
  productos: Producto[];
  inicial: Producto;
  cajaActiva: boolean;
  onClose: () => void;
}) {
  const [productoId, setProductoId] = useState(inicial.id);
  const [tipo, setTipo] = useState<TipoMovimiento>(inicial.precioCents != null ? 'venta' : 'uso');
  const [cantidad, setCantidad] = useState('1');
  const [dia, setDia] = useState(hoy);
  const [nota, setNota] = useState('');
  const [enCaja, setEnCaja] = useState(cajaActiva);
  const [monto, setMonto] = useState<string | null>(null); // null = sugerido
  const [metodo, setMetodo] = useState<Metodo>('efectivo');
  const { guardando, error, correr } = useCorrer(onClose);

  const p = productos.find((x) => x.id === productoId) ?? inicial;
  const sugerido = ventaSugeridaCents(p.precioCents, parseCantidad(cantidad) ?? 0);
  const montoVisible = monto ?? (sugerido != null ? String(sugerido / 100) : '');
  const conCaja = tipo === 'venta' && cajaActiva && enCaja;

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    correr(() =>
      registrarMovimiento(slug, {
        productoId,
        tipo,
        cantidad,
        dia,
        nota,
        enCaja: conCaja ? { monto: montoVisible, metodo } : null,
      })
    );
  }

  return (
    <Modal open onClose={onClose} title="Anotar movimiento" size="lg">
      <form onSubmit={guardar} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="mov-producto">Producto</Label>
          <Select id="mov-producto" value={productoId} onChange={(e) => setProductoId(e.target.value)} className="w-full">
            {productos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre} — hay {formatoCantidad(x.stock)} {x.unidad}
              </option>
            ))}
          </Select>
        </div>

        <fieldset>
          <legend className="mb-1 block text-xs font-medium text-muted">¿Qué pasó?</legend>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS_MOVIMIENTO.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tipo === t}
                onClick={() => setTipo(t)}
                className={`rounded-xl px-2 py-2.5 text-sm font-medium ring-1 transition ${
                  tipo === t ? 'bg-primary/[0.14] text-ink ring-primary/40' : 'text-muted ring-border hover:text-ink'
                }`}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="mov-cantidad">{tipo === 'ajuste' ? `¿Cuántos hay ahora? (${p.unidad})` : `Cantidad (${p.unidad})`}</Label>
            <Input
              id="mov-cantidad"
              inputMode="decimal"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-full text-lg tabular-nums"
              required
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="mov-dia">Día</Label>
            <Input id="mov-dia" type="date" value={dia} max={hoy} onChange={(e) => setDia(e.target.value)} className="w-full" />
          </div>
        </div>

        <div>
          <Label htmlFor="mov-nota">Nota (opcional)</Label>
          <Input
            id="mov-nota"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            maxLength={200}
            placeholder="Proveedor, clienta, se rompió…"
            className="w-full"
          />
        </div>

        {tipo === 'venta' && cajaActiva && (
          <div className="rounded-2xl bg-paper p-4 ring-1 ring-border">
            <label className="flex items-center gap-2.5 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={enCaja}
                onChange={(e) => setEnCaja(e.target.checked)}
                className="h-4 w-4 accent-[rgb(var(--color-primary))]"
              />
              Anotar también como venta en Caja
            </label>
            {enCaja && (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <Label htmlFor="mov-monto">¿Cuánto cobraste?</Label>
                  <Input
                    id="mov-monto"
                    inputMode="decimal"
                    value={montoVisible}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="$0"
                    className="w-full tabular-nums"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {METODOS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={metodo === m}
                      onClick={() => setMetodo(m)}
                      className={`rounded-xl px-2 py-2.5 text-sm font-medium ring-1 transition ${
                        metodo === m ? 'bg-primary/[0.14] text-ink ring-primary/40' : 'text-muted ring-border hover:text-ink'
                      }`}
                    >
                      {METODO_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-error">{error}</p>}

        <div className="flex justify-end pt-1">
          <Button type="submit" isLoading={guardando}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
