import type { Metadata } from 'next';
import LoginForm from './LoginForm';
import { AuthShell } from '@/components/tenant-dash/AuthShell';

export const metadata: Metadata = {
  title: 'Entrar a tu panel',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  // The dashboard layout sends people here with ?error= when their
  // account isn't a member of this business. That message used to be
  // dropped on the floor: they landed on a blank form with no idea why.
  const { error } = await searchParams;

  return (
    <AuthShell slug={slug} description="Entra para ver tu agenda y administrar tus citas.">
      <LoginForm initialError={typeof error === 'string' ? error : null} />
    </AuthShell>
  );
}
