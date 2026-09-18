'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { signIn, requestPasswordReset } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="animate-fade-in rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error" role="alert">
      {children}
    </p>
  );
}

export default function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'forgot' | 'sent'>('login');
  const [error, setError] = useState<string | null>(initialError);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const result = await signIn(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    });
  }

  function handleForgotSubmit(formData: FormData) {
    const value = formData.get('email') as string;
    startTransition(async () => {
      setError(null);
      // Built from the current origin, not guessed server-side — has to
      // match wherever this page is actually being viewed from (dev,
      // preview deploy, prod, whatever domain ends up in front of this).
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const result = await requestPasswordReset(value, redirectTo);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEmail(value);
      setMode('sent');
    });
  }

  if (mode === 'sent') {
    return (
      <div className="animate-fade-in flex flex-col items-start gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-ink">Revisa tu correo</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Si {email ? <span className="font-medium text-ink">{email}</span> : 'ese correo'} tiene una cuenta, te
            llegará un enlace para elegir una contraseña nueva. Puede tardar un par de minutos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode('login')}
          className="text-sm font-medium text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
        >
          Volver a iniciar sesión
        </button>
      </div>
    );
  }

  if (mode === 'forgot') {
    return (
      <form action={handleForgotSubmit} className="animate-fade-in flex flex-col gap-5">
        <div>
          <p className="font-semibold text-ink">Recupera tu acceso</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Escribe el correo con el que entras y te mandamos un enlace para elegir una contraseña nueva.
          </p>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div>
          <Label htmlFor="forgot-email">Correo</Label>
          <Input
            id="forgot-email"
            type="email"
            name="email"
            autoComplete="email"
            defaultValue={email}
            required
            autoFocus
            className="w-full"
          />
        </div>
        <Button type="submit" isLoading={isPending} className="w-full !rounded-xl !py-3">
          {isPending ? 'Enviando' : 'Enviar enlace'}
        </Button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode('login');
          }}
          className="self-center text-sm text-muted transition-colors hover:text-ink"
        >
          Volver a iniciar sesión
        </button>
      </form>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-5">
      {error && <ErrorNote>{error}</ErrorNote>}
      <div>
        <Label htmlFor="login-email">Correo</Label>
        <Input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full"
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="login-password">Contraseña</Label>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode('forgot');
            }}
            className="mb-1 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            ¿La olvidaste?
          </button>
        </div>
        {/* The eye toggle matters most on a phone, where a mistyped
            password is invisible and the error just says "no coinciden". */}
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            required
            className="w-full !pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-1 my-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" isLoading={isPending} className="mt-1 w-full !rounded-xl !py-3">
        {isPending ? 'Entrando' : 'Entrar'}
      </Button>
    </form>
  );
}
