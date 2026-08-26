'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

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
            ? 'El enlace ya venció o ya se usó — pide uno nuevo desde la pantalla de acceso.'
            : updateError.message
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
    return <p className="text-sm text-ink">Contraseña actualizada. Redirigiendo…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-2xl bg-error-soft p-3 text-sm text-error">{error}</p>}
      <div>
        <Label>Contraseña nueva</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full"
        />
      </div>
      <div>
        <Label>Confirmar contraseña</Label>
        <Input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full"
        />
      </div>
      <Button type="button" onClick={handleSubmit} disabled={isPending} className="mt-2 w-full">
        {isPending ? 'Guardando...' : 'Guardar contraseña'}
      </Button>
    </div>
  );
}
