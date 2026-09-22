import type { Metadata } from 'next';
import { Hero } from '@/components/central/Hero';
import { ServicesSection } from '@/components/central/ServicesSection';
import { PortfolioSection } from '@/components/central/PortfolioSection';
import { WhySection } from '@/components/central/WhySection';
import { CentralFinalCta } from '@/components/central/CentralFinalCta';
import { CentralFooter } from '@/components/central/CentralFooter';

export const metadata: Metadata = {
  title: 'bicho — estudio de software, IA y datos',
  description:
    'Estudio en Durango: SaaS a la medida, páginas y apps web, agentes de IA y data science para finanzas y marketing. Trabajo en producción, no maquetas.',
};

// The apex/root domain serves the STUDIO's home; bicho reservas is one
// of its services and lives at /reservas (see that file's header).
//
// Dark for the page's full length, not white-with-a-dark-hero — that
// second pattern is bicho reservas' own, and reusing it here made this
// page read as "the other bicho" no matter what the palette did. The
// accent (#3B00FF) is sampled from Bruno's real logo file, not chosen.
//
// Order is deliberate: the suite first (what bicho does), then proof
// (what it shipped), then how it works, then the ask.
export default function CentralHomePage() {
  return (
    <div className="bg-[#05091C]">
      <main>
        <Hero />
        <ServicesSection />
        <PortfolioSection />
        <WhySection />
        <CentralFinalCta />
      </main>
      <CentralFooter />
    </div>
  );
}
