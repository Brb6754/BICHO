'use client';

import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { toast } from '@/components/tenant-dash/ui/Toast';

// El mensaje de invitación, listo para mandar: se ve completo (para que
// sepa qué va a recibir el otro negocio) y se copia con un toque, para
// pegarlo en un chat, en un grupo de Facebook o en un estado.
export function CompartirReferido({ mensaje, url }: { mensaje: string; url: string }) {
  const [copiado, setCopiado] = useState<'mensaje' | 'link' | null>(null);

  async function copiar(que: 'mensaje' | 'link') {
    try {
      await navigator.clipboard.writeText(que === 'mensaje' ? mensaje : url);
      setCopiado(que);
      toast(que === 'mensaje' ? 'Mensaje copiado. Pégalo en un chat o un grupo.' : 'Link copiado');
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      toast('No se pudo copiar. Mantén el dedo sobre el texto para copiarlo.', 'error');
    }
  }

  const boton =
    'inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-ink/[0.04] active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  return (
    <div>
      <blockquote className="whitespace-pre-line rounded-2xl bg-ink/[0.04] px-4 py-4 text-[15px] leading-relaxed text-ink sm:px-5">
        {mensaje}
      </blockquote>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => copiar('mensaje')} className={boton}>
          {copiado === 'mensaje' ? <Check className="h-4 w-4 text-success" strokeWidth={2.5} aria-hidden="true" /> : <Copy className="h-4 w-4 text-muted" aria-hidden="true" />}
          {copiado === 'mensaje' ? 'Copiado' : 'Copiar mensaje'}
        </button>
        <button type="button" onClick={() => copiar('link')} className={boton}>
          {copiado === 'link' ? <Check className="h-4 w-4 text-success" strokeWidth={2.5} aria-hidden="true" /> : <Link2 className="h-4 w-4 text-muted" aria-hidden="true" />}
          {copiado === 'link' ? 'Copiado' : 'Copiar solo el link'}
        </button>
      </div>
    </div>
  );
}
