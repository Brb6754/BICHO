import ResetPasswordForm from './ResetPasswordForm';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

export default function ResetPasswordPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-6">
      <div className="ambient-glow">
        <div className="ambient-glow-accent" />
      </div>
      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <Text variant="h1" className="mb-6 text-center">
          Elegí una contraseña nueva
        </Text>
        <Card elevation="overlay" className="rounded-[28px]">
          <ResetPasswordForm />
        </Card>
      </div>
    </main>
  );
}
