'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { toast } from '@/components/tenant-dash/ui/Toast';
import type { PlanId } from '@/lib/billing/planes';
import { changeMyPlan } from './actions';

// La comparación de Esencial / Negocio / Pro, lado a lado (una debajo de
// otra en el teléfono). Cambiar de plan prende lo incluido y apaga lo
// demás, así que nunca pasa con un solo toque: primero se dice qué se
// prende, qué se apaga y cuánto vas a pagar, y luego se confirma.

export type PlanVista = {
  id: PlanId;
  nombre: string;
  precio: number;
  /** Precio de lista cuando `precio` es el de fundador. */
  precioNormal?: number;
  para: string;
  /** Lo que suma sobre el plan anterior. */
  suma: string[];
  /** Nombre del plan anterior ("Todo lo de Esencial, más:"). */
  base?: string;
  /** Todo lo que incluye, para calcular qué se prende y qué se apaga. */
  todo: string[];
};

export function PlanPicker({
  slug,
  planes,
  current,
  pagando,
  puedeCambiar,
}: {
  slug: string;
  planes: PlanVista[];
  current: PlanId | null;
  /** Ya paga: el monto nuevo sale en su siguiente cobro. */
  pagando: boolean;
  puedeCambiar: boolean;
}) {
  const router = useRouter();
  const actual = planes.find((p) => p.id === current) ?? null;

  async function cambiar(p: PlanVista) {
    const res = await changeMyPlan(slug, p.id).catch(() => ({ ok: false as const, error: 'No se pudo cambiar el plan. Revisa tu internet e inténtalo otra vez.' }));
    if (res.ok) {
      toast(`Listo: ahora tienes el plan ${p.nombre}`);
      router.refresh();
    } else toast(res.error, 'error');
  }

  function mensaje(p: PlanVista): string {
    const cobro = pagando ? `Desde tu siguiente cobro pagarás $${p.precio} al mes.` : `Tu plan pasa a costar $${p.precio} al mes.`;
    if (!actual) return `${cobro} Se prende lo que incluye ${p.nombre} y se apaga lo que no. Tus datos se quedan guardados.`;
    const prende = p.todo.filter((x) => !actual.todo.includes(x));
    const apaga = actual.todo.filter((x) => !p.todo.includes(x));
    return [
      cobro,
      prende.length ? `Se prende: ${prende.join(', ')}.` : '',
      apaga.length ? `Se apaga: ${apaga.join(', ')}. Tus datos se quedan guardados por si vuelves.` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {planes.map((p) => {
        const activo = p.id === current;
        return (
          <article
            key={p.id}
            aria-current={activo ? 'true' : undefined}
            className={`relative flex flex-col overflow-hidden rounded-3xl bg-surface p-5 sm:p-6 ${
              activo ? 'shadow-lg ring-[3px] ring-primary' : 'shadow-sm ring-1 ring-border'
            }`}
          >
            {activo && <div className="absolute inset-x-0 top-0 h-1.5 bg-primary" aria-hidden="true" />}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[21px] font-semibold tracking-tight text-ink">{p.nombre}</h3>
              {activo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[14px] font-semibold text-[rgb(var(--color-cta-fg))]">
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Tu plan
                </span>
              )}
            </div>
            <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight tabular-nums text-ink">
              ${p.precio}
              <span className="ml-1 text-sm font-normal tracking-normal text-muted">al mes</span>
            </p>
            {p.precioNormal && (
              <p className="mt-1.5 text-[13px] text-muted">
                Precio de fundador. Normal: <span className="line-through">${p.precioNormal}</span>
              </p>
            )}
            <p className="mt-3 text-[16px] leading-relaxed text-muted">{p.para}</p>
            <div className="mt-4 border-t border-border pt-4">
              {p.base && <p className="mb-2.5 text-[15px] font-semibold text-ink">Todo lo de {p.base}, más:</p>}
              <ul className="flex flex-col gap-2">
                {p.suma.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[15px] leading-snug text-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-auto pt-6">
              {activo ? (
                <p className="flex min-h-[3.25rem] items-center justify-center rounded-2xl bg-primary/10 text-[16px] font-semibold text-ink">
                  Es tu plan actual
                </p>
              ) : puedeCambiar ? (
                <ConfirmForm
                  action={async () => cambiar(p)}
                  confirmTitle={`¿Cambiar al plan ${p.nombre}?`}
                  confirmMessage={mensaje(p)}
                  confirmLabel={`Sí, cambiar a ${p.nombre}`}
                  dismissLabel={actual ? `No, seguir en ${actual.nombre}` : 'No, dejarlo como está'}
                  triggerVariant="outline"
                  triggerClassName="w-full !min-h-[3.25rem] !rounded-2xl !text-[16px] !font-semibold"
                >
                  Cambiar a {p.nombre}
                </ConfirmForm>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
