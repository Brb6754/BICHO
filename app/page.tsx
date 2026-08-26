import { Badge } from '@/components/ui/Badge';

export default function MarketingHomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-primary px-6 text-center text-white">
      <div>
        <Badge tone="inverse">Próximamente</Badge>
        <p className="mt-4 text-2xl font-semibold tracking-tight">Sitio de marketing en construcción.</p>
      </div>
    </main>
  );
}
