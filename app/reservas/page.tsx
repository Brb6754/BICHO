import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { ProblemSection } from '@/components/marketing/ProblemSection';
import { TrustSection } from '@/components/marketing/TrustSection';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
import { HowItWorksSection } from '@/components/marketing/HowItWorksSection';
import { StatsBar } from '@/components/marketing/StatsBar';
import { ResellerSection } from '@/components/marketing/ResellerSection';
import { FinalCta } from '@/components/marketing/FinalCta';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export const metadata: Metadata = {
  title: 'bicho reservas — Software & AI Solutions',
  // This page is reachable from two hosts — bichomx.com/reservas and
  // reservas.bichomx.com, which proxy.ts rewrites here. Without a
  // canonical that is duplicate content, and a search engine picks one
  // of the two arbitrarily while they compete against each other.
  //
  // The apex wins: the studio page, the portfolio and the /ia campaign
  // all live there, and a domain this new cannot afford to split its
  // authority across two hosts.
  //
  // Absolute on purpose. A relative canonical resolves against whatever
  // host served the page, which on the subdomain would point it at
  // itself and do nothing at all.
  alternates: {
    canonical: 'https://bichomx.com/reservas',
  },
  description:
    'bicho es la plataforma de reservas de citas para peluquerías, spas, consultorios y gimnasios: página de reservas con tu marca, disponibilidad en tiempo real y confirmación automática.',
};

// Moved here from the apex route (2026-09-18): bicho reservas is one of
// bicho's products, not the whole company — app/page.tsx is now the
// studio's own home (components/central/*), and this product's landing
// lives at /reservas instead. Content/design below is UNCHANGED by that
// move, per Bruno's explicit request — only its route changed, plus the
// internal `/#section` anchors in MarketingNav/MarketingFooter, which
// had to become `/reservas#section` or they'd point at the wrong page.
//
// `admin.*` and `{slug}.*` still rewrite to /admin and /t/[slug]
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
            one dark violet block (vendedores) → white (CTA)
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
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
