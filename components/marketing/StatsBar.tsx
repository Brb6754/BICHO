import { Palette, MailX } from 'lucide-react';
import { PillLink } from './Primitives';
import { Reveal } from './Reveal';
import { DotField } from './DotField';

// The reference's stat band shows usage numbers ("120+ clientes",
// "2.5M+ leads") — bicho has no customers yet, so those numbers would
// be fabricated. These are true statements about the OFFER instead.
//
// Composition, not a row of three: the first figure is the headline
// and gets display size plus the whole left half; the other two are
// support and sit stacked on the right, divided by a hairline, at
// body size. Three equal columns would have said all three matter
// equally, which isn't true — the free trial is the ask.
const SUPPORTING = [
  { Icon: Palette, value: 'Tu marca', label: 'tus colores y tu logo, no una plantilla con tu nombre' },
  { Icon: MailX, value: 'Cero', label: 'clientes perdidos por una confirmación que no mandaste' },
];

export function StatsBar() {
  return (
    // No vertical padding of its own: this panel floats inside the
    // page's cream middle, between FeaturesSection and
    // HowItWorksSection, and both of those already end/begin with
    // py-24 sm:py-28. Adding padding here too would stack two gaps
    // below the panel and one above it. If this section is ever moved
    // next to a dark section, it needs its own padding back — a teal
    // panel with only a sliver of cream above it reads as a broken
    // section, not as a floating panel.
    <section className="bg-[#F5F3FC] px-6">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[#1B1040] px-8 py-12 sm:px-12">
        <DotField tone="onDark" />
        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
          <div>
            <p className="font-[family-name:var(--font-display)] text-[3.5rem] font-bold leading-none text-[#D4F23A] sm:text-[4.5rem]">
              15 días
            </p>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-white">
              de prueba completa, sin tarjeta. Si no te sirve, no pagas nada y
              no hay que cancelar nada.
            </p>
            <div className="mt-7">
              <PillLink
                href="/demo"
                tone="lime"
              >
                Quiero probarlo
              </PillLink>
            </div>
          </div>

          <dl className="lg:border-l lg:border-white/10 lg:pl-16">
            {SUPPORTING.map(({ Icon, value, label }, i) => (
              <div
                key={value}
                className={`flex items-start gap-4 py-6 ${i === 0 ? 'border-b border-white/10 pt-0' : 'pb-0'}`}
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4F23A]">
                  <Icon className="h-5 w-5 text-[#140F2E]" strokeWidth={1.75} />
                </span>
                <div>
                  <dt className="text-lg font-bold text-white">{value}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[#B9B1E6]">{label}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </section>
  );
}
