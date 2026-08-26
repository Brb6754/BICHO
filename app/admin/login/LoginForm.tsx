'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '../actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await signIn(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push('/tenants');
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="rounded-2xl bg-error-soft p-3 text-sm text-error">{error}</p>}
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
    </form>
  );
}
