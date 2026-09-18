import { MarketingNav } from './MarketingNav';
import { MarketingFooter } from './MarketingFooter';

// Shared wrapper for /privacidad and /terminos — same nav/footer as the
// homepage (still bicho, still one site), but the content itself reads
// as a plain document (white background, dark text, narrow measure) —
// legal text is the one place on this site where the bold black/lime
// marketing treatment would actively hurt readability of long
// paragraphs. No HeroBackdrop/diagonal shapes here on purpose.
export function LegalPageLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white text-[#140F2E]">
      <MarketingNav />
      <main className="bg-white px-6 py-20 text-[#140F2E]">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-[#6A6488]">Última actualización: {updated}</p>
          <div className="prose-legal mt-10 flex flex-col gap-6 text-[15px] leading-relaxed text-[#2A2350]">
            {children}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
