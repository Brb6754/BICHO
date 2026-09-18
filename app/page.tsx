import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { ProblemSection } from '@/components/marketing/ProblemSection';
import { TrustSection } from '@/components/marketing/TrustSection';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
import { HowItWorksSection } from '@/components/marketing/HowItWorksSection';
import { StatsBar } from '@/components/marketing/StatsBar';
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
// The page is white-grounded (see tokens.ts): sections own their own
// bg, and the two dark violet blocks are punctuation, not the field.
// The outer div still needs an explicit white bg, not just "no bg":
// the shared <body> (layout.tsx) carries the app-wide `bg-paper` token,
// which is near-black in dark mode, and would otherwise show through
// around/behind the nav.
//
// Deliberately not using the shared bg-paper/text-ink tokens for this,
// though — those are CSS-var-backed and theme-toggle-aware (see
// globals.css), which is right for the admin/tenant apps but wrong
// here: bicho's identity doesn't have a light/dark-mode variant and
// shouldn't flip with a visitor's leftover dashboard theme preference.
export default function MarketingHomePage() {
  return (
    <div className="bg-white text-[#140F2E]">
      <main>
        {/* Hero renders the nav itself — see the comment in Hero.tsx.
            It has to, so the full-bleed visual can run up behind the
            nav to the page's top edge instead of starting under it. */}
        {/* The rhythm is now white-dominant, and the banding is what
            separates sections: white (hero) → mist (problem) → white
            (who it's for, what it does) → mist (how it works) → the
            one dark violet block (vendedores) → white (precios, CTA)
            → dark footer. Only two surfaces on the whole page are
            dark violet — the stats panel and the vendedores band —
            and they're what keeps a white page from going flat.
            StatsBar's panel still has to sit BETWEEN two light
            sections: it has no vertical padding of its own. */}
        <Hero />
        <ProblemSection />
        <TrustSection />
        <FeaturesSection />
        <StatsBar />
        <HowItWorksSection />
        <ResellerSection />
        <PricingSection />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
