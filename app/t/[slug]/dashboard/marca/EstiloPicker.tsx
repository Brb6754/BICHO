'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { ESTILOS, type Estilo } from '@/lib/branding/dashEstilo';

// "Estilo del panel": cuatro miniaturas dibujadas con los colores del
// propio negocio (los tokens ya están puestos por el layout), una vista
// previa grande de la elegida y un botón que la guarda.

const v = (t: string, a = 1) => `rgb(var(${t}) / ${a})`;

/** Un boceto del Resumen en ese estilo. Todo en %, así sirve chico y grande. */
export function EstiloMini({ estilo }: { estilo: Estilo }) {
  const caja = (s: React.CSSProperties) => <span className="absolute" style={s} />;
  if (estilo === 'clasico')
    return (
      <span className="relative block aspect-[16/10] overflow-hidden rounded-[10%/16%]" style={{ background: 'rgb(228 229 231)' }}>
        {caja({ left: '20%', top: '5%', right: '3%', bottom: '5%', borderRadius: '8% / 12%', background: 'rgb(246 246 247)' })}
        {[0, 1, 2, 3].map((i) =>
          caja({ left: `${24 + i * 18.5}%`, top: '13%', width: '16.5%', height: '26%', borderRadius: '18%', background: i ? '#fff' : v('--color-primary') })
        )}
        {caja({ left: '24%', top: '45%', width: '42%', height: '44%', borderRadius: '10%', background: '#fff' })}
        {[0, 1, 2, 3, 4, 5].map((i) =>
          caja({ left: `${28 + i * 6}%`, bottom: '16%', width: '3.6%', height: `${[18, 26, 12, 30, 22, 20][i]}%`, borderRadius: 99, background: i === 3 ? v('--color-primary') : i === 2 ? 'repeating-linear-gradient(-45deg, rgb(0 0 0/.18) 0 1px, transparent 1px 3px)' : v('--color-primary', 0.35) })
        )}
        {caja({ left: '69%', top: '45%', width: '28%', height: '44%', borderRadius: '14%', background: '#fff' })}
        {caja({ left: '74%', top: '56%', width: '18%', height: '18%', borderRadius: '99px 99px 0 0', border: `3px solid ${v('--color-primary')}`, borderBottom: 0 })}
        {caja({ left: '6%', top: '14%', width: '9%', height: '3%', borderRadius: 9, background: 'rgb(0 0 0/.18)' })}
        {caja({ left: '3%', top: '22%', width: '1%', height: '5%', background: v('--color-primary') })}
        {[0, 1, 2, 3].map((i) => caja({ left: '6%', top: `${23 + i * 7}%`, width: '10%', height: '3%', borderRadius: 9, background: 'rgb(0 0 0/.12)' }))}
      </span>
    );
  if (estilo === 'suave')
    return (
      <span className="relative block aspect-[16/10] overflow-hidden rounded-[10%/16%]" style={{ background: 'rgb(231 231 234)' }}>
        {caja({ left: '22%', top: '10%', width: '24%', height: '42%', borderRadius: '22%', background: v('--color-accent') })}
        {caja({ left: '49%', top: '10%', width: '24%', height: '42%', borderRadius: '22%', background: '#fff' })}
        {caja({ left: '54%', top: '22%', width: '10%', height: '16%', borderRadius: 99, background: v('--color-primary') })}
        {caja({ left: '60%', top: '24%', width: '8%', height: '13%', borderRadius: 99, background: v('--color-accent') })}
        {caja({ left: '76%', top: '10%', width: '21%', height: '42%', borderRadius: '22%', background: '#fff' })}
        {[0, 1, 2].map((i) => caja({ left: '79%', top: `${22 + i * 9}%`, width: '15%', height: '2.4%', borderRadius: 9, background: `linear-gradient(90deg, ${v('--color-accent')} ${70 - i * 20}%, rgb(0 0 0/.08) 0)` }))}
        {caja({ left: '22%', top: '57%', width: '75%', height: '35%', borderRadius: '9%/22%', background: '#fff' })}
        {[0, 1, 2, 3, 4, 5].map((i) => caja({ left: `${27 + i * 11}%`, bottom: '13%', width: '2.4%', height: `${[14, 20, 10, 22, 16, 12][i]}%`, borderRadius: 99, background: v('--color-accent') }))}
        {[0, 1, 2, 3, 4, 5].map((i) => caja({ left: `${30 + i * 11}%`, bottom: '13%', width: '2.4%', height: `${[10, 12, 18, 9, 20, 15][i]}%`, borderRadius: 99, background: v('--color-secondary') }))}
        {caja({ left: '4%', bottom: '8%', width: '14%', height: '20%', borderRadius: '20%', background: 'rgb(23 23 23)' })}
        {caja({ left: '24%', top: '40%', width: '9%', height: '6%', borderRadius: 99, background: 'rgb(23 23 23)' })}
      </span>
    );
  if (estilo === 'vibrante')
    return (
      <span className="relative block aspect-[16/10] overflow-hidden rounded-[10%/16%]" style={{ background: 'rgb(243 243 240)' }}>
        {caja({ left: '20%', top: '5%', right: '3%', height: '54%', borderRadius: '8%/14%', background: v('--color-primary') })}
        {caja({ left: '25%', top: '14%', width: '24%', height: '6%', borderRadius: 4, background: v('--color-cta-fg', 0.9) })}
        {caja({ left: '25%', top: '27%', width: '18%', height: '17%', borderRadius: 6, background: v('--color-cta-fg', 0.9) })}
        {[0, 1, 2, 3].map((i) => caja({ left: `${58 + (i % 2) * 19}%`, top: `${12 + Math.floor(i / 2) * 22}%`, width: '17%', height: '19%', borderRadius: '20%', background: '#fff' }))}
        {caja({ left: '20%', top: '63%', right: '3%', bottom: 0, borderRadius: '8% 8% 0 0 / 22% 22% 0 0', background: '#0B0B0B' })}
        {caja({ left: '25%', top: '74%', width: '34%', height: '14%', borderBottom: `2px solid ${v('--tenant-dark-glow')}`, borderRadius: '0 0 40% 0' })}
        {[['#E5484D', 63], ['#3E63DD', 74], ['#C5F04A', 85]].map(([c, x]) => caja({ left: `${x}%`, top: '72%', width: '9.5%', height: '20%', borderRadius: '20%', background: c as string }))}
      </span>
    );
  return (
    <span className="relative block aspect-[16/10] overflow-hidden rounded-[10%/16%]" style={{ background: v('--tenant-dark-paper') }}>
      {caja({ inset: 0, background: `radial-gradient(70% 70% at 90% 0%, ${v('--tenant-dark-glow', 0.35)}, transparent 60%)` })}
      {caja({ left: '22%', top: '10%', width: '36%', height: '52%', borderRadius: '14%', background: `radial-gradient(90% 90% at 90% 0%, ${v('--tenant-dark-glow', 0.5)}, ${v('--tenant-dark-surface')} 65%)` })}
      {caja({ left: '26%', top: '34%', width: '24%', height: '18%', borderRadius: 4, background: 'rgb(242 242 238/.92)' })}
      {[0, 1, 2, 3].map((i) => caja({ left: `${61 + (i % 2) * 18.5}%`, top: `${10 + Math.floor(i / 2) * 27}%`, width: '16.5%', height: '25%', borderRadius: '18%', background: v('--tenant-dark-surface'), border: '1px solid rgb(255 255 255/.08)' }))}
      {caja({ left: '22%', top: '67%', right: '3%', height: '25%', borderRadius: '6%/22%', background: v('--tenant-dark-surface') })}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => caja({ left: `${26 + i * 10}%`, bottom: '12%', width: '6%', height: `${[8, 12, 6, 14, 10, 4, 9][i]}%`, borderRadius: 3, background: v('--tenant-dark-glow') }))}
    </span>
  );
}

