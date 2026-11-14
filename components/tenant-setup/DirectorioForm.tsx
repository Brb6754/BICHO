'use client';

import { useState, useTransition } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { DirectorioInput, DirectorioResult } from '@/lib/directorio/servidor';

// "Aparecer en el directorio Bicho": un switch, ciudad y dirección. El
// mismo control para el dueño (Mi marca) y para el admin; cada uno pasa
// su propia server action, que decide si el que llama puede.
export function DirectorioForm({
  inicial,
  conPin,
  slug,
  disponible,
  onSave,
}: {
  inicial: DirectorioInput;
  conPin: boolean;
  slug: string;
  /** false = falta db/055: se muestra, pero no se puede guardar. */
  disponible: boolean;
  onSave: (input: DirectorioInput) => Promise<DirectorioResult>;
}) {
  const [form, setForm] = useState(inicial);
  const [msg, setMsg] = useState<{ tono: 'ok' | 'aviso' | 'error'; texto: string } | null>(null);
  const [pending, start] = useTransition();
  const [pin, setPin] = useState(conPin);

  return (
    <section aria-labelledby="dir-titulo" className="dash-card border border-border bg-surface p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="dir-titulo" className="text-[17px] font-semibold tracking-tight text-ink">
            Aparecer en el directorio Bicho
          </h2>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-muted">
            Tu negocio sale en <span className="font-medium text-ink">bichomx.com/negocios</span> con tu logo, nombre, giro, colonia y un pin en el mapa, y un botón que lleva a tu página de reservas. Nada más: ni tu teléfono ni datos de tus clientes.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.enDirectorio}
          aria-labelledby="dir-titulo"
          onClick={() => setForm((f) => ({ ...f, enDirectorio: !f.enDirectorio }))}
          className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ${
            form.enDirectorio ? 'bg-primary' : 'bg-ink/15'
          }`}
        >
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.enDirectorio ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <form
        className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            const r = await onSave(form);
            if (!r.ok) setMsg({ tono: 'error', texto: r.error });
            else {
              setPin(!r.aviso && !!form.direccion.trim());
              setMsg(r.aviso ? { tono: 'aviso', texto: r.aviso } : { tono: 'ok', texto: form.enDirectorio ? 'Listo: ya apareces en el directorio.' : 'Guardado. No apareces en el directorio.' });
            }
          });
        }}
      >
        <div>
          <Label htmlFor={`dir-ciudad-${slug}`}>Ciudad</Label>
          <Input
            id={`dir-ciudad-${slug}`}
            className="w-full"
            value={form.ciudad}
            maxLength={80}
            placeholder="Durango"
            autoComplete="address-level2"
            onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor={`dir-direccion-${slug}`}>Dirección del negocio</Label>
          <Input
            id={`dir-direccion-${slug}`}
            className="w-full"
            value={form.direccion}
            maxLength={200}
            placeholder="Calle, número y colonia"
            autoComplete="street-address"
            onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" isLoading={pending} disabled={!disponible}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
          {pin && !msg && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="h-4 w-4" aria-hidden="true" /> Tu pin ya está en el mapa
            </span>
          )}
          <p role="status" className="text-sm">
            {!disponible ? (
              <span className="text-muted">Falta correr la migración db/055_directorio.sql para poder guardar.</span>
            ) : msg ? (
              <span className={msg.tono === 'error' ? 'text-error' : msg.tono === 'aviso' ? 'text-warning' : 'text-success'}>{msg.texto}</span>
            ) : null}
          </p>
        </div>
      </form>
    </section>
  );
}
