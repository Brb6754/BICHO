import Link from 'next/link';
import { BichoLogo } from '@/components/marketing/BichoLogo';

// The apex domain's 404 — proxy.ts leaves an unmatched apex path
// un-rewritten, so it lands here whenever a link is stale or mistyped.
// t/[slug] and admin/(panel) have their own not-found.tsx now (neutral
// platform styling) specifically so this one is free to be Bicho-
// branded without misrepresenting a broken tenant-dashboard or
// admin-panel link as the public marketing site.
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-[#0D2B1B] px-6 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[20px] top-0 h-[150px] w-[340px] opacity-90"
        style={{ background: '#D4F23A', clipPath: 'polygon(0 0, 75% 0, 20% 100%, 0 100%)' }}
      />
      <BichoLogo className="h-10" />
      <div>
        <p className="text-5xl font-bold text-white">404</p>
        <p className="mt-3 text-lg font-semibold text-white">Esta página no existe.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#9CA99A]">
          Revisa el link, o volvé al inicio y buscá lo que necesitás desde ahí.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-full bg-[#D4F23A] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-95"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
