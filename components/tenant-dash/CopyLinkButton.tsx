'use client';

import { useEffect, useState } from 'react';
import { Check, Link2 } from 'lucide-react';

// What an owner actually does with their booking page: paste it into a
// WhatsApp chat or an Instagram bio. One click, and the button itself says
// it worked, so there's no toast to hunt for.
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions). Fall back
      // to opening the page so the owner can copy it from the address bar.
      window.open(url, '_blank', 'noreferrer');
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-[transform,background-color] duration-150 hover:bg-ink/[0.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="relative h-4 w-4" aria-hidden="true">
        <Link2
          className={`absolute inset-0 h-4 w-4 text-muted transition-all duration-200 ${copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100'}`}
        />
        <Check
          className={`absolute inset-0 h-4 w-4 text-success transition-all duration-200 ${copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
          strokeWidth={2.5}
        />
      </span>
      <span aria-live="polite">{copied ? 'Enlace copiado' : 'Copiar enlace de reservas'}</span>
    </button>
  );
}
