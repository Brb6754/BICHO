'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, FileText, HeartHandshake, Megaphone, ReceiptText, Stamp, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';

// Qué productos tiene contratado el negocio.
//
// Un interruptor por producto, los dos en la misma tarjeta, porque la
// pregunta comercial es una sola: ¿qué le vendiste? El mismo componente
// sirve al panel interno y al del vendedor; quién puede tocarlo lo
// decide la acción, no este archivo.
type Producto = 'reservas' | 'cotizaciones' | 'facturacion' | 'lealtad' | 'caja' | 'regresan' | 'posts';

export function ProductToggles({
  reservas,
  cotizaciones,
  facturacion,
  lealtad = false,
  caja = false,
  regresan = false,
  posts = false,
  onToggle,
}: {
  reservas: boolean;
  cotizaciones: boolean;
  facturacion: boolean;
  lealtad?: boolean;
  caja?: boolean;
  regresan?: boolean;
  posts?: boolean;
  onToggle: (producto: Producto, activo: boolean) => Promise<void>;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(producto: Producto, activo: boolean) {
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
    {
      id: 'facturacion' as const,
      label: 'Facturación',
      Icon: ReceiptText,
      activo: facturacion,
      detalle: 'Emitir CFDI desde el panel. Requiere su RFC y su sello digital.',
      // Apagarlo no invalida nada ante el SAT: lo ya timbrado existe en
      // el SAT, no en bicho. Decir "se cancelan" sería falso y caro.
      alApagar: 'Deja de poder emitir. Las facturas ya timbradas siguen siendo válidas.',
    },
    {
      id: 'lealtad' as const,
      label: 'Lealtad',
      Icon: Stamp,
      activo: lealtad,
      detalle: 'Tarjeta de sellos digital y promociones en su página de reservas.',
      alApagar: 'La sección desaparece del panel y dejan de sumarse sellos. Las tarjetas se conservan.',
    },
    {
      id: 'caja' as const,
      label: 'Caja',
      Icon: Wallet,
      activo: caja,
      detalle: 'Ventas, gastos, cuánto le quedó y el corte de caja del día.',
      alApagar: 'La sección desaparece del panel. Las ventas y gastos anotados se conservan.',
    },
    {
      id: 'regresan' as const,
      label: 'Clientes que regresan',
      Icon: HeartHandshake,
      activo: regresan,
      detalle: 'Recordatorio de cita 24 h antes, clientas que no han vuelto y pedir reseña de Google.',
      alApagar: 'La sección desaparece del panel y dejan de salir los recordatorios.',
    },
    {
      id: 'posts' as const,
      label: 'Posts con IA',
      Icon: Megaphone,
      activo: posts,
      detalle: 'Textos para redes con IA e imagen con su marca. 30 al mes.',
      alApagar: 'La sección desaparece del panel. El historial de posts se conserva.',
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
