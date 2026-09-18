import type { Metadata } from 'next';
import LoginForm from './LoginForm';
import { Card } from '@/components/ui/Card';
import { BichoLogo } from '@/components/marketing/BichoLogo';

export const metadata: Metadata = {
  title: 'Acceso de vendedores',
  robots: { index: false, follow: false },
};

// Wears `admin-shell` (bicho's teal/lime/cream palette) like the
// internal login: a rep sells bicho, so this is bicho's front door, not
// a business's. The logo sits on a teal plaque because the logo file is
// a white+lime wordmark drawn for dark grounds.
export default async function ResellerLoginPage({
  searchParams,
}: {
  // The panel gate redirects here with ?error= when a signed-in account
  // isn't a rep (or was switched off) — otherwise that bounce looked
  // like the login had simply failed for no reason.
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="admin-shell relative flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex items-center justify-center rounded-2xl bg-primary px-5 py-4">
            <BichoLogo className="h-7" />
          </span>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold text-ink">
            Acceso de vendedores
          </h1>
          <p className="mt-1.5 text-small text-muted">
            Da de alta tus negocios y sigue tus comisiones.
          </p>
        </div>
        <Card elevation="overlay" className="rounded-[28px]">
          <LoginForm initialError={typeof error === 'string' ? error : null} />
        </Card>
        <p className="mt-6 text-center text-xs text-muted">
          ¿Quieres vender bicho en tu zona? Escríbenos a{' '}
          <a href="mailto:nonameynk@gmail.com" className="font-medium text-ink underline underline-offset-4">
            nonameynk@gmail.com
          </a>
        </p>
      </div>
    </main>
  );
}
