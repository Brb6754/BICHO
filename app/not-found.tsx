import { BichoLogo } from '@/components/marketing/BichoLogo';
import { DotField } from '@/components/marketing/DotField';
import { PillLink } from '@/components/marketing/Primitives';

// The apex domain's 404 — proxy.ts leaves an unmatched apex path
// un-rewritten, so it lands here whenever a link is stale or mistyped.
// t/[slug] and admin/(panel) have their own not-found.tsx (neutral
// platform styling) specifically so this one is free to be Bicho-
// branded without misrepresenting a broken tenant-dashboard or
// admin-panel link as the public marketing site.
//
// Uses the same dot texture and pill CTA as the landing rather than a
// one-off decorative shape, so a wrong URL still lands somewhere that
// looks like the same site. That is also why it was the last page still
// painted in the old teal after the landing went white and violet — it
// lives outside components/marketing/, so the repaint missed it, and a
// 404 in the previous identity is exactly the page nobody checks.
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-[#5B34E8] px-6 text-center">
      <DotField tone="onDark" />

      <div className="relative flex flex-col items-center gap-8">
        <BichoLogo className="h-9" />

        <div>
          <p className="font-[family-name:var(--font-display)] text-[5rem] font-bold leading-none text-[#D4F23A]">
            404
          </p>
          <p className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold text-white">
            Esta página no existe.
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#E3DEFA]">
            Revisa el link, o vuelve al inicio y busca lo que necesitas desde ahí.
          </p>
        </div>

        <PillLink href="/">Ir al inicio</PillLink>
      </div>
    </div>
  );
}
