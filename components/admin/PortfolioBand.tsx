type Segment = { key: string; label: string; count: number; bar: string; dot: string };

// The portfolio metrics used to be five identical cards in a row
// (total / activos / trial / MRR / churn). Five equal boxes say all
// five numbers matter equally and give the eye no order to read them
// in — and three of those numbers are the same fact sliced three ways.
//
// This is one composed block instead: the size of the portfolio as the
// single dominant figure, its composition as an actual proportion bar
// (which answers "how healthy is the book?" at a glance in a way three
// separate integers never do), and the soft money numbers demoted to a
// footnote line where their caveats can be stated next to them.
//
// bg-canvas is the theme-independent "one dramatic block per screen"
// token — the same contract the marketing page uses for its stats
// band. It holds deep teal in light and dark mode alike.
export function PortfolioBand({
  total,
  active,
  trial,
  suspended,
  cancelled,
  mrr,
  planPrice,
}: {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  cancelled: number;
  mrr: number;
  planPrice: number;
}) {
  // A single-hue ramp plus the lime accent, not four unrelated colors:
  // "active" is the state that matters, so it gets the one bright
  // color, and the rest step down in weight toward cancelled.
  // The bar and the legend dot are separate values on purpose. A
  // segment can afford to be near-transparent when it's a sliver of a
  // filled bar, but the legend dot has to stay legible even when its
  // count is 0 — at 12% white on teal it simply wasn't there. Every
  // dot also carries a faint ring so the lightest one still reads as
  // a deliberate marker rather than a smudge.
  const segments: Segment[] = [
    { key: 'active', label: 'Activos', count: active, bar: 'bg-accent', dot: 'bg-accent' },
    { key: 'trial', label: 'En trial', count: trial, bar: 'bg-canvas-fg/70', dot: 'bg-canvas-fg/75' },
    { key: 'suspended', label: 'Suspendidos', count: suspended, bar: 'bg-canvas-fg/32', dot: 'bg-canvas-fg/45' },
    { key: 'cancelled', label: 'Cancelados', count: cancelled, bar: 'bg-canvas-fg/14', dot: 'bg-canvas-fg/22' },
  ];

  const counted = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <section className="mt-8 overflow-hidden rounded-[28px] bg-canvas px-7 py-8 text-canvas-fg sm:px-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:items-center lg:gap-14">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[3.25rem] font-bold leading-none text-accent">
            {total}
          </p>
          <p className="mt-2 text-sm leading-snug text-canvas-fg/70">
            {total === 1 ? 'negocio' : 'negocios'} dados de alta en la plataforma
          </p>
        </div>

        <div>
          {counted > 0 ? (
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-canvas-fg/10"
              role="img"
              aria-label={segments.map((s) => `${s.label}: ${s.count}`).join(', ')}
            >
              {segments.map((s) =>
                s.count > 0 ? (
                  <span
                    key={s.key}
                    className={s.bar}
                    style={{ width: `${(s.count / counted) * 100}%` }}
                  />
                ) : null
              )}
            </div>
          ) : (
            <div className="h-2.5 w-full rounded-full bg-canvas-fg/10" aria-hidden="true" />
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {segments.map((s) => (
              <div key={s.key} className="flex items-center gap-2.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ring-1 ring-canvas-fg/25 ${s.dot}`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="truncate text-xs text-canvas-fg/60">{s.label}</dt>
                  <dd className="text-lg font-bold leading-tight">{s.count}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Money numbers live below the rule, at body size, with their
          caveats attached — they are the least trustworthy figures on
          the screen and shouldn't be the loudest. */}
      <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-canvas-fg/15 pt-5 text-sm">
        <p className="text-canvas-fg/70">
          MRR estimado{' '}
          <span className="font-semibold text-canvas-fg">${mrr.toLocaleString('es-MX')} MXN</span>
          <span className="text-canvas-fg/45">
            {' '}
            · {active} activos × ${planPrice}
          </span>
        </p>
        <p className="text-canvas-fg/45">
          Churn — disponible cuando exista facturación real (paso 7)
        </p>
      </div>
    </section>
  );
}
