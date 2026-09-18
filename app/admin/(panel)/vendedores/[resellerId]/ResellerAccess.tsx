'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { createResellerLogin } from '../actions';

type Result = { ok: true; email: string; reused: boolean } | { ok: false; error: string };

// Creates the rep's login for vendedores.{dominio}. The password is
// typed here by whoever is running the panel (ideally with the rep
// present), exactly like the tenant owner's — this code only forwards
// it to Supabase Auth.
export function ResellerAccess({
  resellerId,
  currentEmail,
}: {
  resellerId: string;
  currentEmail: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleCreate() {
    setSubmitting(true);
    setMessage(null);
    const result: Result = await createResellerLogin(resellerId, { email, password });
    setSubmitting(false);

    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setMessage({
      ok: true,
      text: result.reused
        ? `Ese correo ya tenía cuenta: ${result.email} quedó vinculado como vendedor.`
        : `Acceso creado para ${result.email}.`,
    });
    setPassword('');
    router.refresh();
  }

  if (currentEmail) {
    return (
      <Card className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">Ya tiene acceso</p>
        <p className="text-sm text-muted">
          Entra a <span className="font-medium text-ink">vendedores.{process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'tuapp.com'}</span>{' '}
          con <span className="font-medium text-ink">{currentEmail}</span>. Si olvidó su contraseña, puede
          pedir el enlace desde esa misma pantalla.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex max-w-md flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-ink">Crear su acceso al panel de vendedores</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Sin esto, el vendedor está registrado pero no puede entrar a dar de alta negocios.
        </p>
      </div>
      <div>
        <Label htmlFor="rep-login-email">Correo</Label>
        <Input
          id="rep-login-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <Label htmlFor="rep-login-password">Contraseña</Label>
        <Input
          id="rep-login-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted">Mínimo 10 caracteres. El vendedor puede cambiarla después.</p>
      </div>

      {message && (
        <p
          className={`rounded-2xl p-3 text-sm ${message.ok ? 'bg-success-soft text-success' : 'bg-error-soft text-error'}`}
          role="status"
        >
          {message.text}
        </p>
      )}

      <Button type="button" onClick={handleCreate} isLoading={submitting} disabled={!email || !password}>
        {submitting ? 'Creando' : 'Crear acceso'}
      </Button>
    </Card>
  );
}
