'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, Send } from 'lucide-react';
import { sendQuote } from './actions';

// Las tres cosas que un vendedor hace con una cotización ya hecha:
// mandarla por correo, copiar su enlace para WhatsApp, o bajarla en PDF.
//
// Copiar el enlace está al mismo nivel que enviar por correo, no
// escondido: en México la mitad de las cotizaciones se mandan por
// WhatsApp, y obligar a pasar por el correo sería diseñar para el flujo
// que no ocurre.
export function QuoteRowActions({ slug, quoteId }: { slug: string; quoteId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const enlace =
    typeof window === 'undefined' ? '' : `${window.location.origin}/cotizacion/${quoteId}`;

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setAviso(null);
    const res = await sendQuote(slug, quoteId);
    setEnviando(false);
    if (!res.ok) {
      setAviso(res.error);
      return;
    }
    // Si no había correo del cliente, decirlo: el vendedor creería que
    // salió y en realidad solo cambió de estado.
    setAviso(res.emailed ? 'Enviada por correo.' : 'Marcada como enviada. Comparte el enlace.');
    router.refresh();
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setAviso('No se pudo copiar. Abre la cotización y copia la dirección.');
    }
  }

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.04] disabled:opacity-60"
      >
        <Send className="h-3.5 w-3.5" aria-hidden="true" />
        {enviando ? 'Enviando…' : 'Enviar'}
      </button>

      <button
        type="button"
        onClick={copiar}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.04]"
      >
        {copiado ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        {copiado ? 'Copiado' : 'Enlace'}
      </button>

      <a
        href={`/api/cotizacion/${quoteId}/pdf`}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.04]"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        PDF
      </a>

      {aviso && <span className="text-[12px] text-muted">{aviso}</span>}
    </div>
  );
}
