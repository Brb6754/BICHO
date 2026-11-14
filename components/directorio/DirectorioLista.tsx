'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronsRight, LocateFixed, Map as MapIcon, MapPin } from 'lucide-react';
import { MIN_PINES_MAPA, giroNombre, ordenarPorDistancia, urlReservar, type NegocioDirectorio } from '@/lib/directorio/directorio';

// Leaflet toca window al importarse: solo en el cliente.
const MapaNegocios = dynamic(() => import('./MapaNegocios'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#F5F3FC]" />,
});

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8] focus-visible:ring-offset-2';

function Iniciales({ nombre }: { nombre: string }) {
  const ini = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EFEBFB] font-[family-name:var(--font-display)] text-lg font-extrabold text-[#5B34E8]" aria-hidden>
      {ini}
    </span>
  );
}

export function DirectorioLista({ negocios }: { negocios: NegocioDirectorio[] }) {
  const [origen, setOrigen] = useState<{ lat: number; lng: number } | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [activo, setActivo] = useState<string | null>(null);
  const conPin = negocios.filter((n) => n.lat != null && n.lng != null);
  // Pocos pines = mapa colapsado: un mapa enorme casi vacío espanta.
  const pocos = conPin.length < MIN_PINES_MAPA;
  const [mapaAbierto, setMapaAbierto] = useState(!pocos);

  const lista = useMemo(
    () => (origen ? ordenarPorDistancia(negocios, origen) : negocios.map((n) => ({ ...n, km: null as number | null }))),
    [negocios, origen]
  );

  function cercaDeMi() {
    if (!('geolocation' in navigator)) return;
    setBuscando(true);
    setAviso(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOrigen({ lat: p.coords.latitude, lng: p.coords.longitude });
        setBuscando(false);
      },
      // Si la niega, la lista se queda como estaba. Solo un aviso discreto.
      () => {
        setBuscando(false);
        setAviso('Sin tu ubicación, te mostramos todos en orden alfabético.');
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#6A6488]" aria-live="polite">
          <span className="font-semibold text-[#140F2E]">{negocios.length}</span> {negocios.length === 1 ? 'negocio' : 'negocios'}
          {origen ? ' · del más cercano al más lejano' : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={cercaDeMi}
            disabled={buscando}
            aria-pressed={!!origen}
            className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
              origen ? 'border-[#5B34E8] bg-[#5B34E8] text-white' : 'border-[#140F2E]/15 text-[#140F2E] hover:bg-[#5B34E8]/[0.06]'
            } ${focus}`}
          >
            <LocateFixed className="h-4 w-4" aria-hidden /> {buscando ? 'Buscando…' : 'Cerca de mí'}
          </button>
          {conPin.length > 0 && (
            <button
              type="button"
              onClick={() => setMapaAbierto((v) => !v)}
              aria-expanded={mapaAbierto}
              aria-controls="mapa-negocios"
              className={`${pocos ? 'inline-flex' : 'inline-flex lg:hidden'} h-11 items-center gap-2 rounded-full border border-[#140F2E]/15 px-4 text-sm font-semibold text-[#140F2E] transition-colors hover:bg-[#5B34E8]/[0.06] ${focus}`}
            >
              <MapIcon className="h-4 w-4" aria-hidden /> {mapaAbierto ? 'Ocultar mapa' : 'Ver mapa'}
            </button>
          )}
        </div>
      </div>
      {aviso && <p className="mt-2 text-sm text-[#6A6488]">{aviso}</p>}

      <div className={`mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 ${!pocos && conPin.length ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]' : ''}`}>
        {conPin.length > 0 && (
          <div
            id="mapa-negocios"
            className={`${mapaAbierto ? 'block' : 'hidden'} ${!pocos ? 'lg:order-2 lg:block' : ''}`}
          >
            <div
              role="region"
              aria-label="Mapa de negocios. Los mismos negocios están en la lista."
              className={`overflow-hidden rounded-[28px] ring-1 ring-[#140F2E]/[0.08] ${pocos ? 'h-64' : 'h-72 sm:h-96 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:max-h-[640px]'}`}
            >
              <MapaNegocios negocios={conPin} origen={origen} activo={activo} onActivo={setActivo} />
            </div>
          </div>
        )}

        <ul className={`grid grid-cols-[minmax(0,1fr)] content-start gap-3 ${pocos || !conPin.length ? 'sm:grid-cols-2' : ''}`}>
          {lista.map((n) => (
            <li
              key={n.slug}
              onMouseEnter={() => setActivo(n.slug)}
              onMouseLeave={() => setActivo(null)}
              onFocus={() => setActivo(n.slug)}
              className={`group flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-white p-4 ring-1 transition-shadow ${
                activo === n.slug ? 'ring-[#5B34E8] shadow-[0_18px_40px_-24px_rgba(91,52,232,0.6)]' : 'ring-[#E6E2F4]'
              }`}
            >
              {n.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo del bucket público, dominio variable
                <img src={n.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-2xl bg-white object-contain p-1 ring-1 ring-[#E6E2F4]" loading="lazy" />
              ) : (
                <Iniciales nombre={n.name} />
              )}
              <div className="min-w-0 flex-1 basis-40">
                <h2 className="truncate text-[16px] font-semibold text-[#140F2E]">{n.name}</h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-[#6A6488]">
                  <span className="rounded-full bg-[#F5F3FC] px-2 py-0.5 text-xs font-medium text-[#4423C4]">{giroNombre(n.vertical)}</span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{n.colonia ? `${n.colonia}, ${n.ciudad}` : n.ciudad}</span>
                  </span>
                  {n.km != null && <span className="font-medium text-[#140F2E]">{n.km < 1 ? `${Math.round(n.km * 1000)} m` : `${n.km.toFixed(1)} km`}</span>}
                </p>
              </div>
              <a
                href={urlReservar(n.slug)}
                aria-label={`Reservar en ${n.name}`}
                className={`inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#5B34E8] py-2.5 pl-4 pr-3 min-[420px]:w-auto min-[420px]:py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4423C4] ${focus}`}
              >
                Reservar <ChevronsRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
