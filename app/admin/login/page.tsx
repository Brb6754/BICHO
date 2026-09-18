import LoginForm from './LoginForm';
import { Card } from '@/components/ui/Card';
import { BichoLogo } from '@/components/marketing/BichoLogo';

// Carries `admin-shell` so the login wears the same bicho palette as
// the panel behind it (see the token block in globals.css) — it's the
// first screen of every session, and it was the one admin surface left
// in the old indigo/violet. The ambient blur blobs are gone for the
// same reason they left AdminShell: they're fixed indigo in CSS, so
// they can't follow this palette, and they were the last of the
// glassmorphism era.
//
// The logo sits on a teal plaque because the logo FILE is a white and
// lime wordmark drawn for dark grounds — placed straight onto the
// cream page it would be invisible. Same problem the tenant sidebar
// solves in reverse, with a white badge behind a dark tenant logo.
export default function AdminLoginPage() {
  return (
    <main className="admin-shell relative flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex items-center justify-center rounded-2xl bg-primary px-5 py-4">
            <BichoLogo className="h-7" />
          </span>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-bold text-ink">
            Acceso del equipo
          </h1>
          <p className="mt-1.5 text-small text-muted">
            Panel interno de bicho. Solo para el equipo de la plataforma.
          </p>
        </div>
        <Card elevation="overlay" className="rounded-[28px]">
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
