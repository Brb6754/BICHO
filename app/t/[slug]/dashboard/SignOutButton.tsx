'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { signOut } from '../actions';

// A plain menu row, not a Button variant: it was `ghost-inverse`, which is
// white text meant for dark panels, and on a light sidebar it vanished.
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
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-ink/[0.035] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
    >
      {isPending ? (
        <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      )}
      {isPending ? 'Saliendo' : 'Cerrar sesión'}
    </button>
  );
}
