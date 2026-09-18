import Link from 'next/link';

// Catches any unmatched path under a tenant subdomain (proxy.ts rewrites
// {slug}.{root}/whatever to /t/{slug}/whatever — if that doesn't match a
// real page, Next falls back to the nearest not-found.tsx up the tree).
// Kept deliberately neutral (platform tokens, not a tenant's own brand
// colors) — not-found.tsx renders with no access to route params, so
// there's no reliable way to look up which tenant's colors to use here.
export default function TenantNotFound() {
  return (
    <main className="tenant-dash flex min-h-screen flex-col justify-center bg-paper px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-sm font-medium text-muted">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Esta página no existe</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Puede que el enlace esté incompleto o que la página se haya movido. La página de reservas sigue en su lugar.
        </p>
        {/* A link styled as a button, not <Link><Button/></Link>: two
            nested interactive elements are invalid HTML. */}
        <Link
          href="/"
          className="mt-6 flex w-full items-center justify-center rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
        >
          Ir a reservar
        </Link>
      </div>
    </main>
  );
}
