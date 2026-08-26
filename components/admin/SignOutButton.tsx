'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { signOut } from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';

export default function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost-inverse"
      onClick={handleSignOut}
      isLoading={isPending}
      className="w-full justify-start text-xs"
    >
      {!isPending && <LogOut className="h-3.5 w-3.5" />}
      {isPending ? 'Saliendo...' : 'Cerrar sesión'}
    </Button>
  );
}
