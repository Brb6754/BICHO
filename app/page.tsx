import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Hero } from '@/components/marketing/Hero';
import { ProblemSection } from '@/components/marketing/ProblemSection';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
import { ResellerSection } from '@/components/marketing/ResellerSection';
import { PricingSection } from '@/components/marketing/PricingSection';
import { FinalCta } from '@/components/marketing/FinalCta';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'bicho — Software & AI Solutions',
  description:
    'bicho es la plataforma de reservas de citas para peluquerías, spas, consultorios y gimnasios: página de reservas con tu marca, disponibilidad en tiempo real y confirmación automática.',
};

// The apex/root domain (no tenant subdomain) serves this marketing site —
// see proxy.ts's extractSubdomain(): a bare host or one that doesn't
// match `{slug}.${ROOT_DOMAIN}` returns `null` and is left un-rewritten,
// landing here. `admin.*` and `{slug}.*` rewrite to /admin and /t/[slug]
// respectively and never reach this file.
//
// Pure black canvas + white text is set explicitly on the wrapper below
// instead of relying on the shared bg-paper/text-ink tokens: those are
// CSS-var-backed and theme-toggle-aware (see globals.css), which is
// exactly right for the admin/tenant apps but wrong here — bicho's
// black/lime identity doesn't have a light-mode variant and shouldn't
// flip with a visitor's leftover dashboard theme preference.
export default function MarketingHomePage() {
  return (
    <div className="bg-[#000000] text-white">
      <MarketingNav />
      <main>
        <Hero />
        <ProblemSection />
        <FeaturesSection />
        <ResellerSection />
        <PricingSection />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
