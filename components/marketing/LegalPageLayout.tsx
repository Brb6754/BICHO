import { MarketingNav } from './MarketingNav';
import { MarketingFooter } from './MarketingFooter';

// Shared wrapper for /privacidad and /terminos — same nav/footer as the
// homepage (still bicho, still one site), but the content itself reads
// as a plain document (cream background, dark text, narrow measure) —
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
    <div className="bg-[#0D2B1B] text-white">
      <MarketingNav />
      <main className="bg-[#F3F4EC] px-6 py-20 text-[#0B1A10]">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-[#5B6B5A]">Última actualización: {updated}</p>
          <div className="prose-legal mt-10 flex flex-col gap-6 text-[15px] leading-relaxed text-[#1F2A1C]">
            {children}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
