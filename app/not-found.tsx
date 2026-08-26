import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
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
