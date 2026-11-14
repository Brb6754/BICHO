'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { giroNombre, urlReservar, type NegocioDirectorio } from '@/lib/directorio/directorio';

// Pin propio (divIcon): los PNG por defecto de Leaflet se rompen con el
// bundler, y un pin morado con punto lima es de la casa.
function pin(activo: boolean) {
  return L.divIcon({
    className: '',
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
    html: `<span style="display:block;width:30px;height:40px;transform:scale(${activo ? 1.18 : 1});transform-origin:50% 100%;transition:transform .15s">
      <svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true"><path d="M15 39s13-13.4 13-23A13 13 0 0 0 2 16c0 9.6 13 23 13 23z" fill="${activo ? '#1B1040' : '#5B34E8'}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="16" r="5" fill="#D4F23A"/></svg></span>`,
  });
}

const yo = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: '<span style="display:block;width:18px;height:18px;border-radius:999px;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.2)"></span>',
});

function Encuadre({ puntos }: { puntos: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const encuadrar = () => {
      if (puntos.length === 1) map.setView(puntos[0], 15);
      else if (puntos.length > 1) map.fitBounds(puntos, { padding: [36, 36], maxZoom: 15 });
    };
    encuadrar();
    // El mapa puede nacer oculto (colapsado en móvil): al mostrarse,
    // Leaflet necesita volver a medir su caja o pinta solo una esquina.
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      encuadrar();
    });
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map, puntos]);
  return null;
}

export default function MapaNegocios({
  negocios,
  origen,
  activo,
  onActivo,
}: {
  negocios: NegocioDirectorio[];
  origen: { lat: number; lng: number } | null;
  activo: string | null;
  onActivo: (slug: string | null) => void;
}) {
  const puntos = useMemo(() => {
    const p = negocios.map((n) => [n.lat!, n.lng!] as [number, number]);
    return origen ? [...p, [origen.lat, origen.lng] as [number, number]] : p;
  }, [negocios, origen]);

  return (
    <MapContainer center={puntos[0] ?? [24.0277, -104.6532]} zoom={13} scrollWheelZoom={false} className="h-full w-full" style={{ background: '#F5F3FC' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <Encuadre puntos={puntos} />
      {origen && <Marker position={[origen.lat, origen.lng]} icon={yo} title="Tu ubicación" />}
      {negocios.map((n) => (
        <Marker
          key={n.slug}
          position={[n.lat!, n.lng!]}
          icon={pin(activo === n.slug)}
          title={n.name}
          alt={n.name}
          zIndexOffset={activo === n.slug ? 1000 : 0}
          eventHandlers={{ mouseover: () => onActivo(n.slug), mouseout: () => onActivo(null) }}
        >
          <Popup>
            <strong style={{ display: 'block', fontSize: 14, color: '#140F2E' }}>{n.name}</strong>
            <span style={{ display: 'block', color: '#6A6488', margin: '2px 0 8px' }}>
              {giroNombre(n.vertical)} · {n.colonia ?? n.ciudad}
            </span>
            <a href={urlReservar(n.slug)} style={{ color: '#5B34E8', fontWeight: 600 }}>
              Reservar →
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
