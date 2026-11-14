'use client';

import { useState, useTransition } from 'react';
import { BellRing, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { DIAS, FRANJAS } from '@/lib/boost/reglas';
import { apuntarseListaVip } from '@/app/t/[slug]/reservar/boost/actions';

// "Avísame si se libera algo" (Boost → lista VIP), debajo del flujo de
// reserva. La clienta elige servicio, días y franjas, deja su teléfono y
// marca el permiso EXPLÍCITO para recibir WhatsApp (Meta + LFPDPPP); sin
// esa casilla el servidor no guarda nada. Promociones: casilla aparte.

const chip =
  'cursor-pointer select-none rounded-full border border-border px-3.5 py-1.5 text-sm text-ink transition-colors has-[:checked]:border-transparent has-[:checked]:bg-ink has-[:checked]:text-paper has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink/40';

export function ListaVip({
  slug,
  businessName,
  services,
  privacidadUrl,
}: {
  slug: string;
  businessName: string;
  services: { id: string; name: string }[];
  privacidadUrl: string;
}) {
  const [abierta, setAbierta] = useState(false);
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  if (listo) {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-border bg-surface p-5" role="status">
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <p className="text-[15px] text-ink">
          Listo. Si se libera un horario que te acomode, te escribimos por WhatsApp. Para dejar de recibir avisos, responde <strong>BAJA</strong>.
        </p>
      </div>
    );
  }

  if (!abierta) {
    return (
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="flex w-full items-center gap-3 rounded-3xl border border-border bg-surface p-5 text-left transition hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
      >
        <BellRing className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
        <span>
          <span className="block text-[15px] font-semibold text-ink">¿No encontraste horario? Avísame si se libera algo</span>
          <span className="block text-sm text-muted">Cuando alguien cancele, te escribimos por WhatsApp.</span>
        </span>
      </button>
    );
  }

  function enviar(form: HTMLFormElement) {
    const fd = new FormData(form);
    start(async () => {
      setError(null);
      const r = await apuntarseListaVip(slug, {
        nombre: fd.get('nombre'),
        telefono: fd.get('telefono'),
        service_type_id: fd.get('servicio') || null,
        dias: fd.getAll('dias').map(Number),
        franjas: fd.getAll('franjas'),
        consentimiento_avisos: fd.get('avisos') === 'on',
        consentimiento_promos: fd.get('promos') === 'on',
      });
      if (r.ok) setListo(true);
      else setError(r.error);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar(e.currentTarget);
      }}
      className="rounded-3xl border border-border bg-surface p-5 sm:p-6"
    >
      <h2 className="text-lg font-semibold text-ink">Avísame si se libera algo</h2>
      <p className="mt-1 text-sm text-muted">Te escribimos por WhatsApp cuando se libere un horario que te acomode. La primera que lo aparta se lo queda.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vip-nombre">Tu nombre</Label>
          <Input id="vip-nombre" name="nombre" required maxLength={200} autoComplete="name" className="w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vip-tel">WhatsApp</Label>
          <Input id="vip-tel" name="telefono" required type="tel" inputMode="tel" autoComplete="tel" placeholder="618 123 4567" className="w-full tabular-nums" />
        </div>
        {services.length > 1 && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="vip-servicio">Servicio</Label>
            <Select id="vip-servicio" name="servicio" defaultValue="" className="w-full">
              <option value="">El que sea</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-ink">¿Qué días puedes? <span className="font-normal text-muted">(ninguno = cualquiera)</span></legend>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <label key={d} className={chip}>
                <input type="checkbox" name="dias" value={d} className="sr-only" />
                {DIAS[d]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium text-ink">¿A qué hora? <span className="font-normal text-muted">(ninguna = cualquiera)</span></legend>
          <div className="flex flex-wrap gap-2">
            {FRANJAS.map((f) => (
              <label key={f.id} className={chip}>
                <input type="checkbox" name="franjas" value={f.id} className="sr-only" />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="avisos" required className="mt-0.5 h-4 w-4 shrink-0 accent-current" />
          <span className="text-ink">
            Acepto que {businessName} me escriba por WhatsApp para avisarme de horarios libres. Puedo darme de baja cuando quiera respondiendo BAJA.{' '}
            <a href={privacidadUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              Aviso de privacidad
            </a>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="promos" className="mt-0.5 h-4 w-4 shrink-0 accent-current" />
          <span className="text-muted">También quiero recibir promociones de horarios con descuento (opcional, máximo una por semana).</span>
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-error-soft px-4 py-3 text-sm text-ink" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-[15px] font-semibold text-paper transition active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
      >
        {pendiente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Avísame
      </button>
    </form>
  );
}
