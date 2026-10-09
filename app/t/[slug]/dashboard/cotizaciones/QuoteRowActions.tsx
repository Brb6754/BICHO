'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, Send, Trash2 } from 'lucide-react';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { sendQuote, deleteQuote } from './actions';

// Lo que un vendedor hace con una cotización ya hecha: mandarla por
// correo, copiar su enlace para WhatsApp, bajarla en PDF, o borrarla.
//
// Copiar el enlace está al mismo nivel que enviar por correo, no
// escondido: en México la mitad de las cotizaciones se mandan por
// WhatsApp, y obligar a pasar por el correo sería diseñar para el flujo
// que no ocurre.
export function QuoteRowActions({
  slug,
  quoteId,
  folio,
  customerName,
}: {
  slug: string;
  quoteId: string;
  folio: string;
  customerName: string;
}) {
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

      {/* Borrar va al final y separado del resto con `ml-auto`: las otras
          tres acciones se usan a diario y esta una vez. Pasa por el mismo
          ConfirmForm que el resto del panel porque no hay papelera —
          borrar una cotización se lleva también sus conceptos, por la
          cascada de la llave foránea. */}
      <ConfirmForm
        action={deleteQuote.bind(null, slug, quoteId)}
        confirmTitle="Borrar cotización"
        confirmMessage={`¿Borrar la #${folio} de ${customerName}? Se va con todos sus conceptos y no se puede deshacer. Si ya se la mandaste al cliente, su enlace deja de abrir.`}
        confirmLabel="Borrar"
        dismissLabel="No, conservarla"
        triggerVariant="ghost"
        triggerClassName="ml-auto h-11 w-11 !border-0 !p-0 !text-muted hover:!bg-error-soft hover:!text-error sm:ml-2"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Borrar cotización</span>
      </ConfirmForm>

      {aviso && <span className="text-[12px] text-muted">{aviso}</span>}
    </div>
  );
}
