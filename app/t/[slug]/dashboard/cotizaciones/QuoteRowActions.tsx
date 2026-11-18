'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, Mail, MessageCircle, Trash2 } from 'lucide-react';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { toast } from '@/components/tenant-dash/ui/Toast';
import { mensajeDeError } from '@/components/tenant-dash/ui/ActionForm';
import { sendQuote, deleteQuote } from './actions';

// Lo que se hace con una cotización ya hecha: mandarla por WhatsApp,
// copiar su link, bajarla en PDF, mandarla por correo, o borrarla.
//
// WhatsApp va primero: en México la mitad de las cotizaciones se mandan
// por ahí, y obligar a pasar por el correo sería diseñar para el flujo
// que no ocurre.

const BOTON =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-[15px] font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60';
const BOTON_WHATSAPP =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[15px] font-semibold text-[rgb(var(--color-cta-fg))] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2';

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

  // El link se arma al tocar, no al pintar: en el servidor no hay
  // window.location y un href distinto entre servidor y cliente es un
  // error de hidratación.
  const enlace = () => `${window.location.origin}/cotizacion/${quoteId}`;
  const porWhatsApp = () =>
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Hola ${customerName}, aquí está tu cotización: ${enlace()}`)}`,
      '_blank',
      'noopener'
    );

  async function porCorreo() {
    if (enviando) return;
    setEnviando(true);
    const res = await sendQuote(slug, quoteId);
    setEnviando(false);
    if (!res.ok) return toast(res.error, 'error');
    // Si no había correo del cliente, decirlo: creería que salió y en
    // realidad solo cambió de estado.
    toast(res.emailed ? 'Cotización enviada por correo' : 'No tiene correo: mándale el link por WhatsApp');
    router.refresh();
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace());
      setCopiado(true);
      toast('Link copiado');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast('No se pudo copiar. Abre la cotización y copia la dirección.', 'error');
    }
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <button type="button" onClick={porWhatsApp} className={BOTON_WHATSAPP}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Mandar por WhatsApp
      </button>

      <button type="button" onClick={copiar} className={BOTON}>
        {copiado ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        {copiado ? 'Copiado' : 'Copiar link'}
      </button>

      <a href={`/api/cotizacion/${quoteId}/pdf`} className={BOTON}>
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        PDF
      </a>

      <button type="button" onClick={porCorreo} disabled={enviando} className={BOTON}>
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        {enviando ? 'Enviando…' : 'Correo'}
      </button>

      {/* Borrar va al final y separado con `ml-auto`: las otras acciones
          se usan a diario y esta una vez. Pasa por ConfirmForm porque no
          hay papelera — borrar una cotización se lleva también sus
          conceptos, por la cascada de la llave foránea. */}
      <ConfirmForm
        action={async () => {
          try {
            await deleteQuote(slug, quoteId);
            toast('Cotización borrada');
          } catch (e) {
            toast(mensajeDeError(e), 'error');
          }
        }}
        confirmTitle="Borrar cotización"
        confirmMessage={`¿Borrar la cotización de ${customerName} (#${folio})? Se va con todo lo que incluye y no se puede deshacer. Si ya se la mandaste, su link deja de abrir.`}
        confirmLabel="Sí, borrarla"
        dismissLabel="No, conservarla"
        triggerVariant="ghost"
        triggerClassName="ml-auto min-h-11 !border-0 px-3 text-[15px] !text-muted hover:!bg-error-soft hover:!text-error"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Borrar
        <span className="sr-only"> la cotización de {customerName}</span>
      </ConfirmForm>
    </div>
  );
}
