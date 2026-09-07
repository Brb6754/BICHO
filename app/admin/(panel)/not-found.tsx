import Link from 'next/link';
import { Button } from '@/components/ui/Button';

// Catches any unmatched path under admin.{root} (proxy.ts rewrites it to
// /admin/whatever — if that doesn't match a real page, Next falls back
// to the nearest not-found.tsx up the tree, which used to be the root
// one — meant for the public marketing site, not this internal panel).
export default function AdminNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <p className="text-lg font-semibold text-ink">Página no encontrada.</p>
      <p className="max-w-sm text-sm text-muted">La página que buscas no existe o se movió.</p>
      <Link href="/tenants">
        <Button type="button">Ir a Tenants</Button>
      </Link>
    </div>
  );
}
