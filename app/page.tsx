import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Hero, HeroBackdrop } from '@/components/marketing/Hero';
import { ProblemSection } from '@/components/marketing/ProblemSection';
import { TrustSection } from '@/components/marketing/TrustSection';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
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
// Each section still owns its own dark-forest/cream bg (see tokens.ts;
// the page alternates between them) — but the outer div ALSO needs its
// own explicit dark bg, not just "no bg": the shared <body> (layout.tsx)
// carries the app-wide `bg-paper` token, which is near-black in dark
// mode, and would otherwise show through around/behind the nav.
//
// Deliberately not using the shared bg-paper/text-ink tokens for this,
// though — those are CSS-var-backed and theme-toggle-aware (see
// globals.css), which is right for the admin/tenant apps but wrong
// here: bicho's identity doesn't have a light/dark-mode variant and
// shouldn't flip with a visitor's leftover dashboard theme preference.
export default function MarketingHomePage() {
  return (
    <div className="bg-[#0D2B1B] text-white">
      <MarketingNav />
      <main>
        {/* This wrapper is pulled up by MarketingNav's own flow height
            (negative margin) and pads itself back down by the same
            amount, so HeroBackdrop's shapes — positioned from this
            wrapper's own top edge — can bleed all the way to the
            page's true top corner, behind the nav, instead of being
            clipped at Hero's own section (which starts BELOW the nav
            in flow, so a shape confined to it could never reach past
            that point). The negative-margin amount is coupled to
            MarketingNav's real rendered height (padding + pill) —
            re-check it visually if that component's sizing changes. */}
        <div className="relative -mt-[64px] overflow-hidden pt-[64px]">
          <HeroBackdrop />
          <Hero />
        </div>
        <ProblemSection />
        <TrustSection />
        <FeaturesSection />
        <StatsBar />
        <ResellerSection />
        <PricingSection />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
