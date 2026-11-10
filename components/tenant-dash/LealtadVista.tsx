'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Gift, MessageCircle, Plus, Stamp, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SectionHeading } from '@/components/tenant-dash/PageHeader';
import type { DatosLealtad, Promo, TarjetaFila } from '@/lib/lealtad/datos';
import { promoVigente } from '@/lib/lealtad/tarjeta';
import {
  alternarPromo,
  borrarPromo,
  canjear,
  darTarjeta,
  guardarPromo,
  guardarRegla,
  sumarSello,
} from '@/app/t/[slug]/dashboard/lealtad/actions';

// La pantalla de Lealtad. La misma sirve al panel real y al demo
// (`soloLectura`): en el demo los botones se ven pero no hacen nada.

export type TarjetaConLinks = TarjetaFila & { url: string; wa: string };

type Resp = { ok: true } | { ok: false; error: string };

const PREMIOS = ['Tu siguiente visita gratis', '10% de descuento en tu siguiente visita'];

function estadoPromo(p: Promo, hoy: string): { label: string; tono: string } {
  if (!p.active) return { label: 'Pausada', tono: 'bg-ink/[0.07] text-muted' };
  if (promoVigente(p, hoy)) return { label: 'Vigente', tono: 'bg-success-soft text-success' };
  if (p.starts_on > hoy) return { label: 'Programada', tono: 'bg-info-soft text-info' };
  return { label: 'Vencida', tono: 'bg-ink/[0.07] text-muted' };
}

