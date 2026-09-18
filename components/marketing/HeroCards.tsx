import { Check, CalendarDays } from 'lucide-react';

// The two cards that float over the headline. They replace the big
// product-mock pane that used to fill the hero's right half: at hero
// scale that mock read as a purple calendar nobody could parse, and it
// forced the whole composition into "text on the left, screenshot on
// the right", which is the layout every SaaS landing page has.
//
// Frosted rather than solid: at 70% white over the violet field the grid
// behind them still reads through the blur, so they sit IN the hero
// instead of on top of it. 70 and not less on purpose — the composite
// keeps dark text around 10:1, where a properly transparent glass card
// would drop it under AA and these two carry real information.
//
// These are still the real product — a confirmed appointment and a
// business's day — just reduced to the one line each that a visitor can
// read while scrolling past. Rotated a few degrees and overlapping the
// type on purpose: a card sitting square inside a column reads as a
// widget, a card breaking the type's edge reads as a composition.

export function ConfirmedCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-[15rem] -rotate-[5deg] rounded-2xl bg-white/70 p-4 shadow-[0_28px_60px_-24px_rgba(11,6,40,0.55)] ring-1 ring-inset ring-white/60 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5B34E8]">
          <Check className="h-4 w-4 text-white" strokeWidth={3} />
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-bold text-[#140F2E]">Cita confirmada</p>
          <p className="text-[11px] font-medium text-[#524C73]">Mañana · 10:30 a.m.</p>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-white/55 px-3 py-2 text-[11px] font-medium leading-snug text-[#524C73]">
        Se avisó sola, por correo.
      </p>
    </div>
  );
}

export function AgendaCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-[14rem] rotate-[4deg] rounded-2xl bg-white/70 p-4 shadow-[0_28px_60px_-24px_rgba(11,6,40,0.55)] ring-1 ring-inset ring-white/60 backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4F23A] text-[11px] font-bold text-[#140F2E]">
          SB
        </span>
        <p className="text-[13px] font-bold leading-tight text-[#140F2E]">Studio Bella</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-[#5B34E8]" strokeWidth={2.25} aria-hidden="true" />
        <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold leading-none text-[#140F2E]">
          6 citas
        </p>
      </div>
      <p className="mt-1 text-[11px] font-medium text-[#524C73]">hoy, sin contestar un mensaje</p>
    </div>
  );
}

// Small calendar that rides at the headline's bottom-left corner. It is
// decoration that happens to be true: this is a booking product, so the
// one ornament the hero gets is a month with days already taken.
//
// Three passes on the colour, ending here: the booked cells are the
// strong lime, which needs a dark ground to fire — lime on lime is
// invisible and white on lime is 1.27:1, both of which we tried. On this
// deep violet the lime cells are ~14:1, and the card now speaks the same
// language as the product mocks further down the page (dark panel, lime
// accent). The chosen day is white so it stays distinct from the booked
// ones without adding a fourth colour.
//
// No month name and no real dates on purpose — a hardcoded "Septiembre"
// is wrong for eleven months of the year, and this is too small to read a
// number off anyway. The weekday row is what makes it legible as a
// calendar; the filled cells are what make it read as a business that is
// getting booked.
const TAKEN = new Set([3, 6, 9, 14, 17, 22, 25]);
const CHOSEN = 11;

export function MiniCalendar({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-[8.5rem] -rotate-[8deg] rounded-2xl bg-[#1B1040] p-3 shadow-[0_24px_50px_-22px_rgba(11,6,40,0.7)] ${className}`}
    >
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#D4F23A]">Tu agenda</p>
      <div className="mt-2 grid grid-cols-7 gap-[3px]">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-center text-[7px] font-bold leading-none text-white/40">
            {d}
          </span>
        ))}
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className={`aspect-square rounded-[3px] ${
              i === CHOSEN ? 'bg-white' : TAKEN.has(i) ? 'bg-[#D4F23A]' : 'bg-white/12'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
