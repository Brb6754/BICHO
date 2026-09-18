import type { Metadata } from 'next';
import ResetPasswordForm from './ResetPasswordForm';
import { AuthShell } from '@/components/tenant-dash/AuthShell';

export const metadata: Metadata = {
  title: 'Elige una contraseña nueva',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <AuthShell
      slug={slug}
      title="Elige una contraseña nueva"
      description="Usa al menos 10 caracteres. Después entras directo a tu panel."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
