import type { Metadata } from 'next';
import { Hero } from '@/components/central/Hero';
import { PlatformSection } from '@/components/central/PlatformSection';
import { ServicesSection } from '@/components/central/ServicesSection';
import { PortfolioSection } from '@/components/central/PortfolioSection';
import { WhySection } from '@/components/central/WhySection';
import { CentralFinalCta } from '@/components/central/CentralFinalCta';
import { CentralFooter } from '@/components/central/CentralFooter';

export const metadata: Metadata = {
  title: 'bicho — tecnología para pymes',
  description:
    'Reservas, cotizaciones y facturación para negocios pequeños en México, más software a la medida. Accesible y en producción, no maquetas.',
};

// El dominio raíz sirve la casa de bicho; la plataforma se explica por
// dentro en /reservas.
//
// CAMBIO DE RUMBO, 2026-10-09 (Bruno). Esta página era oscura de punta
// a punta a propósito, para no leerse como "el otro bicho" junto a la
// landing del producto. Ahora adopta ese mismo lenguaje —blanco de
// suelo, morado como color estructural— porque el posicionamiento se
// unificó: tecnología para pymes, accesible y muy funcional. Dos voces
// para un mismo mensaje confundían más de lo que separaban.
//
// El orden vende en el orden en que se cree: primero lo que puede ver
// funcionando hoy (la plataforma), después lo que se construye a la
// medida, luego la prueba de que se entregó, y al final la pregunta.
export default function CentralHomePage() {
  return (
    <div className="bg-white">
      <main>
        <Hero />

        {/* La hoja blanca lapa sobre el morado: es lo que hace que el
            blanco se lea como la página y el morado como su apertura,
            en vez de dos bloques apilados. */}
        <div className="relative z-10 -mt-8 rounded-t-[2rem] bg-white sm:-mt-10 sm:rounded-t-[2.5rem]">
          <PlatformSection />
          <ServicesSection />
          <PortfolioSection />
          <WhySection />
          <CentralFinalCta />
        </div>
      </main>
      <CentralFooter />
    </div>
  );
}
