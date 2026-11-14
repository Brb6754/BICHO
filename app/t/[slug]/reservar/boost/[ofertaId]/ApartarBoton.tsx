'use client';

import { useEffect, useState, useTransition } from 'react';
import { CalendarCheck2, Loader2 } from 'lucide-react';
import { tenantManageBookingUrl } from '@/lib/urls';
import { apartarHuecoBoost } from '../actions';

type Estado = 'libre' | 'tuya' | 'pasado';

function restante(expiraAt: string): number {
  return Math.max(0, Math.floor((new Date(expiraAt).getTime() - Date.now()) / 1000));
}

export function ApartarBoton({
  slug,
  ofertaId,
  estado,
  expiraAt,
  ctaStyle,
  reservarUrl,
}: {
  slug: string;
  ofertaId: string;
  estado: Estado;
  /** Fin de la ventana del descuento; null = sin descuento (aviso VIP o ya vencido). */
  expiraAt: string | null;
  ctaStyle: React.CSSProperties;
  reservarUrl: string;
}) {
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState<{ bookingId: string } | null>(null);
  const [segundos, setSegundos] = useState<number | null>(expiraAt ? restante(expiraAt) : null);

  useEffect(() => {
    if (!expiraAt) return;
    const t = setInterval(() => setSegundos(restante(expiraAt)), 1000);
    return () => clearInterval(t);
  }, [expiraAt]);

  if (lista) {
    return (
      <div className="mt-6 text-center" role="status">
        <CalendarCheck2 className="mx-auto h-9 w-9 text-success" aria-hidden="true" />
        <p className="mt-2 text-lg font-semibold text-ink">¡Listo, el horario es tuyo!</p>
        <a href={tenantManageBookingUrl(slug, lista.bookingId)} className="mt-3 inline-block text-sm font-medium text-ink underline underline-offset-4">
          Ver, cambiar o cancelar mi cita
        </a>
      </div>
    );
  }

  if (estado !== 'libre') {
    return (
      <p className="mt-6 text-center text-[15px] text-muted">
        {estado === 'tuya' ? 'Ya apartaste este horario. Te esperamos.' : 'Este horario ya pasó.'}{' '}
        <a href={reservarUrl} className="font-medium text-ink underline underline-offset-4">
          Ver otros horarios
        </a>
      </p>
    );
  }

  const vencio = segundos === 0;
  return (
    <div className="mt-6">
      {segundos !== null && (
        <p className="mb-3 text-center text-sm tabular-nums text-muted" aria-live="polite">
          {vencio
            ? 'El descuento ya venció; si lo apartas ahora, es a precio normal.'
            : `El descuento vale ${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')} min más.`}
        </p>
      )}
      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await apartarHuecoBoost(slug, ofertaId);
            if (r.ok) setLista({ bookingId: r.bookingId });
            else setError(r.error);
          })
        }
        style={ctaStyle}
        className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
      >
        {pendiente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {pendiente ? 'Apartando…' : 'Apartar este horario'}
      </button>
      {error && (
        <p className="mt-3 rounded-xl bg-error-soft px-4 py-3 text-sm text-ink" role="alert">
          {error}{' '}
          <a href={reservarUrl} className="font-medium underline underline-offset-4">
            Ver otros horarios
          </a>
        </p>
      )}
    </div>
  );
}
