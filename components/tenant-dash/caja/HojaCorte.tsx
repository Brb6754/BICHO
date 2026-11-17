'use client';

import { useState } from 'react';
import { Calculator, Keyboard, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';
import {
  DENOMINACIONES,
  formatoPesos,
  pesosACentavos,
  resultadoCorte,
  totalContado,
  type Conteo,
  type Corte,
  type ResultadoCorte,
} from '@/lib/caja/resumen';
import { BOTON_CONTORNO, BOTON_PRINCIPAL, EncimaDeTodo, FOCO, Listo, Teclado } from './piezas';

// EL CORTE DE CAJA, PASO A PASO, en una hoja:
//   1. Cuenta lo que hay en el cajón (billete por billete o el total).
//   2. El resultado, grande: cuadra / sobran / faltan, con una frase amable.
//   3. Guardar.
// El contador vive solo aquí; lo que se guarda es el total contado.

export const RESULTADO_INFO: Record<ResultadoCorte['estado'], { color: string; fondo: string; titulo: (c: number) => string; frase: string }> = {
  cuadra: {
    color: '#15803D',
    fondo: 'rgb(0 184 92 / 0.12)',
    titulo: () => '¡Cuadra!',
    frase: 'Tu cajón está completo. Buen trabajo.',
  },
  sobran: {
    color: '#1D4ED8',
    fondo: 'rgb(31 91 255 / 0.1)',
    titulo: (c) => `Sobran ${formatoPesos(c)}`,
    frase: 'Pasa seguido: a veces es un cobro que no se anotó. Revisa los cobros de hoy con calma.',
  },
  faltan: {
    color: '#C2410C',
    fondo: 'rgb(255 138 0 / 0.14)',
    titulo: (c) => `Faltan ${formatoPesos(c)}`,
    frase: 'No te preocupes: casi siempre es un gasto o un pago con tarjeta que no se anotó.',
  },
};

const etiquetaDenominacion = (cents: number) => (cents < 100 ? '50¢' : `$${(cents / 100).toLocaleString('es-MX')}`);

export function HojaCorte({
  corte,
  fondo,
  onFondo,
  onGuardar,
  onClose,
}: {
  corte: Corte;
  /** Texto del cambio con que abrió (se recuerda en el teléfono). */
  fondo: string;
  onFondo: (v: string) => void;
  onGuardar: (contadoCents: number) => void;
  onClose: () => void;
}) {
  const [paso, setPaso] = useState<'contar' | 'resultado' | 'listo'>('contar');
  const [forma, setForma] = useState<'billetes' | 'total'>('billetes');
  const [conteo, setConteo] = useState<Conteo>({});
  const [texto, setTexto] = useState('');
  const [conFondo, setConFondo] = useState(false);

  const contadoCents = forma === 'billetes' ? totalContado(conteo) : Math.round(Number(texto || '0') * 100);
  const resultado = resultadoCorte(contadoCents, corte.esperadoCents);
  const info = RESULTADO_INFO[resultado.estado];
  const mostrarFondo = conFondo || corte.fondoCents > 0;

  const sumar = (cents: number, d: number) => setConteo((c) => ({ ...c, [cents]: Math.max(0, (c[cents] ?? 0) + d) }));

  return (
    <EncimaDeTodo>
    <Modal open onClose={onClose} title={paso === 'listo' ? 'Listo' : 'Corte de caja'} size="lg">
      {paso === 'listo' && (
        <Listo titulo="Corte guardado" detalle={`Contaste ${formatoPesos(contadoCents)}`} color={resultado.estado === 'cuadra' ? COLOR_MODULO.caja : info.color} />
      )}

      {paso === 'contar' && (
        <div className="animate-fade-in">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Paso 1 de 2</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-ink">Cuenta lo que hay en el cajón</p>

          <div role="tablist" aria-label="Cómo contar" className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-ink/[0.05] p-1">
            {(
              [
                ['billetes', 'Billete por billete', Calculator],
                ['total', 'Ya sé el total', Keyboard],
              ] as const
            ).map(([id, label, Icono]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={forma === id}
                onClick={() => setForma(id)}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold transition ${FOCO} ${
                  forma === id ? 'bg-surface text-ink shadow-sm' : 'text-muted'
                }`}
              >
                <Icono className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {forma === 'billetes' ? (
            <>
              <p className="mt-4 text-[15px] text-muted">Toca + por cada billete o moneda. La suma se hace sola.</p>
              {(['billete', 'moneda'] as const).map((tipo) => (
                <div key={tipo} className="mt-4">
                  <p className="mb-2 text-[15px] font-semibold text-ink">{tipo === 'billete' ? 'Billetes' : 'Monedas'}</p>
                  <ul className="divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
                    {DENOMINACIONES.filter((d) => d.tipo === tipo).map(({ cents }) => {
                      const n = conteo[cents] ?? 0;
                      const nombre = `${tipo === 'billete' ? 'billetes' : 'monedas'} de ${etiquetaDenominacion(cents)}`;
                      return (
                        <li key={cents} className="flex items-center gap-2 px-3 py-2">
                          <span
                            className={`flex h-10 shrink-0 items-center justify-center text-[15px] font-bold tabular-nums ${
                              tipo === 'billete' ? 'w-[4.5rem] rounded-lg' : 'w-10 rounded-full'
                            }`}
                            style={{
                              backgroundColor: tipo === 'billete' ? 'rgb(0 184 92 / 0.14)' : 'rgb(255 214 10 / 0.35)',
                              color: tipo === 'billete' ? '#166534' : '#713F12',
                            }}
                          >
                            {etiquetaDenominacion(cents)}
                          </span>
                          <span className="min-w-0 flex-1 text-right text-[15px] tabular-nums text-muted">
                            {n > 0 ? formatoPesos(n * cents) : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => sumar(cents, -1)}
                            disabled={n === 0}
                            aria-label={`Quitar uno de los ${nombre}`}
                            className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl font-semibold text-ink ring-1 ring-border transition active:scale-90 disabled:opacity-30 motion-reduce:transform-none ${FOCO}`}
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-xl font-bold tabular-nums text-ink" aria-live="polite">
                            <span className="sr-only">{nombre}: </span>
                            {n}
                          </span>
                          <button
                            type="button"
                            onClick={() => sumar(cents, 1)}
                            aria-label={`Agregar uno de los ${nombre}`}
                            className={`flex h-11 w-11 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-90 motion-reduce:transform-none ${FOCO}`}
                          >
                            +
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </>
          ) : (
            <div className="mt-4">
              <Teclado texto={texto} onTexto={setTexto} rapidos={[500, 1000, 2000]} onListo={() => setPaso('resultado')} />
            </div>
          )}

          {/* El total y el siguiente paso siempre a la mano del pulgar. */}
          <div className="sticky -bottom-6 -mx-6 mt-4 border-t border-border bg-elevated px-6 pb-6 pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] text-muted">Llevas contado</span>
              <span className="text-[1.75rem] font-bold tabular-nums text-ink">{formatoPesos(contadoCents)}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {forma === 'billetes' && contadoCents > 0 && (
                <button type="button" onClick={() => setConteo({})} className={BOTON_CONTORNO}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Poner en 0
                </button>
              )}
              <button type="button" onClick={() => setPaso('resultado')} className={`${BOTON_PRINCIPAL} flex-1`}>
                Ya terminé de contar
              </button>
            </div>
          </div>
        </div>
      )}

      {paso === 'resultado' && (
        <div className="animate-fade-in">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">Paso 2 de 2</p>
          <div role="status" className="mt-2 rounded-3xl px-5 py-6 text-center" style={{ backgroundColor: info.fondo }}>
            <p className="text-[2.5rem] font-bold leading-tight tracking-tight tabular-nums" style={{ color: info.color }}>
              {resultado.estado === 'cuadra' && <span aria-hidden="true">✓ </span>}
              {info.titulo(resultado.cents)}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[17px] leading-relaxed text-ink">{info.frase}</p>
          </div>

          <dl className="mt-5 divide-y divide-border rounded-2xl bg-surface text-[16px] ring-1 ring-border">
            <div className="flex min-h-12 items-center justify-between gap-3 px-4">
              <dt className="font-semibold text-ink">Contaste</dt>
              <dd className="text-xl font-bold tabular-nums text-ink">{formatoPesos(contadoCents)}</dd>
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3 px-4">
              <dt className="font-semibold text-ink">Debía haber</dt>
              <dd className="text-xl font-bold tabular-nums text-ink">{formatoPesos(corte.esperadoCents)}</dd>
            </div>
            {mostrarFondo && (
              <div className="flex min-h-12 items-center justify-between gap-3 px-4 py-1.5">
                <dt>
                  <label htmlFor="corte-fondo" className="text-muted">
                    Cambio con que abriste
                  </label>
                </dt>
                <dd>
                  <Input
                    id="corte-fondo"
                    inputMode="decimal"
                    placeholder="$0"
                    value={fondo}
                    onChange={(e) => onFondo(e.target.value)}
                    autoFocus={conFondo && !fondo}
                    className="w-28 text-right text-[16px] tabular-nums"
                  />
                </dd>
              </div>
            )}
            <div className="flex min-h-12 items-center justify-between gap-3 px-4 text-muted">
              <dt>+ Cobros en efectivo</dt>
              <dd className="tabular-nums">{formatoPesos(corte.ventasEfectivoCents)}</dd>
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3 px-4 text-muted">
              <dt>− Gastos en efectivo</dt>
              <dd className="tabular-nums">{formatoPesos(corte.gastosEfectivoCents)}</dd>
            </div>
          </dl>
          {!mostrarFondo && (
            <button
              type="button"
              onClick={() => setConFondo(true)}
              className={`mt-2 inline-flex min-h-11 items-center rounded-full text-left text-[15px] font-medium text-ink underline decoration-dotted underline-offset-4 ${FOCO}`}
            >
              ¿Dejaste cambio en el cajón al abrir? Súmalo
            </button>
          )}
          {fondo && pesosACentavos(fondo) === null && (
            <p className="mt-2 text-[15px] text-error">Escribe el cambio solo con números, por ejemplo 500.</p>
          )}
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Lo que te pagan con tarjeta o transferencia no va al cajón: llega a tu banco.
          </p>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={() => setPaso('contar')} className={BOTON_CONTORNO}>
              Volver a contar
            </button>
            <button
              type="button"
              onClick={() => {
                onGuardar(contadoCents);
                setPaso('listo');
                setTimeout(onClose, 1400);
              }}
              className={`${BOTON_PRINCIPAL} flex-1`}
            >
              Guardar corte
            </button>
          </div>
        </div>
      )}
    </Modal>
    </EncimaDeTodo>
  );
}
