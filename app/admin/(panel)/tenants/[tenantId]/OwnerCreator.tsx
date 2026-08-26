'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';

type CreateResult = { ok: true; email: string; reused: boolean } | { ok: false; error: string };

export function OwnerCreator({
  currentOwnerEmail,
  onCreate,
}: {
  currentOwnerEmail: string | null;
  onCreate: (input: { email: string; password: string }) => Promise<CreateResult>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setMessage(null);
    const result = await onCreate({ email, password });
    setSubmitting(false);

    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setMessage({
      ok: true,
      text: result.reused
        ? 'Ya existía un usuario con ese correo — se vinculó como dueño de este negocio.'
        : 'Cuenta creada y vinculada como dueño.',
    });
    setEmail('');
    setPassword('');
  }

  return (
    <Card>
      <p className="mb-1 text-sm font-semibold text-ink">Dueño / acceso al dashboard</p>
      <p className="mb-4 text-sm text-muted">
        {currentOwnerEmail ? `Dueño actual: ${currentOwnerEmail}` : 'Sin dueño asignado todavía.'}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label>Correo</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
        </div>
        <div className="min-w-[160px] flex-1">
          <Label>Contraseña</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" />
        </div>
        <Button type="button" onClick={handleSubmit} disabled={submitting || !email || !password}>
          {submitting ? 'Creando...' : currentOwnerEmail ? 'Agregar / reemplazar dueño' : 'Crear dueño'}
        </Button>
      </div>
      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-primary dark:text-accent' : 'text-error'}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
