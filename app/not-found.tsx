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
// looks like the same site.
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-[#0F3A31] px-6 text-center">
      <DotField />

      <div className="relative flex flex-col items-center gap-8">
        <BichoLogo className="h-9" />

        <div>
          <p className="font-[family-name:var(--font-display)] text-[5rem] font-bold leading-none text-[#D4F23A]">
            404
          </p>
          <p className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold text-white">
            Esta página no existe.
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#9FB3AA]">
            Revisa el link, o vuelve al inicio y busca lo que necesitas desde ahí.
          </p>
        </div>

        <PillLink href="/">Ir al inicio</PillLink>
      </div>
    </div>
  );
}
