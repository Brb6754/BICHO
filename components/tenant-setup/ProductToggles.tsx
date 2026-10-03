'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Qué productos tiene contratado el negocio.
//
// Un interruptor por producto, los dos en la misma tarjeta, porque la
// pregunta comercial es una sola: ¿qué le vendiste? El mismo componente
// sirve al panel interno y al del vendedor; quién puede tocarlo lo
// decide la acción, no este archivo.
export function ProductToggles({
  reservas,
  cotizaciones,
  onToggle,
}: {
  reservas: boolean;
  cotizaciones: boolean;
  onToggle: (producto: 'reservas' | 'cotizaciones', activo: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(producto: 'reservas' | 'cotizaciones', activo: boolean) {
    setGuardando(producto);
    setError(null);
    try {
      await onToggle(producto, activo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar.');
    } finally {
      setGuardando(null);
    }
  }

  const productos = [
    {
      id: 'reservas' as const,
      label: 'Reservas',
      Icon: CalendarDays,
      activo: reservas,
      detalle: 'Página pública de citas, agenda, servicios y horario.',
      // El aviso que evita apagarle el negocio a alguien por accidente.
      alApagar: 'Su página de reservas deja de abrir y el panel pierde la agenda.',
    },
    {
      id: 'cotizaciones' as const,
      label: 'Cotizaciones',
      Icon: FileText,
      activo: cotizaciones,
      detalle: 'Armar, enviar y seguir cotizaciones con su marca.',
      alApagar: 'La sección desaparece del panel. Las cotizaciones hechas se conservan.',
    },
  ];

  return (
    <Card>
      <h2 className="text-[15px] font-semibold text-ink">Productos contratados</h2>
      <p className="mt-1 text-sm text-muted">El panel del negocio se arma con lo que esté prendido.</p>

      <div className="mt-5 flex flex-col gap-3">
        {productos.map(({ id, label, Icon, activo, detalle, alApagar }) => (
          <div
            key={id}
            className="flex flex-wrap items-start gap-x-4 gap-y-3 rounded-2xl bg-paper p-4 ring-1 ring-border"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-ink">{label}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                {activo ? detalle : alApagar}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={activo}
              aria-label={`${activo ? 'Desactivar' : 'Activar'} ${label}`}
              disabled={guardando === id}
              onClick={() => cambiar(id, !activo)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                activo ? 'bg-primary' : 'bg-ink/[0.18]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  activo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}
    </Card>
  );
}