function Sellos({ sellos, requeridos }: { sellos: number; requeridos: number }) {
  return (
    <span className="flex flex-wrap gap-1" aria-label={`${sellos} de ${requeridos} sellos`}>
      {Array.from({ length: requeridos }, (_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-full ${i < sellos ? 'bg-primary' : 'bg-ink/[0.1]'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function LealtadVista({
  slug,
  datos,
  tarjetas,
  hoy,
  soloLectura = false,
}: {
  slug: string;
  datos: DatosLealtad;
  tarjetas: TarjetaConLinks[];
  hoy: string;
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [requeridos, setRequeridos] = useState(String(datos.regla.requeridos));
  const [premio, setPremio] = useState(datos.regla.premio);
  const [contacto, setContacto] = useState('');
  const [promo, setPromo] = useState({ title: '', details: '', code: '', starts_on: hoy, ends_on: hoy });

  function correr(fn: () => Promise<Resp>, despues?: () => void) {
    if (soloLectura) return;
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      despues?.();
      router.refresh();
    });
  }

  const listas = tarjetas.filter((t) => t.estado.completa).length;

  return (
    <div className="mt-8 flex flex-col gap-12">
      {error && (
        <p role="alert" className="rounded-2xl bg-error-soft px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {/* ── La regla ── */}
      <section>
        <SectionHeading title="Tu tarjeta" />
        <form
          className="mt-4 flex flex-col gap-4 rounded-2xl bg-surface p-5 ring-1 ring-border"
          onSubmit={(e) => {
            e.preventDefault();
            correr(() => guardarRegla(slug, Number(requeridos), premio));
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lealtad-sellos">Sellos para el premio</Label>
              <Input
                id="lealtad-sellos"
                type="number"
                inputMode="numeric"
                min={2}
                max={30}
                value={requeridos}
                onChange={(e) => setRequeridos(e.target.value)}
                className="w-full"
                disabled={soloLectura}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lealtad-premio">Premio</Label>
              <Input
                id="lealtad-premio"
                maxLength={120}
                value={premio}
                onChange={(e) => setPremio(e.target.value)}
                className="w-full"
                disabled={soloLectura}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PREMIOS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={soloLectura}
                onClick={() => setPremio(p)}
                className="rounded-full px-3 py-1.5 text-[13px] text-muted ring-1 ring-border transition-colors hover:bg-ink/[0.04] hover:text-ink"
              >
                {p}
              </button>
            ))}
          </div>
          <p className="text-[13px] leading-relaxed text-muted">
            Cada cita que marques como <span className="font-medium text-ink">atendida</span> suma un sello a esa
            clienta. Con {requeridos || '…'} sellos gana: {premio.toLowerCase() || '…'}.
          </p>
          <div>
            <Button type="submit" isLoading={pendiente} disabled={soloLectura}>
              Guardar regla
            </Button>
          </div>
        </form>
      </section>

      {/* ── Las tarjetas ── */}
      <section>
        <SectionHeading
          title="Tarjetas"
          meta={listas > 0 ? `${listas} ${listas === 1 ? 'lista' : 'listas'} para canjear` : `${tarjetas.length}`}
        />

        {datos.sinTarjeta.length > 0 && (
          <form
            className="mt-4 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (contacto) correr(() => darTarjeta(slug, contacto), () => setContacto(''));
            }}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="lealtad-contacto">Darle tarjeta a un cliente</Label>
              <select
                id="lealtad-contacto"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-base text-ink sm:py-2.5 sm:text-sm"
              >
                <option value="">Elige un cliente…</option>
                {datos.sinTarjeta.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline" disabled={!contacto || pendiente}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Dar tarjeta
            </Button>
          </form>
        )}

        {tarjetas.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-surface p-5 text-sm leading-relaxed text-muted ring-1 ring-border">
            Todavía no hay tarjetas. Se crean solas cuando marcas una cita como atendida, o dásela a un cliente
            arriba.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {tarjetas.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{t.nombre}</p>
                  {t.estado.completa && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-semibold text-success">
                      <Gift className="h-3.5 w-3.5" aria-hidden="true" />
                      {t.estado.premiosPendientes > 1 ? `${t.estado.premiosPendientes} premios` : 'Lista para canjear'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Sellos sellos={t.estado.sellos} requeridos={t.estado.requeridos} />
                  <span className="text-[13px] tabular-nums text-muted">
                    {t.estado.sellos}/{t.estado.requeridos}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="!px-3 !py-1.5"
                    disabled={pendiente}
                    onClick={() => correr(() => sumarSello(slug, t.id))}
                  >
                    <Stamp className="h-4 w-4" aria-hidden="true" /> +1 sello
                  </Button>
                  {t.estado.completa && (
                    <Button
                      type="button"
                      variant="success"
                      className="!px-3 !py-1.5"
                      disabled={pendiente}
                      onClick={() => {
                        if (soloLectura || window.confirm(`¿Canjear el premio de ${t.nombre}?`)) {
                          correr(() => canjear(slug, t.id));
                        }
                      }}
                    >
                      <Gift className="h-4 w-4" aria-hidden="true" /> Canjear
                    </Button>
                  )}
                  <a
                    href={t.wa}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-border transition-colors hover:bg-ink/[0.04]"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Mandar por WhatsApp
                  </a>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Ver tarjeta
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Promociones ── */}
      <section>
        <SectionHeading title="Promociones" meta="Se ven en tu página de reservas mientras estén vigentes" />

        {datos.promos.length > 0 && (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {datos.promos.map((p) => {
              const e = estadoPromo(p, hoy);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-ink">{p.title}</p>
                    <p className="text-[13px] text-muted">
                      {p.starts_on} → {p.ends_on}
                      {p.code && (
                        <>
                          {' · '}
                          <span className="font-mono text-ink">{p.code}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${e.tono}`}>{e.label}</span>
                  <Button
                    type="button"
                    variant="outline"
                    className="!px-3 !py-1.5"
                    disabled={pendiente}
                    onClick={() => correr(() => alternarPromo(slug, p.id, !p.active))}
                  >
                    {p.active ? 'Pausar' : 'Reanudar'}
                  </Button>
                  <button
                    type="button"
                    aria-label={`Borrar ${p.title}`}
                    disabled={pendiente}
                    onClick={() => {
                      if (soloLectura || window.confirm(`¿Borrar la promoción "${p.title}"?`)) {
                        correr(() => borrarPromo(slug, p.id));
                      }
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-error-soft hover:text-error"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="mt-4 grid gap-4 rounded-2xl bg-surface p-5 ring-1 ring-border sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            correr(
              () => guardarPromo(slug, promo),
              () => setPromo({ title: '', details: '', code: '', starts_on: hoy, ends_on: hoy })
            );
          }}
        >
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="promo-titulo">Nueva promoción</Label>
            <Input
              id="promo-titulo"
              placeholder="Martes 20% en pedicure"
              maxLength={80}
              required
              value={promo.title}
              onChange={(e) => setPromo({ ...promo, title: e.target.value })}
              className="w-full"
              disabled={soloLectura}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="promo-detalle">Detalle (opcional)</Label>
            <Input
              id="promo-detalle"
              placeholder="Menciónala al llegar"
              maxLength={240}
              value={promo.details}
              onChange={(e) => setPromo({ ...promo, details: e.target.value })}
              className="w-full"
              disabled={soloLectura}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promo-desde">Desde</Label>
            <Input
              id="promo-desde"
              type="date"
              required
              value={promo.starts_on}
              onChange={(e) => setPromo({ ...promo, starts_on: e.target.value })}
              className="w-full"
              disabled={soloLectura}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promo-hasta">Hasta</Label>
            <Input
              id="promo-hasta"
              type="date"
              required
              value={promo.ends_on}
              onChange={(e) => setPromo({ ...promo, ends_on: e.target.value })}
              className="w-full"
              disabled={soloLectura}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promo-codigo">Código (opcional)</Label>
            <Input
              id="promo-codigo"
              placeholder="MARTES20"
              maxLength={30}
              value={promo.code}
              onChange={(e) => setPromo({ ...promo, code: e.target.value.toUpperCase() })}
              className="w-full font-mono"
              disabled={soloLectura}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" isLoading={pendiente} disabled={soloLectura}>
              Agregar promoción
            </Button>
          </div>
        </form>
      </section>

      {/* ── Historial ── */}
      <section>
        <SectionHeading title="Canjes" meta={datos.canjes.length ? 'Los últimos 20' : undefined} />
        {datos.canjes.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Todavía nadie ha canjeado un premio.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
            {datos.canjes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3">
                <span className="text-[15px] text-ink">{c.nombre}</span>
                <span className="text-[13px] text-muted">
                  {c.premio} · {new Date(c.cuando).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
