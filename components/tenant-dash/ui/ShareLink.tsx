'use client';

import { useEffect, useState } from 'react';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { toast } from './Toast';

// LA ACCIÓN #1 DE VALOR: QUE SUS CLIENTAS TENGAN EL LINK.
//
// Una agenda en línea que nadie conoce no agenda nada. Por eso el link
// vive a la mano en todo el panel (barra de arriba en el teléfono, menú
// lateral en la computadora, inicio y primeros pasos), y siempre con las
// dos cosas que la dueña hace con él: copiarlo para su bio o mandarlo
// por WhatsApp.
//
// `marcaCompartido` deja la seña que lee el checklist de primeros pasos
// ("compartir tu link"): la base no sabe si alguien pegó un link en un
// chat, así que lo recuerda este teléfono.

export const LLAVE_COMPARTIDO = (slug: string) => `bicho:link-compartido:${slug}`;

function marcar(slug?: string) {
  if (!slug) return;
  try {
    localStorage.setItem(LLAVE_COMPARTIDO(slug), '1');
    window.dispatchEvent(new Event('bicho:link-compartido'));
  } catch {
    // Modo privado o almacenamiento bloqueado: el paso solo no se palomea.
  }
}

function mensajeWhatsapp(url: string, negocio?: string) {
  return `Ya puedes agendar tu cita${negocio ? ` en ${negocio}` : ''} desde aquí, a cualquier hora: ${url}`;
}

/** Portapapeles moderno y, si el navegador lo bloquea (navegador de
 *  Instagram/Facebook, origen inseguro), el viejo execCommand. */
async function alPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function copiar(url: string, slug?: string) {
  if (await alPortapapeles(url)) {
    marcar(slug);
    toast('Enlace copiado');
    return true;
  }
  // Ni así: se lo enseñamos para que lo copie a mano.
  toast(`No se pudo copiar. Tu link es ${url}`, 'error');
  return false;
}

/**
 * Los dos botones juntos: "Copiar link" y "WhatsApp". Para el inicio y
 * para los primeros pasos, donde hay espacio.
 */
export function ShareLink({
  url,
  slug,
  negocio,
  corto = false,
  className = '',
}: {
  url: string;
  slug?: string;
  negocio?: string;
  /** Etiquetas de una palabra ("Copiar", "WhatsApp") para espacios angostos como el menú. */
  corto?: boolean;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 1800);
    return () => clearTimeout(t);
  }, [copiado]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={async () => setCopiado(await copiar(url, slug))}
        className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-ink transition-[transform,background-color] duration-150 hover:bg-ink/[0.04] active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {copiado ? (
          <Check className="h-4 w-4 text-success" strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4 text-muted" aria-hidden="true" />
        )}
        {copiado ? 'Copiado' : corto ? 'Copiar' : 'Copiar mi link'}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp(url, negocio))}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => marcar(slug)}
        className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full bg-[#177a41] px-4 text-sm font-semibold text-white transition-[transform,filter] duration-150 hover:brightness-110 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {corto ? 'WhatsApp' : 'Mandar por WhatsApp'}
      </a>
    </div>
  );
}

/**
 * Un solo botón compacto para la barra de arriba del teléfono: abre la
 * hoja de compartir del sistema (donde ya están WhatsApp e Instagram) y,
 * si el navegador no la tiene, copia el link.
 */
export function ShareLinkCompact({ url, slug, negocio }: { url: string; slug?: string; negocio?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        if (typeof navigator.share === 'function') {
          try {
            await navigator.share({
              title: negocio,
              text: mensajeWhatsapp(url, negocio),
              url,
            });
            marcar(slug);
            return;
          } catch (e) {
            // Cerró la hoja sin compartir: no es un error ni amerita copiar.
            if ((e as Error)?.name === 'AbortError') return;
          }
        }
        await copiar(url, slug);
      }}
      className="ml-auto inline-flex min-h-[2.75rem] shrink-0 items-center gap-1.5 rounded-full bg-[rgb(var(--color-cta-fg)/0.14)] px-3.5 text-[13px] font-semibold text-[rgb(var(--color-cta-fg))] transition-[transform,background-color] duration-150 hover:bg-[rgb(var(--color-cta-fg)/0.22)] active:scale-[0.96] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-cta-fg)/0.6)]"
    >
      <Share2 className="h-4 w-4" aria-hidden="true" />
      Compartir mi link
    </button>
  );
}
