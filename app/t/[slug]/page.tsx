import { Badge } from '@/components/ui/Badge';

export default function TenantHomePage({ params }: { params: { slug: string } }) {
  return (
    <main className="min-h-screen bg-paper p-8">
      <Badge>Negocio</Badge>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{params.slug}</h1>
      <p className="mt-1 text-muted">Pendiente: dashboard y página de reserva.</p>
    </main>
  );
}
