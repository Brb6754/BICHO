import LoginForm from './LoginForm';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-6">
      <div className="ambient-glow">
        <div className="ambient-glow-accent" />
      </div>
      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <div className="mb-6 text-center">
          <Badge tone="default">Panel interno</Badge>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Acceso del equipo
          </h1>
        </div>
        <Card elevation="overlay" className="rounded-[28px]">
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
