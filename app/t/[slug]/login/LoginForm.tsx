'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, requestPasswordReset } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'forgot' | 'sent'>('login');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
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
    const email = formData.get('email') as string;
    startTransition(async () => {
      setError(null);
      // Built from the current origin, not guessed server-side — has to
      // match wherever this page is actually being viewed from (dev,
      // preview deploy, prod, whatever domain ends up in front of this).
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const result = await requestPasswordReset(email, redirectTo);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode('sent');
    });
  }

  if (mode === 'sent') {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-ink">
          Si ese correo tiene una cuenta, te mandamos un enlace para elegir una contraseña nueva.
        </p>
        <button
          type="button"
          onClick={() => setMode('login')}
          className="text-sm text-primary hover:underline dark:text-accent"
        >
          Volver a iniciar sesión
        </button>
      </div>
    );
  }

  if (mode === 'forgot') {
    return (
      <form action={handleForgotSubmit} className="flex flex-col gap-4">
        {error && <p className="rounded-2xl bg-error-soft p-3 text-sm text-error">{error}</p>}
        <p className="text-sm text-muted">Escribí tu correo y te mandamos un enlace para restablecer tu contraseña.</p>
        <div>
          <Label>Correo</Label>
          <Input type="email" name="email" required className="w-full" />
        </div>
        <Button type="submit" disabled={isPending} className="mt-2 w-full">
          {isPending ? 'Enviando...' : 'Enviar enlace'}
        </Button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode('login');
          }}
          className="text-sm text-muted hover:text-ink hover:underline"
        >
          Volver a iniciar sesión
        </button>
      </form>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="rounded-2xl bg-error-soft p-3 text-sm text-error">{error}</p>
      )}
      <div>
        <Label>Correo</Label>
        <Input type="email" name="email" required className="w-full" />
      </div>
      <div>
        <Label>Contraseña</Label>
        <Input type="password" name="password" required className="w-full" />
      </div>
      <Button type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? 'Entrando...' : 'Entrar'}
      </Button>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setMode('forgot');
        }}
        className="text-sm text-muted hover:text-ink hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}
