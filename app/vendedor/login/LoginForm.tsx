'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { signIn, requestPasswordReset } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export default function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'forgot' | 'sent'>('login');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null);
      const result = await signIn(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push('/');
      router.refresh();
    });
  }

  function handleForgotSubmit(formData: FormData) {
    const value = formData.get('email') as string;
    startTransition(async () => {
      setError(null);
      // Built from the current origin so the link comes back to the same
      // host this page was opened on (vendedores.dominio, a preview
      // deploy, or localhost).
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
        <p className="text-sm leading-relaxed text-muted">
          Si {email ? <span className="font-medium text-ink">{email}</span> : 'ese correo'} tiene una cuenta de
          vendedor, te llegará un enlace para elegir una contraseña nueva.
        </p>
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
        <p className="text-sm leading-relaxed text-muted">
          Escribe tu correo de vendedor y te mandamos un enlace para elegir una contraseña nueva.
        </p>
        {error && (
          <p className="rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error" role="alert">
            {error}
          </p>
        )}
        <div>
          <Label htmlFor="rep-forgot-email">Correo</Label>
          <Input id="rep-forgot-email" type="email" name="email" autoComplete="email" required autoFocus className="w-full" />
        </div>
        <Button type="submit" isLoading={isPending} className="w-full">
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
      {error && (
        <p className="rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      <div>
        <Label htmlFor="rep-email">Correo</Label>
        <Input
          id="rep-email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full"
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="rep-password">Contraseña</Label>
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
        <div className="relative">
          <Input
            id="rep-password"
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
      <Button type="submit" isLoading={isPending} className="mt-1 w-full">
        {isPending ? 'Entrando' : 'Entrar'}
      </Button>
    </form>
  );
}
