import type { Metadata } from 'next';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Hero } from '@/components/marketing/Hero';
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
// the page alternates between them) — but this wrapper ALSO needs its
// own explicit dark bg, not just "no bg": the shared <body> (layout.tsx)
// carries the app-wide `bg-paper` token, which is near-black in dark
// mode. MarketingNav's floating pill is `sticky top-4`, and a sticky
// element's very first frame renders clamped to that offset while its
// reserved flow space still starts at 0 — the visual gap that leaves
// at the very top of the page falls through to whatever's behind this
// div, so without an explicit bg here that gap shows body's near-black
// instead of Hero's forest green (this was the "black line at the top
// of the page" bug). Everywhere else on the page this bg is fully
// covered by each section's own opaque background, so it only matters
// for that one sliver.
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
        <Hero />
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
