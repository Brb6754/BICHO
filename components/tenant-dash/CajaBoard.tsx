'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  HandCoins,
  ReceiptText,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { COLOR_MODULO } from '@/lib/branding/moduloColores';
import { addDaysKey } from '@/lib/dates/tenantTime';
import {
  METODOS,
  corteDeCaja,
  formatoPesos,
  pesosACentavos,
  rangoDe,
  resultadoCorte,
  resumir,
  ultimos7Dias,
  type Movimiento,
} from '@/lib/caja/resumen';
import {
  ajustarVentaDeCita,
  borrarMovimiento,
  guardarMovimiento,
  quitarVentaDeCita,
} from '@/app/t/[slug]/dashboard/caja/actions';
import { CATEGORIA_INFO, FOCO, METODO_INFO, useConteo } from './caja/piezas';
import { HojaMovimiento, etiquetaDia, type Guardado, type Modo } from './caja/HojaMovimiento';
import { HojaCorte, RESULTADO_INFO } from './caja/HojaCorte';

// CAJA — una caja registradora, no un reporte.
//
// Arriba lo que llevas hoy (y cómo te pagaron); luego dos botones grandes
// para lo que se hace veinte veces al día: cobrar y anotar un gasto. El
// corte del día es su propia tarjeta (solo de HOY). La semana y el mes
// van aparte, más abajo: son para mirar, no para cerrar el día.
// Palabras de mostrador: cobro y gasto, nunca "transacción" ni "egreso".

