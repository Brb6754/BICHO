import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { GridField } from '@/components/marketing/Flourishes';
import { RegistroFlow } from './RegistroFlow';

export const metadata: Metadata = {
  title: 'Crea tu página de reservas — bicho',
  description: 'Crea la página de citas de tu negocio en 10 minutos, desde tu celular. 15 días gratis, sin tarjeta.',
};

// Alta sin Bruno: el dueño crea cuenta, negocio y página solo. Mismo
// marco visual que /demo; el formulario va primero porque en teléfono es
// lo único que importa en esta página.
export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-[#5B34E8] text-[#140F2E]">
      <section className="relative isolate overflow-hidden">
        <GridField />
        <MarketingNav tone="onViolet" />
        <div className="relative mx-auto max-w-xl px-4 pb-16 pt-4 sm:px-6">
          <Link href="/reservas" className="inline-flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver
          </Link>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(2rem,8vw,3.2rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-white">
            Tu página de <span className="text-[#D4F23A]">reservas</span> en 10 minutos
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#E3DEFA]">15 días gratis, sin tarjeta. Tus clientes agendan solos, tú ves tus citas en el panel.</p>
          <div className="mt-8">
            <RegistroFlow />
          </div>
        </div>
      </section>
    </div>
  );
}
