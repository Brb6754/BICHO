'use client';

import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { track } from '@vercel/analytics';

// Vercel Analytics solo en las páginas de marketing (no en los paneles ni en
// las páginas de los negocios: no son tráfico de bicho y gastarían la cuota).
// Un solo listener cuenta TODOS los clics a /registro, incluidos los de
// componentes de servidor, sin tocar cada botón.
export function Medicion() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as Element | null)?.closest?.('a');
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (href.startsWith('/registro')) {
        track('cta_registro', { pagina: location.pathname, plan: new URL(href, location.origin).searchParams.get('plan') ?? 'ninguno' });
      } else if (a.dataset.evento) {
        track(a.dataset.evento, { pagina: location.pathname });
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return <Analytics />;
}