const NOMBRE_DIA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function diaSemana(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

/** "14:05" del teléfono: la hora de un movimiento recién anotado (el servidor la pone bien al recargar). */
function horaAhora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// El cambio con que abrió y el corte guardado se recuerdan por día en este
// teléfono: hoy no existe una tabla de cortes y lo que importa es el total.
// Si el navegador no deja guardar, simplemente no se recuerda.
function useRecordado(clave: string): [string, (v: string) => void] {
  const [valor, setValor] = useState('');
  useEffect(() => {
    try {
      setValor(localStorage.getItem(clave) ?? '');
    } catch {
      /* sin almacenamiento: se queda vacío */
    }
  }, [clave]);
  return [
    valor,
    (v: string) => {
      setValor(v);
      try {
        if (v) localStorage.setItem(clave, v);
        else localStorage.removeItem(clave);
      } catch {
        /* idem */
      }
    },
  ];
}

const TARJETA = 'rounded-3xl bg-surface p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] ring-1 ring-border sm:p-6';

export function CajaBoard({
  slug,
  hoy,
  movimientos,
  porCobrarDemo,
  demo = false,
}: {
  slug: string;
  hoy: string;
  movimientos: Movimiento[];
  /** Demo: citas de hoy de la agenda demo que ya empezaron (fuera de los totales hasta cobrarlas). */
  porCobrarDemo?: Movimiento[];
  /** El panel de demostración: todo se puede tocar y nada se guarda. */
  demo?: boolean;
}) {
  const router = useRouter();
  const [movs, setMovs] = useState(movimientos);
  const [pendientesDemo, setPendientesDemo] = useState(porCobrarDemo ?? []);
  useEffect(() => setMovs(movimientos), [movimientos]);

  const [hoja, setHoja] = useState<Modo | null>(null);
  const [conCorte, setConCorte] = useState(false);
  const [diaSel, setDiaSel] = useState(hoy);

  const [fondo, setFondo] = useRecordado(`caja-fondo:${slug}:${hoy}`);
  const [corteGuardado, setCorteGuardado] = useRecordado(`caja-corte:${slug}:${hoy}`);

  const deHoy = useMemo(() => resumir(movs, hoy, hoy), [movs, hoy]);
  const deAyer = useMemo(() => resumir(movs, addDaysKey(hoy, -1), addDaysKey(hoy, -1)), [movs, hoy]);
  const semana = useMemo(() => ultimos7Dias(movs, hoy), [movs, hoy]);
  const mes = rangoDe('mes', hoy);
  const delMes = useMemo(() => resumir(movs, mes.desde, mes.hasta), [movs, mes.desde, mes.hasta]);
  const mesPasado = useMemo(() => resumir(movs, mes.prevDesde, mes.prevHasta), [movs, mes.prevDesde, mes.prevHasta]);

  const corte = corteDeCaja(movs, hoy, pesosACentavos(fondo) ?? 0);
  const porCobrar = demo ? pendientesDemo : movs.filter((m) => m.porCobrar && m.dia === hoy);
  const llevas = useConteo(deHoy.vendidoCents);

  const delDia = movs
    .filter((m) => m.dia === diaSel)
    .sort((a, b) => (b.hora ?? '').localeCompare(a.hora ?? ''));
  const totalDia = semana.find((d) => d.dia === diaSel) ?? { cobradoCents: 0, gastadoCents: 0 };

  async function guardar(d: Guardado): Promise<string | null> {
    const existe = d.mov && movs.some((m) => m.id === d.mov!.id);
    if (!demo) {
      const monto = String(d.montoCents / 100);
      const r = d.mov?.bookingId
        ? await ajustarVentaDeCita(slug, d.mov.bookingId, { monto, metodo: d.metodo })
        : await guardarMovimiento(slug, {
            id: d.mov?.id,
            tipo: d.tipo,
            concepto: d.concepto,
            monto,
            metodo: d.metodo,
            categoria: d.categoria,
            dia: d.dia,
          });
      if (!r.ok) return r.error;
    }
    const campos = { montoCents: d.montoCents, metodo: d.metodo, porCobrar: false };
    const nuevo: Movimiento = d.mov
      ? { ...d.mov, ...campos, ...(d.mov.bookingId ? {} : { concepto: d.concepto, categoria: d.categoria, dia: d.dia }) }
      : {
          id: `nuevo-${Date.now()}`,
          tipo: d.tipo,
          concepto: d.concepto,
          categoria: d.categoria,
          dia: d.dia,
          bookingId: null,
          servicio: null,
          hora: horaAhora(),
          ...campos,
        };
    setMovs((xs) => (existe ? xs.map((m) => (m.id === nuevo.id ? nuevo : m)) : [nuevo, ...xs]));
    setPendientesDemo((ps) => ps.filter((p) => p.id !== d.mov?.id));
    const que = d.tipo === 'gasto' ? 'gasto' : 'cobro';
    toast(demo ? `Ejemplo: ${que} registrado` : d.mov && !d.mov.porCobrar ? 'Cambios guardados' : d.tipo === 'gasto' ? 'Gasto anotado' : 'Cobro registrado');
    if (!demo) router.refresh();
    return null;
  }

  async function borrar(m: Movimiento): Promise<string | null> {
    if (!demo) {
      const r = m.bookingId ? await quitarVentaDeCita(slug, m.bookingId) : await borrarMovimiento(slug, m.id);
      if (!r.ok) return r.error;
    }
    setMovs((xs) => xs.filter((x) => x.id !== m.id));
    const que = m.tipo === 'gasto' ? 'Gasto borrado' : m.bookingId ? 'Cobro quitado de la caja' : 'Cobro borrado';
    toast(demo ? `Ejemplo: ${que.toLowerCase()}` : que);
    if (!demo) router.refresh();
    return null;
  }

  const diferencia = deHoy.vendidoCents - deAyer.vendidoCents;
  const contadoGuardado = corteGuardado ? Number(corteGuardado) : null;
  const resultadoGuardado = contadoGuardado === null ? null : resultadoCorte(contadoGuardado, corte.esperadoCents);
  const maxSemana = Math.max(1, ...semana.map((d) => d.cobradoCents));

  return (
    <div>
      <PageHeader title="Caja" description="Cobra, anota tus gastos y haz el corte del día en un ratito." />

      {demo && (
        <p className="mt-4 rounded-2xl bg-primary/[0.08] px-4 py-3 text-[15px] leading-relaxed text-ink ring-1 ring-primary/20">
          Es una demostración: prueba cobrar una cita o anotar un gasto. Nada se guarda.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        {/* ── HOY ─────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-5">
          <section className={TARJETA} aria-labelledby="hoy-titulo">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: COLOR_MODULO.caja }}>
                <Wallet className="h-5 w-5 text-white" aria-hidden="true" />
              </span>
              <h2 id="hoy-titulo" className="text-[17px] font-semibold text-ink">
                Hoy llevas
              </h2>
            </div>
            <p className="mt-3 text-[3.25rem] font-bold leading-none tracking-tight tabular-nums text-ink sm:text-[4rem]">
              <span aria-hidden="true">{formatoPesos(llevas)}</span>
              <span className="sr-only">{formatoPesos(deHoy.vendidoCents)}</span>
            </p>
            <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-[15px] text-muted">
              {deAyer.vendidoCents === 0 && deAyer.gastadoCents === 0 ? (
                'Ayer no hubo cobros para comparar.'
              ) : diferencia === 0 ? (
                'Igual que ayer.'
              ) : (
                <>
                  {diferencia > 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-success" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-orange-700" aria-hidden="true" />
                  )}
                  <span className={`font-semibold tabular-nums ${diferencia > 0 ? 'text-success' : 'text-orange-700'}`}>
                    {formatoPesos(Math.abs(diferencia))} {diferencia > 0 ? 'más' : 'menos'}
                  </span>
                  que ayer
                </>
              )}
            </p>

            {/* Cómo te pagaron: barrita con etiquetas en texto, no solo color. */}
            <div className="mt-5">
              <div className="flex h-4 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden="true">
                {METODOS.map((m) =>
                  deHoy.porMetodo[m] > 0 ? (
                    <div
                      key={m}
                      className="h-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                      style={{ width: `${(deHoy.porMetodo[m] / deHoy.vendidoCents) * 100}%`, backgroundColor: METODO_INFO[m].color }}
                    />
                  ) : null,
                )}
              </div>
              <ul className="mt-3 divide-y divide-border">
                {METODOS.map((m) => (
                  <li key={m} className="flex min-h-10 items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[15px] text-ink">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: METODO_INFO[m].color }} aria-hidden="true" />
                      {METODO_INFO[m].label}
                    </span>
                    <span className="text-[17px] font-semibold tabular-nums text-ink">{formatoPesos(deHoy.porMetodo[m])}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-4 border-t border-border pt-4 text-[15px] text-muted">
              Gastaste <span className="font-semibold tabular-nums text-ink">{formatoPesos(deHoy.gastadoCents)}</span> · Te quedan{' '}
              <span className={`font-semibold tabular-nums ${deHoy.quedoCents < 0 ? 'text-orange-700' : 'text-ink'}`}>
                {formatoPesos(deHoy.quedoCents)}
              </span>
            </p>
          </section>

          {/* Las dos cosas que se hacen todo el día. */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHoja({ modo: 'cobrar' })}
              className={`relative flex min-h-[8.5rem] flex-col justify-between rounded-3xl bg-primary p-4 text-left text-[rgb(var(--color-cta-fg))] shadow-[0_10px_24px_-12px_rgb(var(--color-primary)/0.7)] transition active:scale-[0.97] motion-reduce:transform-none ${FOCO} focus-visible:ring-offset-2`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                <HandCoins className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[19px] font-bold leading-tight">Cobrar una cita</span>
                <span className="mt-0.5 block text-[14px] opacity-90">
                  {porCobrar.length === 0 ? 'O un producto' : porCobrar.length === 1 ? '1 por cobrar' : `${porCobrar.length} por cobrar`}
                </span>
              </span>
              {porCobrar.length > 0 && (
                <span className="absolute right-3 top-3 flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-[15px] font-bold tabular-nums text-ink" aria-hidden="true">
                  {porCobrar.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setHoja({ modo: 'gasto' })}
              className={`flex min-h-[8.5rem] flex-col justify-between rounded-3xl bg-surface p-4 text-left text-ink shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] ring-1 ring-border transition active:scale-[0.97] motion-reduce:transform-none ${FOCO}`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgb(255 138 0 / 0.16)' }}>
                <ReceiptText className="h-6 w-6 text-orange-700" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[19px] font-bold leading-tight">Anotar un gasto</span>
                <span className="mt-0.5 block text-[14px] text-muted">Productos, garrafón…</span>
              </span>
            </button>
          </div>

          {/* El corte: solo de HOY, en su propia tarjeta. */}
          <section className={TARJETA} aria-labelledby="corte-titulo">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="corte-titulo" className="text-[17px] font-semibold text-ink">
                  Corte de caja de hoy
                </h2>
                <p className="mt-1 text-[15px] text-muted">En el cajón debe haber</p>
                <p className="mt-0.5 text-[2rem] font-bold leading-tight tabular-nums text-ink">{formatoPesos(corte.esperadoCents)}</p>
                <p className="text-[13px] text-muted">Solo efectivo. Tarjeta y transferencia van a tu banco.</p>
              </div>
              <ClipboardCheck className="h-7 w-7 shrink-0 text-muted" aria-hidden="true" />
            </div>
            {resultadoGuardado && contadoGuardado !== null && (
              <p
                className="mt-4 rounded-2xl px-4 py-3 text-[15px] font-semibold"
                style={{ backgroundColor: RESULTADO_INFO[resultadoGuardado.estado].fondo, color: RESULTADO_INFO[resultadoGuardado.estado].color }}
              >
                Contaste {formatoPesos(contadoGuardado)}: {RESULTADO_INFO[resultadoGuardado.estado].titulo(resultadoGuardado.cents)}
              </p>
            )}
            <button
              type="button"
              onClick={() => setConCorte(true)}
              className={`mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-[17px] font-semibold ring-2 ring-primary/40 transition hover:bg-primary/[0.06] text-ink ${FOCO}`}
            >
              {resultadoGuardado ? 'Volver a contar' : 'Hacer el corte'}
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </section>
        </div>

        {/* ── LA SEMANA Y EL MES ─────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-5">
          <section className={TARJETA} aria-labelledby="semana-titulo">
            <h2 id="semana-titulo" className="text-[17px] font-semibold text-ink">
              Tus últimos 7 días
            </h2>
            <p className="mt-1 text-[15px] text-muted">Toca un día para ver qué cobraste.</p>
            <div className="mt-4 flex h-36 items-end gap-1" role="group" aria-label="Cobros por día">
              {semana.map((d) => {
                const activo = d.dia === diaSel;
                return (
                  <button
                    key={d.dia}
                    type="button"
                    onClick={() => setDiaSel(d.dia)}
                    aria-pressed={activo}
                    aria-label={`${etiquetaDia(d.dia, hoy)}: cobraste ${formatoPesos(d.cobradoCents)}`}
                    className={`group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-xl pt-1 ${FOCO}`}
                  >
                    <span
                      className="w-full max-w-10 rounded-t-lg transition-[height,background-color] duration-500 ease-out motion-reduce:transition-none"
                      style={{
                        height: `${Math.max(4, (d.cobradoCents / maxSemana) * 100)}%`,
                        backgroundColor: activo ? COLOR_MODULO.caja : 'rgb(0 184 92 / 0.28)',
                      }}
                    />
                    <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[13px] font-semibold ${activo ? 'bg-ink text-white' : 'text-muted'}`}>
                      {d.dia === hoy ? 'Hoy' : NOMBRE_DIA[diaSemana(d.dia)]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-[15px] text-ink ring-1 ring-border" aria-live="polite">
              <span className="inline-block font-semibold first-letter:uppercase">{etiquetaDia(diaSel, hoy)}:</span> cobraste{' '}
              <span className="font-semibold tabular-nums text-success">{formatoPesos(totalDia.cobradoCents)}</span> y gastaste{' '}
              <span className="font-semibold tabular-nums text-orange-700">{formatoPesos(totalDia.gastadoCents)}</span>
            </p>
          </section>

          <section aria-labelledby="movs-titulo">
            <h2 id="movs-titulo" className="text-[17px] font-semibold text-ink">
              {diaSel === hoy ? 'Lo de hoy' : diaSel === addDaysKey(hoy, -1) ? 'Lo de ayer' : `Lo del ${etiquetaDia(diaSel, hoy)}`}{' '}
              <span className="font-normal text-muted tabular-nums">({delDia.length})</span>
            </h2>
            {delDia.length === 0 ? (
              <div className="mt-3 rounded-3xl bg-surface p-6 text-center ring-1 ring-border">
                <ShoppingBag className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                <p className="mt-2 text-[17px] font-semibold text-ink">
                  {diaSel === hoy ? 'Todavía no hay nada hoy' : 'Ese día no hubo cobros ni gastos'}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">
                  {diaSel === hoy
                    ? 'Cuando cobres tu primera cita aparece aquí, con su hora y cómo te pagaron.'
                    : 'Toca otro día de la gráfica para ver sus movimientos.'}
                </p>
              </div>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {delDia.slice(0, 80).map((m) => (
                  <li key={m.id}>
                    <FilaMovimiento m={m} onClick={() => setHoja({ modo: 'editar', mov: m })} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={TARJETA} aria-labelledby="mes-titulo">
            <h2 id="mes-titulo" className="text-[17px] font-semibold text-ink">
              Este mes
            </h2>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['Cobraste', delMes.vendidoCents, 'text-ink'],
                ['Gastaste', delMes.gastadoCents, 'text-ink'],
                ['Te quedó', delMes.quedoCents, delMes.quedoCents < 0 ? 'text-orange-700' : 'text-success'],
              ].map(([label, cents, color]) => (
                <div key={label as string} className="min-w-0 rounded-2xl bg-paper px-3 py-3 ring-1 ring-border">
                  <dt className="text-[13px] font-medium text-muted">{label}</dt>
                  <dd className={`mt-0.5 truncate text-[17px] font-bold tabular-nums ${color}`}>{formatoPesos(cents as number)}</dd>
                </div>
              ))}
            </dl>
            {mesPasado.vendidoCents > 0 && (
              <p className="mt-3 text-[15px] text-muted">
                El mes pasado a estas alturas te quedó{' '}
                <span className="font-semibold tabular-nums text-ink">{formatoPesos(mesPasado.quedoCents)}</span>.
              </p>
            )}
            {delMes.porServicio.length > 0 && (
              <>
                <h3 className="mt-5 text-[15px] font-semibold text-ink">Lo que más se cobró</h3>
                <ul className="mt-2 space-y-2.5">
                  {delMes.porServicio.slice(0, 5).map((s) => (
                    <li key={s.nombre}>
                      <div className="flex items-baseline justify-between gap-3 text-[15px]">
                        <span className="min-w-0 truncate text-ink">
                          {s.nombre} <span className="text-muted">· {s.veces} {s.veces === 1 ? 'vez' : 'veces'}</span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-ink">{formatoPesos(s.cents)}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-ink/[0.06]">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(4, (s.cents / delMes.porServicio[0].cents) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>

      {hoja && (
        <HojaMovimiento
          modo={hoja}
          hoy={hoy}
          porCobrar={porCobrar}
          onGuardar={guardar}
          onBorrar={borrar}
          onClose={() => setHoja(null)}
        />
      )}
      {conCorte && (
        <HojaCorte
          corte={corte}
          fondo={fondo}
          onFondo={setFondo}
          onGuardar={(cents) => {
            setCorteGuardado(String(cents));
            toast(demo ? 'Ejemplo: corte guardado' : 'Corte guardado');
          }}
          onClose={() => setConCorte(false)}
        />
      )}
    </div>
  );
}

/** Un renglón de la lista: ícono y color por tipo, hora, concepto y el monto grande. */
function FilaMovimiento({ m, onClick }: { m: Movimiento; onClick: () => void }) {
  const gasto = m.tipo === 'gasto';
  const Icono = gasto ? (m.categoria ? CATEGORIA_INFO[m.categoria].Icono : ReceiptText) : m.bookingId ? CalendarCheck : ShoppingBag;
  const titulo = m.concepto || (m.categoria ? CATEGORIA_INFO[m.categoria].label : 'Cobro');
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[4.5rem] w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-border transition hover:bg-ink/[0.02] active:scale-[0.99] motion-reduce:transform-none ${FOCO}`}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: gasto ? 'rgb(255 138 0 / 0.16)' : 'rgb(0 184 92 / 0.14)' }}
      >
        <Icono className={`h-5 w-5 ${gasto ? 'text-orange-700' : 'text-success'}`} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold text-ink">{titulo}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[14px] text-muted">
          {m.hora && <span className="tabular-nums">{m.hora}</span>}
          {m.hora && <span aria-hidden="true">·</span>}
          <span>{gasto ? 'Gasto' : m.bookingId ? 'Cita' : 'Cobro'}</span>
          <span aria-hidden="true">·</span>
          {m.porCobrar ? (
            <span className="font-semibold text-ink">Falta decir cómo pagó</span>
          ) : (
            <span>{METODO_INFO[m.metodo].label}</span>
          )}
        </span>
      </span>
      <span className={`shrink-0 text-[19px] font-bold tabular-nums ${gasto ? 'text-orange-700' : 'text-success'}`}>
        {gasto ? '−' : '+'}
        {formatoPesos(m.montoCents)}
      </span>
    </button>
  );
}
