import { Check, Circle } from 'lucide-react';
import { BICHO } from './tokens';

// Small illustrated mockups of the real product — used in the hero's
// floating cards and the feature cards below, in the exact "photo card"
// slots the reference design uses real photography for. Deliberately
// NOT stock photography: this is a software product, so a miniature of
// its own real screens (a calendar, a confirmation, a branded booking
// page, a dashboard stat) is both more honest (no fabricated "agency
// life" photos of people who don't work here) and more on-brief (ground
// the design in the actual subject matter) than a generic desk/phone
// photo would be. Pure CSS/SVG, no image assets, no licensing risk.

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
// row, col grid of which cells have a mock appointment — just enough
// texture to read as "a real calendar", not a literal data claim.
const APPOINTMENTS: Record<number, number[]> = { 1: [2], 2: [1, 4], 4: [3], 5: [0, 2] };

export function CalendarMock() {
  return (
    <div className="flex h-full w-full flex-col gap-2 rounded-2xl bg-[#132E1F] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/[0.06]">
      <div className="flex items-center justify-between">
        <div className="h-2 w-16 rounded-full bg-white/25" />
        <div className="h-2 w-2 rounded-full bg-[#D4F23A]" />
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1.5">
        {DAYS.map((d, col) => (
          <span key={col} className="text-center text-[9px] font-medium text-white/35">
            {d}
          </span>
        ))}
        {Array.from({ length: 4 }).map((_, row) =>
          DAYS.map((_, col) => {
            const filled = APPOINTMENTS[row]?.includes(col);
            return (
              <span
                key={`${row}-${col}`}
                className={`aspect-square rounded-md ${filled ? 'bg-[#D4F23A]' : 'bg-white/10'}`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

export function BookingPageMock() {
  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-2xl bg-[#132E1F] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/[0.06]">
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 rounded-full bg-[#D4F23A]" />
        <span className="h-2 w-20 rounded-full bg-white/25" />
      </div>
      <div className="mt-1 flex-1 space-y-2">
        {[0.9, 0.7, 0.8].map((w, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-2.5">
            <span className="h-2 rounded-full bg-white/25" style={{ width: `${w * 60}%` }} />
            <span className="h-5 w-5 shrink-0 rounded-full bg-[#D4F23A]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardMock() {
  return (
    <div className="grid h-full w-full grid-cols-2 gap-2 rounded-2xl bg-[#132E1F] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/[0.06]">
      <div className="col-span-2 flex flex-col justify-center rounded-xl bg-[#D4F23A] p-3">
        <span className="text-[10px] font-medium text-black/60">Próximas citas</span>
        <span className="text-2xl font-bold text-black">24</span>
      </div>
      <div className="rounded-xl bg-white/[0.06] p-2.5">
        <span className="text-[9px] text-white/40">Recursos</span>
        <p className="text-base font-bold text-white">6</p>
      </div>
      <div className="rounded-xl bg-white/[0.06] p-2.5">
        <span className="text-[9px] text-white/40">Servicios</span>
        <p className="text-base font-bold text-white">12</p>
      </div>
    </div>
  );
}

export function ConfirmationMock() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl bg-[#132E1F] p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/[0.06]">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D4F23A]">
        <Check className="h-5 w-5 text-black" strokeWidth={3} />
      </span>
      <div className="space-y-1.5">
        <span className="block h-2 w-28 rounded-full bg-white/30" />
        <span className="mx-auto block h-2 w-20 rounded-full bg-white/15" />
      </div>
      <span className="mt-1 rounded-full bg-white/[0.08] px-4 py-1.5 text-[10px] font-medium text-white/60">
        Ver mi cita
      </span>
    </div>
  );
}

// A quiet dot-grid decoration — same idea as ResellerSection's texture,
// reused here in the hero for the small dot-cluster the reference has
// beneath its floating photo cards.
export function DotGrid({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-5 gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: 15 }).map((_, i) => (
        <Circle key={i} className="h-1.5 w-1.5 fill-current text-[#D4F23A]/50" />
      ))}
    </div>
  );
}

export const MOCK_BG = BICHO.canvasRaised;