export function EstiloPicker({ inicial, onSave }: { inicial: Estilo; onSave: (estilo: Estilo) => Promise<{ ok: true } | { ok: false; error: string }> }) {
  const [elegido, setElegido] = useState<Estilo>(inicial);
  const [guardado, setGuardado] = useState<Estilo>(inicial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const info = ESTILOS.find((e) => e.id === elegido)!;

  return (
    <section aria-labelledby="estilo-titulo" className="dash-card border border-border bg-surface p-5 sm:p-7">
      <h2 id="estilo-titulo" className="text-[17px] font-semibold tracking-tight text-ink">
        Estilo del panel
      </h2>
      <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-muted">Cómo se ve este panel para ti y tu equipo. Tus clientes no lo ven.</p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div role="radiogroup" aria-label="Estilos" className="grid grid-cols-2 gap-3">
          {ESTILOS.map((e) => {
            const activo = e.id === elegido;
            return (
              <button
                key={e.id}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => {
                  setElegido(e.id);
                  setError(null);
                }}
                className={`group relative rounded-2xl p-2 text-left transition-[box-shadow,transform] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  activo ? 'shadow-[0_0_0_2px_rgb(var(--color-ink))]' : 'shadow-[0_0_0_1px_rgb(var(--color-border-base)/0.12)] hover:shadow-[0_0_0_1px_rgb(var(--color-border-base)/0.3)]'
                }`}
              >
                <EstiloMini estilo={e.id} />
                <span className="mt-2 flex min-h-[2.25rem] items-center justify-between gap-2 px-1">
                  <span>
                    <span className="block text-sm font-semibold text-ink">{e.nombre}</span>
                    <span className="block text-xs text-muted">{e.tipo}</span>
                  </span>
                  {activo && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-paper" aria-hidden="true">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-col">
          <p className="text-sm font-medium text-muted">Vista previa</p>
          <div className="mt-2 overflow-hidden rounded-2xl shadow-[0_0_0_1px_rgb(var(--color-border-base)/0.1)]">
            <EstiloMini estilo={elegido} />
          </div>
          <p className="mt-4 text-[15px] font-semibold text-ink">{info.nombre}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">{info.detalle}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending || elegido === guardado}
              onClick={() =>
                start(async () => {
                  const r = await onSave(elegido);
                  if (r.ok) setGuardado(elegido);
                  else setError(r.error);
                })
              }
              className="ui-btn inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Guardando…' : elegido === guardado ? 'Es tu estilo actual' : `Usar estilo ${info.nombre}`}
            </button>
            <p role="status" className="text-sm text-muted">
              {error ? <span className="text-error">{error}</span> : null}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
