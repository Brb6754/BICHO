import { Clock, Palette, MailX } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';

// The reference's stat band shows fake usage numbers ("120+ clientes",
// "2.5M+ leads") — bicho has no real customers yet, so copying that
// pattern with invented traction numbers would be a fabricated claim
// (same boundary as the pricing/trust-row placeholders). These three
// are real, true statements about the OFFER itself, not made-up usage
// metrics, in the same visual slot.
const STATS = [
  { Icon: Clock, value: '15 días', label: 'de prueba, sin tarjeta' },
  { Icon: Palette, value: '100%', label: 'con tu marca, no una plantilla' },
  { Icon: MailX, value: '0', label: 'clientes perdidos por no confirmar' },
];

export function StatsBar() {
  return (
    <section className="bg-[#F3F4EC] px-6 pb-24">
      <Reveal className="mx-auto max-w-6xl rounded-3xl bg-[#0D2B1B] px-8 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STATS.map(({ Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D4F23A]">
                <Icon className="h-5 w-5 text-black" strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-sm text-[#9CA99A]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
