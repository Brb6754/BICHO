import { Scissors, Sparkles, Stethoscope, Dumbbell } from 'lucide-react';

// The reference's spot for a client-logo wall — bicho doesn't have real
// client logos to show yet, and a fabricated trust row would be a
// fabricated claim (same reasoning as the pricing/stats placeholders:
// don't invent social proof). Reframed honestly as "who this is built
// for" instead of "who already trusts us": true today, and it does the
// same visual job (a light band between the hero and the features).
const VERTICALS = [
  { label: 'Peluquerías y barberías', icon: Scissors },
  { label: 'Spas y salones', icon: Sparkles },
  { label: 'Consultorios', icon: Stethoscope },
  { label: 'Gimnasios', icon: Dumbbell },
];

export function TrustSection() {
  return (
    <section className="bg-[#F3F4EC] px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[10rem] text-sm font-medium leading-snug text-[#5B6B5A]">
          Hecho para estos negocios
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {VERTICALS.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 text-[#0B1A10]">
              <Icon className="h-5 w-5 text-[#5B6B5A]" strokeWidth={1.75} />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
