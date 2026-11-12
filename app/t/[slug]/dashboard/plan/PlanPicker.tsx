'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PLANES, PLAN_IDS, PRECIO_FUNDADOR_MXN, type PlanId } from '@/lib/billing/planes';
import { changeMyPlan } from './actions';

// Elegir Esencial / Negocio / Pro. Cambiar de plan prende lo incluido y
// apaga lo demás; si ya pagas, el monto nuevo sale en tu siguiente cobro.
export function PlanPicker({ slug, current, founderNegocio }: { slug: string; current: PlanId | null; founderNegocio: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(plan: PlanId) {
    setSaving(plan);
    setError(null);
    const res = await changeMyPlan(slug, plan);
    if (res.ok) router.refresh();
    else setError(res.error);
    setSaving(null);
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {PLAN_IDS.map((id) => {
        const p = PLANES[id];
        const precio = id === 'negocio' && founderNegocio ? PRECIO_FUNDADOR_MXN : p.precio;
        const activo = id === current;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={activo}
            disabled={activo || saving !== null}
            onClick={() => pick(id)}
            className={`rounded-2xl bg-paper p-4 text-left ring-1 disabled:opacity-60 ${activo ? 'ring-primary' : 'ring-border'}`}
          >
            <p className="text-[15px] font-medium text-ink">
              {p.nombre} · ${precio} MXN/mes{activo ? ' · tu plan' : ''}
              {id === 'negocio' && founderNegocio && precio !== p.precio ? ' (precio fundador)' : ''}
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{saving === id ? 'Cambiando…' : p.resumen}</p>
          </button>
        );
      })}
      {error && (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
