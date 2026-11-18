'use client';

import { useState } from 'react';
import { CalendarCheck, ChevronRight, Pencil, ShoppingBag, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/tenant-dash/ui/FormField';
import { addDaysKey, dayLabel } from '@/lib/dates/tenantTime';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';
import {
  CATEGORIAS_GASTO,
  METODOS,
  formatoPesos,
  type CategoriaGasto,
  type Metodo,
  type Movimiento,
} from '@/lib/caja/resumen';
import { BOTON_CONTORNO, BOTON_PRINCIPAL, EncimaDeTodo, BotonPago, CATEGORIA_INFO, FOCO, Listo, Teclado } from './piezas';

// COBRAR Y ANOTAR — una sola hoja con pasos cortos:
//   lista de citas por cobrar → (monto) → ¿cómo te pagaron? → ✓
// Tocar la forma de pago ES guardar: cobrar una cita son dos toques.

export type Guardado = {
  /** Movimiento que se corrige o cita que se cobra; sin él, es nuevo. */
  mov: Movimiento | null;
  tipo: 'venta' | 'gasto';
  concepto: string;
  montoCents: number;
  metodo: Metodo;
  categoria: CategoriaGasto | null;
  dia: string;
};

export type Modo = { modo: 'cobrar' } | { modo: 'gasto' } | { modo: 'editar'; mov: Movimiento };

type Paso = 'lista' | 'monto' | 'pago' | 'listo';

export function etiquetaDia(key: string, hoy: string): string {
  if (key === hoy) return 'Hoy';
  if (key === addDaysKey(hoy, -1)) return 'Ayer';
  return dayLabel(key, new Date(0), 'UTC');
}

const aTexto = (cents: number) => (cents ? String(cents / 100) : '');
const aCents = (texto: string) => Math.round(Number(texto || '0') * 100);

export function HojaMovimiento({
  modo,
  hoy,
  porCobrar,
  onGuardar,
  onBorrar,
  onClose,
}: {
  modo: Modo;
  hoy: string;
  /** Citas de hoy que ya llegaron y nadie ha cobrado. */
  porCobrar: Movimiento[];
  /** Devuelve el error a mostrar, o null si se guardó. */
  onGuardar: (d: Guardado) => Promise<string | null>;
  onBorrar: (m: Movimiento) => Promise<string | null>;
  onClose: () => void;
}) {
  const inicial = modo.modo === 'editar' ? modo.mov : null;
  const [sel, setSel] = useState<Movimiento | null>(inicial);
  const [tipo, setTipo] = useState<'venta' | 'gasto'>(modo.modo === 'gasto' ? 'gasto' : (inicial?.tipo ?? 'venta'));
  const [paso, setPaso] = useState<Paso>(modo.modo === 'cobrar' ? 'lista' : modo.modo === 'gasto' ? 'monto' : 'pago');
  const [texto, setTexto] = useState(aTexto(inicial?.montoCents ?? 0));
  const [concepto, setConcepto] = useState(inicial?.concepto ?? '');
  const [categoria, setCategoria] = useState<CategoriaGasto>(inicial?.categoria ?? 'productos');
  const [dia, setDia] = useState(inicial?.dia ?? hoy);
  const [guardando, setGuardando] = useState<Metodo | 'borrar' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [listo, setListo] = useState('');

  const deCita = Boolean(sel?.bookingId);
  const montoCents = aCents(texto);
  // Una cita sí puede quedar en $0 (cortesía); lo demás necesita monto.
  const montoValido = deCita ? texto !== '' : montoCents > 0;
  const nombreTipo = tipo === 'gasto' ? 'gasto' : 'cobro';

  function terminar(titulo: string) {
    setListo(titulo);
    setPaso('listo');
    setTimeout(onClose, 1300);
  }

  async function pagar(metodo: Metodo) {
    setError(null);
    if (!deCita && tipo === 'venta' && !concepto.trim()) return setError('Escribe qué cobraste, por ejemplo «Shampoo».');
    setGuardando(metodo);
    const err = await onGuardar({ mov: sel, tipo, concepto: concepto.trim(), montoCents, metodo, categoria: tipo === 'gasto' ? categoria : null, dia });
    setGuardando(null);
    if (err) return setError(err);
    terminar(tipo === 'gasto' ? (inicial ? 'Gasto corregido' : 'Gasto anotado') : inicial && !inicial.porCobrar ? 'Cobro corregido' : '¡Cobrado!');
  }

  async function borrar() {
    if (!sel) return;
    setGuardando('borrar');
    const err = await onBorrar(sel);
    setGuardando(null);
    if (err) return setError(err);
    terminar(deCita ? 'Quitado de la caja' : tipo === 'gasto' ? 'Gasto borrado' : 'Cobro borrado');
  }

  const titulo =
    paso === 'listo'
      ? 'Listo'
      : paso === 'lista'
        ? 'Cobrar una cita'
        : inicial && !inicial.porCobrar
          ? tipo === 'gasto'
            ? 'Tu gasto'
            : 'Tu cobro'
          : tipo === 'gasto'
            ? 'Anotar un gasto'
            : sel
              ? 'Cobrar la cita'
              : 'Cobrar otra cosa';

  return (
    <EncimaDeTodo>
    <Modal open onClose={onClose} title={titulo} size="lg">
      {paso === 'listo' && (
        <Listo titulo={listo} detalle={formatoPesos(montoCents)} color={tipo === 'gasto' ? COLOR_MODULO.inventario : COLOR_MODULO.caja} />
      )}

      {paso === 'lista' && (
        <div className="animate-fade-in">
          {porCobrar.length === 0 ? (
            <div className="rounded-2xl bg-paper p-5 text-center ring-1 ring-border">
              <CalendarCheck className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
              <p className="mt-2 text-[17px] font-semibold text-ink">No tienes citas por cobrar</p>
              <p className="mt-1 text-[15px] leading-relaxed text-muted">
                Cuando marques en tu agenda que una clienta llegó («Vino»), aparece aquí para cobrarla con dos toques.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[15px] text-muted">Ya llegaron. Toca la que vas a cobrar.</p>
              <ul className="mt-3 space-y-2">
                {porCobrar.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSel(c);
                        setTexto(aTexto(c.montoCents));
                        setPaso('pago');
                      }}
                      className={`flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-border transition active:scale-[0.98] motion-reduce:transform-none ${FOCO}`}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/[0.12]">
                        <CalendarCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[17px] font-semibold text-ink">{c.servicio ?? c.concepto}</span>
                        <span className="block text-[15px] text-muted">{c.hora ? `Cita de las ${c.hora}` : 'Cita de hoy'}</span>
                      </span>
                      <span className="shrink-0 text-xl font-bold tabular-nums text-ink">{formatoPesos(c.montoCents)}</span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setSel(null);
              setTipo('venta');
              setTexto('');
              setPaso('monto');
            }}
            className={`mt-4 flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 text-left text-[16px] font-medium text-ink ring-1 ring-dashed ring-border transition hover:bg-ink/[0.03] ${FOCO}`}
          >
            <ShoppingBag className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
            <span className="flex-1">Cobrar otra cosa: un producto, una propina…</span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          </button>
        </div>
      )}

      {paso === 'monto' && (
        <div className="animate-fade-in">
          <p className="mb-2 text-[17px] font-semibold text-ink">{tipo === 'gasto' ? '¿Cuánto gastaste?' : '¿Cuánto cobraste?'}</p>
          <Teclado
            texto={texto}
            onTexto={setTexto}
            rapidos={tipo === 'gasto' ? [50, 100, 200, 500] : [100, 200, 300, 500]}
            onListo={() => montoValido && setPaso('pago')}
          />
          <button type="button" onClick={() => setPaso('pago')} disabled={!montoValido} className={`${BOTON_PRINCIPAL} mt-4 w-full`}>
            Siguiente
          </button>
        </div>
      )}

      {paso === 'pago' && (
        <div className="animate-fade-in flex flex-col gap-5">
          {/* El monto, grande, con su lápiz para cambiarlo. */}
          <div className="flex items-end justify-between gap-3 rounded-2xl bg-paper px-4 py-4 ring-1 ring-border">
            <div className="min-w-0">
              <p className="line-clamp-2 break-words text-[15px] text-muted">
                {deCita ? `${sel?.servicio ?? 'Cita'}${sel?.hora ? ` · ${sel.hora}` : ''}` : tipo === 'gasto' ? 'Gasto' : 'Cobro'}
              </p>
              <p className="mt-1 text-[2.5rem] font-bold leading-none tracking-tight tabular-nums text-ink">
                {formatoPesos(montoCents)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPaso('monto')}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[15px] font-medium text-ink ring-1 ring-border hover:bg-ink/[0.03] ${FOCO}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" /> Cambiar monto
            </button>
          </div>
          {deCita && sel?.porCobrar && (
            <p className="-mt-2 text-[15px] text-muted">¿Le hiciste descuento? Cambia el monto (pon 0 si fue cortesía).</p>
          )}

          {!deCita && tipo === 'venta' && (
            <FormField label="¿Qué cobraste?">
              <Input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                maxLength={120}
                placeholder="Ej. shampoo, propina, cera"
                className="w-full text-[17px]"
              />
            </FormField>
          )}

          {tipo === 'gasto' && (
            <fieldset>
              <legend className="mb-2 text-[17px] font-semibold text-ink">¿En qué fue?</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIAS_GASTO.map((c) => {
                  const { label, Icono } = CATEGORIA_INFO[c];
                  const activo = categoria === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setCategoria(c)}
                      className={`flex min-h-12 items-center gap-2 rounded-xl px-3 text-left text-[15px] font-medium transition ${FOCO} ${
                        activo ? 'bg-orange-50 text-ink ring-2 ring-orange-500' : 'bg-surface text-ink ring-1 ring-border'
                      }`}
                    >
                      <Icono className={`h-5 w-5 shrink-0 ${activo ? 'text-orange-600' : 'text-muted'}`} aria-hidden="true" />
                      {label}
                    </button>
                  );
                })}
              </div>
              <Input
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                maxLength={120}
                aria-label="Detalle del gasto (opcional)"
                placeholder="Detalle, si quieres: tintes, garrafón…"
                className="mt-2 w-full text-[16px]"
              />
            </fieldset>
          )}

          {/* La fecha casi siempre es hoy: plegada para no estorbar. */}
          {!deCita && (
            <details open={dia !== hoy}>
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-[15px] font-medium text-muted underline decoration-dotted underline-offset-4 hover:text-ink">
                {dia === hoy ? '¿Fue otro día?' : `Día: ${etiquetaDia(dia, hoy)}`}
              </summary>
              <FormField label="¿Qué día fue?" className="mt-2">
                <Input type="date" value={dia} max={hoy} onChange={(e) => setDia(e.target.value || hoy)} className="w-full" />
              </FormField>
            </details>
          )}

          <fieldset>
            <legend className="mb-2 text-[17px] font-semibold text-ink">
              {tipo === 'gasto' ? '¿Cómo pagaste?' : '¿Cómo te pagaron?'}
              <span className="block text-[15px] font-normal text-muted">Toca uno y queda guardado.</span>
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map((m) => (
                <BotonPago
                  key={m}
                  metodo={m}
                  actual={Boolean(inicial && !inicial.porCobrar && inicial.metodo === m)}
                  disabled={guardando !== null || !montoValido}
                  onClick={() => pagar(m)}
                />
              ))}
            </div>
            {guardando && guardando !== 'borrar' && (
              <p className="mt-2 text-center text-[15px] text-muted" role="status">
                Guardando…
              </p>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="rounded-xl bg-error-soft px-4 py-3 text-[15px] text-error">
              {error}
            </p>
          )}

          {inicial && !inicial.porCobrar && (
            <div className="border-t border-border pt-4">
              {confirmarBorrar ? (
                <div className="rounded-2xl bg-error-soft p-4">
                  <p className="text-[15px] font-medium text-ink">
                    {deCita
                      ? '¿Quitar este cobro de la caja? La cita sigue en tu agenda.'
                      : `¿Borrar este ${nombreTipo} de ${formatoPesos(inicial.montoCents)}? No se puede deshacer.`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={borrar}
                      disabled={guardando !== null}
                      className={`min-h-12 rounded-full bg-error px-5 text-[17px] font-semibold text-white disabled:opacity-50 ${FOCO}`}
                    >
                      {guardando === 'borrar' ? 'Borrando…' : deCita ? 'Sí, quitarlo' : `Sí, borrar el ${nombreTipo}`}
                    </button>
                    <button type="button" onClick={() => setConfirmarBorrar(false)} className={BOTON_CONTORNO}>
                      No, dejarlo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarBorrar(true)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[15px] font-medium text-error hover:bg-error-soft ${FOCO}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {deCita ? 'Quitar de la caja' : `Borrar este ${nombreTipo}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
    </EncimaDeTodo>
  );
}
