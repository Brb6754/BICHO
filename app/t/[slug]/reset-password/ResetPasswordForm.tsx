'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Loader2 } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 10;

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      // Only works if /auth/callback already exchanged a valid recovery
      // code for a real session on this browser — if the link expired or
      // was already used, this fails with an auth error instead of a
      // silent no-op, which is what the error message below explains.
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(
          updateError.message.includes('session')
            ? 'Este enlace ya venció o ya se usó. Pide uno nuevo desde la pantalla de acceso.'
            : 'No pudimos guardar la contraseña. Inténtalo de nuevo.'
        );
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    });
  }

  if (done) {
    return (
      <p className="animate-fade-in flex items-center gap-2.5 text-sm font-medium text-ink" role="status">
        <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden="true" />
        Contraseña guardada. Entrando a tu panel
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
      {error && (
        <p className="animate-fade-in rounded-xl bg-error-soft px-3.5 py-2.5 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      <div>
        <Label htmlFor="new-password">Contraseña nueva</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          className="w-full"
        />
        {/* Live length hint instead of an error after submitting: the
            rule is known up front, so say it while they type. */}
        <p className={`mt-1.5 text-xs tabular-nums ${password.length >= MIN_PASSWORD_LENGTH ? 'text-success' : 'text-muted'}`}>
          {password.length >= MIN_PASSWORD_LENGTH
            ? 'Longitud suficiente'
            : `${password.length} de ${MIN_PASSWORD_LENGTH} caracteres`}
        </p>
      </div>
      <div>
        <Label htmlFor="confirm-password">Repite la contraseña</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          error={confirm.length > 0 && confirm !== password.slice(0, confirm.length)}
          className="w-full"
        />
      </div>
      <Button type="submit" isLoading={isPending} className="mt-1 w-full !rounded-xl !py-3">
        {isPending ? 'Guardando' : 'Guardar y entrar'}
      </Button>
    </form>
  );
}
