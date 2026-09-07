import Link from 'next/link';
import { Button } from '@/components/ui/Button';

// Catches any unmatched path under a tenant subdomain (proxy.ts rewrites
// {slug}.{root}/whatever to /t/{slug}/whatever — if that doesn't match a
// real page, Next falls back to the nearest not-found.tsx up the tree).
// Kept deliberately neutral (platform tokens, not a tenant's own brand
// colors) — not-found.tsx renders with no access to route params, so
// there's no reliable way to look up which tenant's colors to use here.
export default function TenantNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <p className="text-lg font-semibold text-ink">Página no encontrada.</p>
      <p className="max-w-sm text-sm text-muted">La página que buscas no existe o se movió.</p>
      <Link href="/">
        <Button type="button">Ir al inicio</Button>
      </Link>
    </div>
  );
}
