import type { Metadata } from 'next';
import { Hero } from '@/components/central/Hero';
import { PlatformSection } from '@/components/central/PlatformSection';
import { ServicesSection } from '@/components/central/ServicesSection';
import { PortfolioSection } from '@/components/central/PortfolioSection';
import { WhySection } from '@/components/central/WhySection';
import { CentralFinalCta } from '@/components/central/CentralFinalCta';
import { CentralFooter } from '@/components/central/CentralFooter';
import { Cinta } from '@/components/central/Cinta';
import { metaPagina } from '@/lib/seo/sitio';

export const metadata: Metadata = metaPagina({
  titulo: 'bicho estudio — tecnología para pymes',
  descripcion:
    'Reservas, reuniones, cotizaciones y facturación para negocios pequeños en México, con una sola ficha por cliente, más software a la medida. Accesible y en producción, no maquetas.',
  path: '/estudio',
});

// La casa del estudio. Vivía en la raíz hasta 2026-11-14, cuando la raíz
// pasó a ser la landing del producto (dolor de belleza, CTA a /registro).
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
          {/* La cinta cruza del lima al berenjena, montada sobre las dos. */}
          <Cinta />
          <PortfolioSection />
          <WhySection />
          <CentralFinalCta />
        </div>
      </main>
      <CentralFooter />
    </div>
  );
}
