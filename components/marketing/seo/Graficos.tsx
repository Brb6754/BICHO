import Image from 'next/image';
import {
  Bell,
  Bot,
  CalendarDays,
  Check,
  Copy,
  Eye,
  FileText,
  Flower2,
  Gift,
  Hand,
  Link2,
  MapPin,
  MessageCircle,
  Paintbrush,
  PawPrint,
  Scissors,
  Send,
  Stamp,
  Stethoscope,
  X,
} from 'lucide-react';
import { BichoBug, LimeArrow, Sparkle } from '../Flourishes';

// Gráfica de las páginas de búsqueda y de la landing (pedido de Bruno,
// 2026-11-14: "pierden la esencia, no hay ni 1 elemento gráfico").
//
// Regla: la gráfica es el PRODUCTO, en miniatura. Cada pieza es una
// pantalla de bicho reducida a lo que se lee de un vistazo (una cita
// confirmada, el stock bajando, la tarjeta de sellos), en HTML/CSS: no
// pesa como imagen, se ve nítida en cualquier pantalla y no hay foto de
// stock fingiendo un negocio. Los datos de las miniaturas son de ejemplo
// y lo dicen (chip "Ejemplo") cuando llevan cantidades.
//
// Server components, cero JS.

const INK = '#140F2E';
const VIOLETA = '#5B34E8';
const LIMA = '#D4F23A';

/* ───────────────────────── marcos ───────────────────────── */

export function Telefono({ src, alt, prioridad = false, className = '' }: { src: string; alt: string; prioridad?: boolean; className?: string }) {
  return (
    <div className={`relative w-full max-w-[250px] rounded-[2.4rem] bg-[#0B0820] p-[7px] shadow-[0_40px_80px_-30px_rgba(11,6,40,0.75)] ring-1 ring-white/10 ${className}`}>
      <span aria-hidden="true" className="absolute left-1/2 top-[13px] z-10 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-[#0B0820]" />
      <Image src={src} alt={alt} width={390} height={844} priority={prioridad} sizes="250px" className="h-auto w-full rounded-[2rem]" />
    </div>
  );
}

export function Escritorio({ src, alt, prioridad = false, className = '' }: { src: string; alt: string; prioridad?: boolean; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-[#1E1A2E] shadow-[0_40px_80px_-30px_rgba(11,6,40,0.7)] ring-1 ring-black/10 ${className}`}>
      <div className="flex items-center gap-1.5 px-3.5 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FFC94D]/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#5BD48A]/80" />
        <span className="ml-3 h-4 flex-1 rounded-full bg-white/[0.07]" />
      </div>
      <Image src={src} alt={alt} width={1280} height={800} priority={prioridad} sizes="(min-width: 1024px) 640px, 100vw" className="h-auto w-full" />
    </div>
  );
}

/** Tarjeta blanca base de toda miniatura de UI. */
function Mini({ children, className = '', titulo, icono: Icono, ejemplo = false }: { children: React.ReactNode; className?: string; titulo?: string; icono?: React.ComponentType<{ className?: string }>; ejemplo?: boolean }) {
  return (
    <div className={`w-full rounded-2xl bg-white p-4 text-[13px] text-[#140F2E] shadow-[0_24px_50px_-24px_rgba(11,6,40,0.55)] ring-1 ring-[#140F2E]/[0.06] ${className}`}>
      {titulo && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-bold">
            {Icono && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F1EDFD]">
                <Icono className="h-3.5 w-3.5 text-[#5B34E8]" />
              </span>
            )}
            {titulo}
          </span>
          {ejemplo && <span className="rounded-full bg-[#F5F3FC] px-2 py-0.5 text-[10px] font-medium text-[#6A6488]">Ejemplo</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ───────────────────────── miniaturas de producto ───────────────────────── */

export function CitaConfirmada({ className = '', servicio = 'Manicure en gel', cuando = 'Mañana · 10:30 a.m.', acento = VIOLETA }: { className?: string; servicio?: string; cuando?: string; acento?: string }) {
  return (
    <Mini className={className}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: acento }}>
          <Check className="h-4 w-4 text-white" strokeWidth={3} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="font-bold">Cita confirmada</p>
          <p className="truncate text-[12px] text-[#524C73]">{servicio}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[#F5F3FC] px-3 py-2 text-[12px]">
        <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-[#3A3360]">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {cuando}
        </span>
        <span className="font-semibold text-[#5B34E8]">Cambiar</span>
      </div>
    </Mini>
  );
}

export function MensajeRecordatorio({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full overflow-hidden rounded-2xl bg-[#ECE5DD] text-[13px] shadow-[0_24px_50px_-24px_rgba(11,6,40,0.55)] ${className}`}>
      <div className="flex items-center gap-2.5 bg-[#1F6F54] px-3.5 py-2.5 text-white">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">LL</span>
        <span className="font-semibold leading-tight">Lima &amp; Laca</span>
        <MessageCircle className="ml-auto h-4 w-4 opacity-80" aria-hidden="true" />
      </div>
      <div className="space-y-2 p-3">
        <div className="max-w-[92%] rounded-xl rounded-tl-sm bg-white px-3 py-2 leading-snug text-[#1B1B1B] shadow-sm">
          Hola Ana, te esperamos <strong>mañana a las 10:30</strong> para tu manicure en gel.
          <span className="mt-1.5 flex items-center gap-1 font-semibold text-[#1F6F54]">
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Cambiar o cancelar mi cita
          </span>
          <span className="mt-1 block text-right text-[10px] text-[#8A8A8A]">recordatorio automático</span>
        </div>
        <div className="ml-auto w-fit rounded-xl rounded-tr-sm bg-[#D9FDD3] px-3 py-2 text-[#1B1B1B] shadow-sm">¡Ahí estaré!</div>
      </div>
    </div>
  );
}

const TOMADOS = new Set([3, 6, 9, 14, 17, 22, 25]);
export function MiniCalendario({ className = '', elegido = 11 }: { className?: string; elegido?: number }) {
  return (
    <div className={`w-[8.5rem] rounded-2xl bg-[#1B1040] p-3 shadow-[0_24px_50px_-22px_rgba(11,6,40,0.7)] ${className}`} aria-hidden="true">
      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#D4F23A]">Tu agenda</p>
      <div className="mt-2 grid grid-cols-7 gap-[3px]">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-center text-[7px] font-bold leading-none text-white/40">
            {d}
          </span>
        ))}
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} className={`aspect-square rounded-[3px] ${i === elegido ? 'bg-white' : TOMADOS.has(i) ? 'bg-[#D4F23A]' : 'bg-white/[0.12]'}`} />
        ))}
      </div>
    </div>
  );
}

function HorariosLibres() {
  const horas = ['10:00', '10:45', '11:30', '13:00', '16:15', '17:00'];
  return (
    <Mini titulo="Elige tu hora" icono={CalendarDays}>
      <div className="mb-3 flex gap-1.5">
        {['Jue 12', 'Vie 13', 'Sáb 14'].map((d, i) => (
          <span key={d} className={`flex-1 rounded-lg py-1.5 text-center text-[11px] font-semibold ${i === 1 ? 'bg-[#140F2E] text-white' : 'bg-[#F5F3FC] text-[#4A4370]'}`}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {horas.map((h, i) => (
          <span key={h} className={`rounded-full py-1.5 text-center text-[12px] font-semibold tabular-nums ${i === 3 ? 'bg-[#5B34E8] text-white' : 'ring-1 ring-[#140F2E]/12'}`}>
            {h}
          </span>
        ))}
      </div>
      <span className="mt-3 block rounded-full bg-[#D4F23A] py-2 text-center text-[12px] font-bold">Apartar 13:00</span>
    </Mini>
  );
}

function StockBajando() {
  const prods = [
    { n: 'Gel base', q: 14, max: 20 },
    { n: 'Acetona 1 L', q: 9, max: 20 },
    { n: 'Esmalte nude #12', q: 2, max: 20, bajo: true },
  ];
  return (
    <Mini titulo="Inventario" icono={Bell} ejemplo>
      <ul className="space-y-3">
        {prods.map((p) => (
          <li key={p.n}>
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium">{p.n}</span>
              <span className={`tabular-nums font-semibold ${p.bajo ? 'text-[#C2410C]' : 'text-[#4A4370]'}`}>{p.q} pzas</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-[#F1EDFD]">
              <div className={`mk-stock h-2 rounded-full ${p.bajo ? 'bg-[#F97316]' : 'bg-[#5B34E8]'}`} style={{ width: `${(p.q / p.max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#FFF1E6] px-3 py-2 text-[12px] font-semibold text-[#9A3412]">
        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
        Se está acabando el nude #12
      </p>
    </Mini>
  );
}

function RepartoComisiones() {
  const gente = [
    { n: 'Dafne', p: 42, c: VIOLETA },
    { n: 'Itzel', p: 33, c: '#9B7BFF' },
    { n: 'Mariana', p: 25, c: '#C9BBFF' },
  ];
  return (
    <Mini titulo="Comisiones de la semana" icono={Hand} ejemplo>
      <div className="flex h-3 overflow-hidden rounded-full">
        {gente.map((g) => (
          <span key={g.n} style={{ width: `${g.p}%`, background: g.c }} />
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {gente.map((g) => (
          <li key={g.n} className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 font-medium">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.c }} />
              {g.n}
            </span>
            <span className="tabular-nums text-[#4A4370]">{g.p}% de lo vendido</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-[#F5F3FC] px-3 py-2 text-[12px] font-medium text-[#3A3360]">Le toca a cada quien, sin sumar la libreta.</p>
    </Mini>
  );
}

function TarjetaSellos() {
  return (
    <div className="w-full rounded-2xl bg-[#5B34E8] p-4 text-white shadow-[0_24px_50px_-24px_rgba(11,6,40,0.6)]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">Tarjeta de Ana</span>
        <Stamp className="h-4 w-4 text-[#D4F23A]" aria-hidden="true" />
      </div>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`flex aspect-square items-center justify-center rounded-full ${i < 7 ? 'bg-[#D4F23A]' : i === 9 ? 'border-2 border-dashed border-[#D4F23A]' : 'bg-white/15'}`}
          >
            {i < 7 && <Check className="h-3.5 w-3.5 text-[#140F2E]" strokeWidth={3} />}
            {i === 9 && <Gift className="h-3.5 w-3.5 text-[#D4F23A]" />}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-[#E3DEFA]">7 de 10 · la décima va por la casa</p>
    </div>
  );
}

function CorteCaja() {
  const filas: [string, string, string][] = [
    ['Vendido', '$4,860', 'text-[#140F2E]'],
    ['Gastos', '−$320', 'text-[#C2410C]'],
    ['Debe haber en el cajón', '$2,140', 'text-[#140F2E]'],
  ];
  return (
    <Mini titulo="Corte del día" icono={FileText} ejemplo>
      <dl className="divide-y divide-[#140F2E]/[0.07]">
        {filas.map(([a, b, c]) => (
          <div key={a} className="flex justify-between py-2 text-[12px]">
            <dt className="text-[#6A6488]">{a}</dt>
            <dd className={`font-semibold tabular-nums ${c}`}>{b}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex gap-1.5 text-[11px] font-semibold">
        <span className="flex-1 rounded-lg bg-[#F5F3FC] py-1.5 text-center">Efectivo</span>
        <span className="flex-1 rounded-lg bg-[#F5F3FC] py-1.5 text-center">Tarjeta</span>
        <span className="flex-1 rounded-lg bg-[#F5F3FC] py-1.5 text-center">Transf.</span>
      </div>
    </Mini>
  );
}

function QuienNoVuelve() {
  const gente = [
    { i: 'PA', n: 'Paulina', t: 'hace 7 semanas' },
    { i: 'DI', n: 'Daniela', t: 'hace 5 semanas' },
    { i: 'LM', n: 'Lucía', t: 'hace 4 semanas' },
  ];
  return (
    <Mini titulo="No han vuelto" icono={MessageCircle}>
      <ul className="space-y-2.5">
        {gente.map((g, idx) => (
          <li key={g.n} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1EDFD] text-[11px] font-bold text-[#5B34E8]">{g.i}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block font-semibold">{g.n}</span>
              <span className="text-[11px] text-[#6A6488]">{g.t}</span>
            </span>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${idx === 0 ? 'bg-[#1F8A4C] text-white' : 'bg-[#F5F3FC] text-[#3A3360]'}`}>
              <Send className="h-3 w-3" aria-hidden="true" />
              Escribir
            </span>
          </li>
        ))}
      </ul>
    </Mini>
  );
}

function CotizacionMini() {
  return (
    <Mini titulo="Cotización" icono={FileText} ejemplo>
      <div className="space-y-2">
        {[['Paquete novia', '$3,800'], ['Prueba de peinado', '$600'], ['Traslado', '$400']].map(([a, b]) => (
          <div key={a} className="flex justify-between text-[12px]">
            <span className="text-[#4A4370]">{a}</span>
            <span className="tabular-nums font-medium">{b}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#140F2E]/10 pt-2.5">
        <span className="font-bold">Total</span>
        <span className="font-bold tabular-nums">$4,800</span>
      </div>
      <div className="mt-3 flex gap-2 text-[12px] font-semibold">
        <span className="flex-1 rounded-full bg-[#5B34E8] py-1.5 text-center text-white">Aceptar</span>
        <span className="flex-1 rounded-full py-1.5 text-center ring-1 ring-[#140F2E]/15">Ver PDF</span>
      </div>
    </Mini>
  );
}

function ReunionSlots() {
  return (
    <Mini titulo="Agenda una visita" icono={MapPin}>
      <div className="mb-3 flex gap-1.5 text-[11px] font-semibold">
        <span className="flex-1 rounded-lg bg-[#140F2E] py-1.5 text-center text-white">En sitio</span>
        <span className="flex-1 rounded-lg bg-[#F5F3FC] py-1.5 text-center text-[#4A4370]">Videollamada</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {['Lun 9:00', 'Lun 12:00', 'Mar 10:30', 'Mié 17:00'].map((h, i) => (
          <span key={h} className={`rounded-full py-1.5 text-center text-[12px] font-semibold ${i === 2 ? 'bg-[#5B34E8] text-white' : 'ring-1 ring-[#140F2E]/12'}`}>
            {h}
          </span>
        ))}
      </div>
    </Mini>
  );
}

function FacturaMini() {
  return (
    <Mini titulo="Factura" icono={FileText}>
      <div className="rounded-xl border border-dashed border-[#140F2E]/15 p-3 text-[12px]">
        <div className="flex justify-between">
          <span className="text-[#6A6488]">Tipo</span>
          <span className="font-semibold">CFDI 4.0 · Ingreso</span>
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="text-[#6A6488]">RFC receptor</span>
          <span className="font-mono tracking-tight">XAXX010101000</span>
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="text-[#6A6488]">Uso</span>
          <span className="font-semibold">G03</span>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#EAF7EF] px-3 py-2 text-[12px] font-semibold text-[#166534]">
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        Timbrada · PDF y XML listos
      </p>
    </Mini>
  );
}

function CopilotoChat() {
  return (
    <Mini titulo="Copiloto" icono={Bot}>
      <div className="space-y-2">
        <p className="ml-auto w-fit max-w-[88%] rounded-xl rounded-tr-sm bg-[#5B34E8] px-3 py-2 text-white">¿Quién no ha vuelto este mes?</p>
        <p className="max-w-[92%] rounded-xl rounded-tl-sm bg-[#F5F3FC] px-3 py-2 leading-snug text-[#2E2755]">
          Tres clientas pasaron de sus semanas: Paulina, Daniela y Lucía. ¿Te dejo el mensaje listo?
        </p>
      </div>
    </Mini>
  );
}

function ChecklistResico() {
  const pasos = ['RFC', 'e.firma', 'Alta en RESICO', 'Sello digital', 'Facturar', 'Pago mensual'];
  return (
    <Mini titulo="Guía RESICO" icono={Check}>
      <ul className="space-y-1.5">
        {pasos.map((p, i) => (
          <li key={p} className="flex items-center gap-2.5 text-[12px]">
            <span className={`flex h-5 w-5 items-center justify-center rounded-md ${i < 3 ? 'bg-[#5B34E8]' : 'ring-1 ring-[#140F2E]/20'}`}>
              {i < 3 && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>
            <span className={i < 3 ? 'text-[#6A6488] line-through' : 'font-medium'}>{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 h-1.5 rounded-full bg-[#F1EDFD]">
        <div className="h-1.5 w-1/2 rounded-full bg-[#D4F23A]" />
      </div>
    </Mini>
  );
}

function DirectorioMapa() {
  return (
    <div className="w-full overflow-hidden rounded-2xl bg-white shadow-[0_24px_50px_-24px_rgba(11,6,40,0.55)] ring-1 ring-[#140F2E]/[0.06]">
      <div
        className="relative h-28"
        aria-hidden="true"
        style={{
          backgroundColor: '#EEF2E6',
          backgroundImage: 'linear-gradient(115deg, transparent 46%, #fff 46%, #fff 52%, transparent 52%), linear-gradient(25deg, transparent 60%, #fff 60%, #fff 64%, transparent 64%)',
        }}
      >
        {[
          ['22%', '30%'],
          ['58%', '55%'],
          ['76%', '22%'],
        ].map(([l, t], i) => (
          <MapPin key={i} className={`absolute h-6 w-6 -translate-x-1/2 -translate-y-full ${i === 1 ? 'text-[#5B34E8]' : 'text-[#140F2E]/40'}`} style={{ left: l, top: t }} fill={i === 1 ? LIMA : 'white'} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 p-3.5 text-[13px]">
        <span className="leading-tight">
          <span className="block font-bold">Tu negocio</span>
          <span className="text-[11px] text-[#6A6488]">Abierto · reserva en línea</span>
        </span>
        <span className="rounded-full bg-[#D4F23A] px-3 py-1.5 text-[11px] font-bold">Reservar</span>
      </div>
    </div>
  );
}

function ReferidosMini() {
  return (
    <Mini titulo="Recomienda bicho" icono={Gift}>
      <div className="flex items-center gap-2 rounded-xl bg-[#F5F3FC] px-3 py-2 text-[12px]">
        <span className="min-w-0 flex-1 truncate font-mono text-[#3A3360]">bichomx.com/r/tusalon</span>
        <Copy className="h-3.5 w-3.5 shrink-0 text-[#5B34E8]" aria-hidden="true" />
      </div>
      <div className="relative mt-3 flex items-center justify-between rounded-xl bg-[#D4F23A] px-4 py-3">
        <span className="font-[family-name:var(--font-display)] text-lg font-extrabold uppercase leading-none">1 mes gratis</span>
        <Gift className="h-5 w-5" aria-hidden="true" />
        <span aria-hidden="true" className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white" />
        <span aria-hidden="true" className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white" />
      </div>
    </Mini>
  );
}

function AgendaHoy() {
  const citas = [
    ['10:00', 'Manicure clásico', 'Paulina'],
    ['12:30', 'Manicure en gel', 'Carlos'],
    ['16:00', 'Pedicure spa', 'Daniela'],
  ];
  return (
    <Mini titulo="Hoy" icono={CalendarDays}>
      <ul className="space-y-1.5">
        {citas.map(([h, s, n]) => (
          <li key={h} className="flex items-center gap-3 rounded-xl bg-[#F5F3FC] px-3 py-2">
            <span className="w-10 font-bold tabular-nums">{h}</span>
            <span className="min-w-0 flex-1 truncate leading-tight">
              <span className="block truncate font-medium">{s}</span>
              <span className="text-[11px] text-[#6A6488]">{n}</span>
            </span>
          </li>
        ))}
      </ul>
    </Mini>
  );
}

/** Una miniatura por función (/funciones/<slug>). */
export function IlustracionFuncion({ slug, className = '' }: { slug: string; className?: string }) {
  const pieza = (() => {
    switch (slug) {
      case 'reservas-en-linea':
        return <HorariosLibres />;
      case 'recordatorios':
        return <MensajeRecordatorio />;
      case 'clientes-que-regresan':
        return <QuienNoVuelve />;
      case 'lealtad':
        return <TarjetaSellos />;
      case 'caja':
        return <CorteCaja />;
      case 'inventario':
        return <StockBajando />;
      case 'comisiones':
        return <RepartoComisiones />;
      case 'cotizaciones':
        return <CotizacionMini />;
      case 'reuniones':
        return <ReunionSlots />;
      case 'facturacion':
        return <FacturaMini />;
      case 'copiloto':
        return <CopilotoChat />;
      case 'guia-resico':
        return <ChecklistResico />;
      case 'directorio':
        return <DirectorioMapa />;
      case 'referidos':
        return <ReferidosMini />;
      default:
        return <AgendaHoy />;
    }
  })();
  return <div className={className}>{pieza}</div>;
}

/** Miniatura dentro de una tarjeta-enlace: misma pieza, sobre el lila de la tarjeta, sin robar foco. */
export function VistaTarjeta({ slug }: { slug: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none relative -mx-2 -mt-2 mb-5 flex h-[176px] items-start justify-center overflow-hidden rounded-[18px] bg-[#EAE5FB] px-5 pt-5 [mask-image:linear-gradient(to_bottom,black_72%,transparent)]">
      <div className="w-[280px] shrink-0 origin-top sm:scale-[0.9] lg:scale-[0.7] xl:scale-[0.84]">
        <IlustracionFuncion slug={slug} className="transition-transform duration-500 group-hover:-translate-y-1.5" />
      </div>
    </div>
  );
}

/* ───────────────────────── escenas ───────────────────────── */

/** Hero de la landing: el teléfono con la reserva real y lo que pasa alrededor. */
export function EscenaProducto() {
  return (
    <div className="relative mx-auto w-full max-w-[440px] pb-6 pt-4">
      <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7A55FF] blur-3xl" />
      <Telefono src="/capturas/reserva-movil.png" alt="Página de reservas real del demo Lima & Laca, vista en un celular" prioridad className="relative mx-auto" />
      <CitaConfirmada className="mk-rise absolute -left-1 bottom-16 w-[14.5rem] -rotate-[5deg] sm:-left-6 sm:w-[16rem]" />
      <MiniCalendario className="mk-rise absolute -right-1 top-10 rotate-[8deg] [animation-delay:160ms] sm:right-0" />
      <LimeArrow className="absolute -left-2 top-6 hidden h-16 w-16 text-[#D4F23A] sm:block" flip />
      <BichoBug className="absolute -right-2 bottom-4 h-12 w-12 rotate-[16deg] sm:h-14 sm:w-14" />
    </div>
  );
}

/** Teléfono + escritorio: lo que ve la clienta y lo que ve el dueño. */
export function EscenaDosLados() {
  return (
    <div className="relative pb-10 sm:pb-0 sm:pr-16">
      <Escritorio src="/capturas/agenda.png" alt="Agenda del panel del dueño en el demo Lima & Laca" />
      <div className="absolute -bottom-2 right-2 w-[34%] max-w-[170px] sm:-bottom-10 sm:right-0">
        <Telefono src="/capturas/reserva-movil.png" alt="La misma reserva, del lado de la clienta" className="!rounded-[1.6rem] !p-[5px] [&_img]:!rounded-[1.3rem] [&>span]:hidden" />
      </div>
      <Sparkle className="absolute -left-3 -top-4 h-8 w-8 text-[#D4F23A]" />
    </div>
  );
}

/** Captura de la función + su miniatura viva encima. */
export function EscenaFuncion({ slug, captura }: { slug: string; captura: { src: string; alt: string; movil?: boolean } | null }) {
  if (!captura) {
    return (
      <div className="relative mx-auto w-full max-w-[380px] py-4">
        <span aria-hidden="true" className="absolute inset-6 rounded-full bg-[#7A55FF] blur-3xl" />
        <IlustracionFuncion slug={slug} className="relative rotate-[-2deg] [&>*]:text-[14px]" />
        <BichoBug className="absolute -right-3 -top-2 h-12 w-12 rotate-[14deg]" />
        <Sparkle className="absolute -bottom-1 -left-3 h-7 w-7 text-[#D4F23A]" />
      </div>
    );
  }
  return (
    <div className={`relative mx-auto w-full ${captura.movil ? 'max-w-[420px]' : ''} pb-8`}>
      {captura.movil ? (
        <Telefono src={captura.src} alt={captura.alt} prioridad className="mx-auto" />
      ) : (
        <Escritorio src={captura.src} alt={captura.alt} prioridad />
      )}
      <IlustracionFuncion
        slug={slug}
        className={`mk-rise relative z-10 mx-auto -mt-16 w-[86%] max-w-[18rem] -rotate-[3deg] sm:absolute sm:-bottom-6 sm:-left-6 sm:mt-0 sm:w-[17rem] ${captura.movil ? 'sm:left-0' : ''}`}
      />
      <BichoBug className="absolute -right-2 -top-5 h-11 w-11 rotate-[14deg]" />
    </div>
  );
}

/* ───────────────────────── giros ───────────────────────── */

type EstiloGiro = { color: string; tinta: string; icono: React.ComponentType<{ className?: string }>; servicios: string[]; logo?: string };

// Un color por giro, elegido por el oficio (rosa chicle para uñas, latón
// para barbería, eucalipto para spa...). Vive en el acento de la escena y
// de las tarjetas, nunca en el fondo violeta de bicho.
export const ESTILO_GIRO: Record<string, EstiloGiro> = {
  unas: { color: '#FF6FA5', tinta: '#5C0F33', icono: Paintbrush, servicios: ['Acrílicas · juego nuevo', 'Relleno', 'Gel en manos'], logo: '/demo/logos/lima-laca.webp' },
  pestanas: { color: '#F4B88A', tinta: '#5A2E0E', icono: Eye, servicios: ['Clásicas', 'Volumen', 'Lifting'], logo: '/demo/logos/casa-luma.webp' },
  barberias: { color: '#E5484D', tinta: '#5A0C10', icono: Scissors, servicios: ['Corte', 'Corte y barba', 'Barba'], logo: '/demo/logos/don-ramon.webp' },
  spa: { color: '#6CCFB0', tinta: '#0E4434', icono: Flower2, servicios: ['Masaje relajante', 'Facial', 'Pies spa'], logo: '/demo/logos/agua-serena.png' },
  esteticas: { color: '#FF9A76', tinta: '#5C2210', icono: Scissors, servicios: ['Corte', 'Tinte', 'Mechas'], logo: '/demo/logos/casa-luma.webp' },
  'estetica-canina': { color: '#FFC24D', tinta: '#5A3A00', icono: PawPrint, servicios: ['Baño perro chico', 'Baño y corte perro grande', 'Corte de uñas'] },
  consultorios: { color: '#7CC4FF', tinta: '#0B3A63', icono: Stethoscope, servicios: ['Consulta', 'Limpieza dental', 'Revisión'], logo: '/demo/logos/dental-nova.png' },
};

export function estiloGiro(slug: string): EstiloGiro {
  return ESTILO_GIRO[slug] ?? { color: LIMA, tinta: INK, icono: CalendarDays, servicios: ['Servicio', 'Servicio', 'Servicio'] };
}

/** Escena del giro: la foto del demo real, su menú de servicios y la cita confirmada, en el color del oficio. */
export function EscenaGiro({ slug, demo }: { slug: string; demo: { nombre: string; giro: string; foto: string | null } }) {
  const e = estiloGiro(slug);
  const Icono = e.icono;
  return (
    <div className="relative mx-auto w-full max-w-[460px] pb-10 pt-2">
      <span aria-hidden="true" className="absolute -right-6 -top-6 h-48 w-48 rounded-full opacity-70 blur-3xl" style={{ background: e.color }} />
      <div className="relative ml-auto w-[88%] rotate-[2.5deg] overflow-hidden rounded-[28px] p-1.5 shadow-[0_40px_80px_-30px_rgba(11,6,40,0.75)]" style={{ background: e.color }}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[22px]" style={{ background: e.tinta }}>
          {demo.foto ? (
            <Image src={demo.foto} alt={`Portada del demo ${demo.nombre}`} fill sizes="(min-width: 1024px) 400px, 88vw" className="object-cover" priority />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 grid grid-cols-4 place-items-center gap-4 p-8 opacity-30">
              {Array.from({ length: 12 }).map((_, i) => (
                <PawPrint key={i} className={`h-9 w-9 text-white ${i % 2 ? 'rotate-12' : '-rotate-12'}`} />
              ))}
            </div>
          )}
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5 pb-16">
            {e.logo ? (
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white">
                <Image src={e.logo} alt="" fill sizes="48px" className="object-contain p-1" />
              </span>
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: e.color }}>
                <Icono className="h-6 w-6" />
              </span>
            )}
            <span className="leading-tight text-white">
              <span className="block text-xl font-bold">{demo.nombre}</span>
              <span className="text-[12px] text-white/80">Demo en vivo · {demo.giro}</span>
            </span>
          </div>
        </div>
      </div>

      <Mini className="mk-rise absolute -left-1 top-10 w-[13.5rem] -rotate-[4deg] sm:-left-4 sm:w-[15rem]">
        <p className="mb-2.5 flex items-center gap-2 font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: e.color }}>
            <Icono className="h-3.5 w-3.5 text-[#140F2E]" />
          </span>
          Elige tu servicio
        </p>
        <ul className="space-y-1.5">
          {e.servicios.map((s, i) => (
            <li key={s} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12px] ${i === 0 ? 'font-semibold' : 'bg-[#F5F3FC]'}`} style={i === 0 ? { background: `${e.color}33` } : undefined}>
              <span className="truncate">{s}</span>
              {i === 0 && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />}
            </li>
          ))}
        </ul>
      </Mini>
      <CitaConfirmada servicio={e.servicios[0]} acento={e.tinta} className="mk-rise absolute -bottom-2 -right-1 w-[13rem] rotate-[3deg] sm:-right-4 sm:w-[14.5rem]" />
    </div>
  );
}

/** Ficha de giro para la portada: foto o patrón, color del oficio. */
export function FichaGiro({ slug, nombre, foto }: { slug: string; nombre: string; foto: string | null }) {
  const e = estiloGiro(slug);
  const Icono = e.icono;
  return (
    <span className="relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-[22px] p-4" style={{ background: e.tinta }}>
      {foto && <Image src={foto} alt="" fill sizes="(min-width: 1024px) 160px, 45vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: e.color }}>
        <Icono className="h-4 w-4 text-[#140F2E]" />
      </span>
      <span className="relative text-[15px] font-bold leading-tight text-white">{nombre}</span>
    </span>
  );
}

/* ───────────────────────── dolores (landing) ───────────────────────── */

export function IlustracionDolor({ tipo }: { tipo: 'chat' | 'plantada' | 'libreta' }) {
  if (tipo === 'chat') {
    return (
      <div aria-hidden="true" className="relative h-32 space-y-1.5 overflow-hidden rounded-2xl bg-[#ECE5DD] p-3 text-[12px]">
        <p className="w-fit max-w-[80%] rounded-lg rounded-tl-sm bg-white px-2.5 py-1.5">¿Tienes hoy a las 5?</p>
        <p className="w-fit max-w-[80%] rounded-lg rounded-tl-sm bg-white px-2.5 py-1.5">¿Y mañana temprano?</p>
        <p className="w-fit rounded-lg rounded-tl-sm bg-white px-2.5 py-1.5">¿Hola?</p>
        <span className="absolute right-3 top-3 rounded-full bg-[#140F2E] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">23:04</span>
        <span className="absolute bottom-3 right-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#1F8A4C] px-1.5 text-[11px] font-bold text-white">12</span>
      </div>
    );
  }
  if (tipo === 'plantada') {
    return (
      <div aria-hidden="true" className="h-32 space-y-1.5 rounded-2xl bg-white p-3 text-[12px] ring-1 ring-[#140F2E]/[0.06]">
        {[
          ['15:00', 'Gel en manos', false],
          ['16:00', 'Acrílicas · relleno', true],
          ['17:30', 'Manicure clásico', false],
        ].map(([h, s, falta]) => (
          <div key={h as string} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 ${falta ? 'bg-[#FFF1E6]' : 'bg-[#F5F3FC]'}`}>
            <span className="w-9 font-bold tabular-nums">{h}</span>
            <span className={`flex-1 truncate ${falta ? 'text-[#9A3412] line-through' : ''}`}>{s}</span>
            {falta && (
              <span className="flex items-center gap-1 rounded-full bg-[#F97316] px-2 py-0.5 text-[10px] font-bold text-white">
                <X className="h-3 w-3" strokeWidth={3} /> No vino
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="relative h-32 overflow-hidden rounded-2xl bg-[#FFF9E8] p-3 pl-9 italic text-[13px] text-[#3B3355]"
      style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 21px, rgba(91,52,232,0.18) 21px 22px)' }}
    >
      <span className="absolute inset-y-0 left-6 w-px bg-[#F87171]/60" />
      <p className="rotate-[-1deg]">Sra. Lupe 4pm uñas $350</p>
      <p className="mt-1 rotate-[0.5deg] line-through decoration-2">Kari 5:30 relleno</p>
      <p className="mt-1 rotate-[-0.5deg]">¿¿Tel de Mónica??</p>
      <span className="absolute -right-3 bottom-2 h-14 w-14 rounded-full bg-[#7FA7D9]/25 blur-[2px]" />
    </div>
  );
}

/* ───────────────────────── guías ───────────────────────── */

/** RESICO: la escalera de tasas, con los tramos reales de lib/resico/isr. */
export function EscaleraTasas({ tramos, oscuro = false }: { tramos: { hasta: string; tasa: string; bps: number }[]; oscuro?: boolean }) {
  const max = Math.max(...tramos.map((t) => t.bps));
  return (
    <figure className={`w-full rounded-[24px] p-5 sm:p-6 ${oscuro ? 'bg-white shadow-[0_40px_80px_-30px_rgba(11,6,40,0.75)]' : 'bg-[#F5F3FC]'}`}>
      <figcaption className="flex items-center justify-between gap-3 text-[13px] font-bold text-[#140F2E]">
        ISR mensual en RESICO
        <span className="rounded-full bg-[#D4F23A] px-2.5 py-0.5 text-[11px]">1% a 2.5%</span>
      </figcaption>
      <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3" aria-hidden="true">
        {tramos.map((t, i) => (
          <div key={t.hasta} className="flex h-full flex-1 flex-col justify-end">
            <span className="mb-1.5 text-center font-[family-name:var(--font-display)] text-[15px] font-extrabold tabular-nums text-[#140F2E] sm:text-lg">{t.tasa.replace('.00', '')}</span>
            <span className="mk-rise block rounded-t-xl" style={{ height: `${(t.bps / max) * 72}%`, background: i === tramos.length - 1 ? VIOLETA : `rgba(91,52,232,${0.25 + i * 0.15})`, animationDelay: `${200 + i * 90}ms` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3" aria-hidden="true">
        {tramos.map((t) => (
          <span key={t.hasta} className="flex-1 text-center text-[10px] leading-tight text-[#6A6488] sm:text-[11px]">
            hasta
            <br />
            <span className="font-semibold tabular-nums text-[#3A3360]">{t.hasta}</span>
          </span>
        ))}
      </div>
      <p className="mt-4 text-[12px] leading-snug text-[#6A6488]">Ingresos del mes con factura, sin IVA. La tasa que toca se aplica a todo el mes.</p>
    </figure>
  );
}

/** Precios: de qué se compone el precio del ejemplo resuelto de la guía. */
export function DesglosePrecio({ partes, total, oscuro = false }: { partes: { nombre: string; monto: number }[]; total: string; oscuro?: boolean }) {
  const suma = partes.reduce((a, p) => a + p.monto, 0);
  const colores = [VIOLETA, '#9B7BFF', LIMA];
  return (
    <figure className={`w-full rounded-[24px] p-5 sm:p-6 ${oscuro ? 'bg-white shadow-[0_40px_80px_-30px_rgba(11,6,40,0.75)]' : 'bg-[#F5F3FC]'}`}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold text-[#140F2E]">Uñas acrílicas · 1.5 h</span>
        <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums text-[#140F2E]">{total}</span>
      </figcaption>
      <div className="mt-5 flex h-12 overflow-hidden rounded-2xl" aria-hidden="true">
        {partes.map((p, i) => (
          <span key={p.nombre} className="flex items-center justify-center text-[12px] font-bold tabular-nums" style={{ width: `${(p.monto / suma) * 100}%`, background: colores[i % 3], color: i === 2 ? INK : 'white' }}>
            ${p.monto}
          </span>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {partes.map((p, i) => (
          <li key={p.nombre} className="flex items-center justify-between gap-3 text-[13px] text-[#3A3360]">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: colores[i % 3] }} />
              {p.nombre}
            </span>
            <span className="font-semibold tabular-nums text-[#140F2E]">${p.monto}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Citas que no llegan: el camino de una cita, de agendar al día de la cita. */
export function LineaCita() {
  const pasos = [
    { cuando: 'Al agendar', que: 'Le llega su confirmación por escrito: día, hora y servicio.', icono: Check },
    { cuando: 'Un día antes', que: 'Recordatorio corto, igual para todas las clientas.', icono: Bell },
    { cuando: 'Si no puede', que: 'Cambia la hora ella misma desde su link, y el espacio se libera.', icono: Link2 },
    { cuando: 'El día', que: 'Llega, o el hueco ya se lo ofreciste a otra.', icono: CalendarDays },
  ];
  return (
    <figure className="not-prose my-8 rounded-[24px] bg-[#F5F3FC] p-5 sm:p-6">
      <figcaption className="text-[13px] font-bold text-[#140F2E]">El camino de una cita que sí llega</figcaption>
      <ol className="!mt-5 !list-none !pl-0 grid gap-4 sm:grid-cols-4 sm:gap-3">
        {pasos.map(({ cuando, que, icono: Icono }, i) => (
          <li key={cuando} className="!mt-0 relative flex gap-3 sm:block">
            {i < pasos.length - 1 && <span aria-hidden="true" className="absolute left-5 top-10 h-[calc(100%-1.5rem)] w-px bg-[#5B34E8]/25 sm:left-10 sm:top-5 sm:h-px sm:w-[calc(100%-1.5rem)]" />}
            <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${i === 2 ? 'bg-[#D4F23A]' : 'bg-[#5B34E8]'}`}>
              <Icono className={`h-4 w-4 ${i === 2 ? 'text-[#140F2E]' : 'text-white'}`} />
            </span>
            <span className="block sm:mt-3">
              <span className="block text-[14px] font-bold text-[#140F2E]">{cuando}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-[#4A4370]">{que}</span>
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

/** Cabecera de la guía de citas: el recordatorio y su respuesta. */
export function EscenaRecordatorio() {
  return (
    <div className="relative mx-auto w-full max-w-[380px] pb-14 pt-2">
      <span aria-hidden="true" className="absolute inset-8 rounded-full bg-[#7A55FF] blur-3xl" />
      <MensajeRecordatorio className="relative rotate-[-2deg]" />
      <CitaConfirmada className="mk-rise absolute -bottom-1 -right-1 w-[13.5rem] rotate-[4deg] sm:-right-6" cuando="Mañana · 10:30 a.m." />
      <BichoBug className="absolute -left-3 -top-3 h-12 w-12 -rotate-[14deg]" />
    </div>
  );
}

/** Índice de guías: las tres portadas en abanico. */
export function EscenaGuias() {
  const portadas = [
    { t: 'RESICO', c: LIMA, f: INK, r: '-rotate-[8deg]', i: FileText },
    { t: 'Precios', c: '#FF9A76', f: INK, r: 'rotate-[2deg]', i: Gift },
    { t: 'Plantones', c: 'white', f: VIOLETA, r: 'rotate-[10deg]', i: Bell },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto flex h-64 w-full max-w-[380px] items-center justify-center">
      {portadas.map((p, i) => (
        <span key={p.t} className={`absolute flex h-52 w-40 flex-col justify-between rounded-2xl p-4 shadow-[0_30px_60px_-24px_rgba(11,6,40,0.7)] ${p.r}`} style={{ background: p.c, left: `${8 + i * 26}%` }}>
          <p.i className="h-6 w-6" style={{ color: p.f }} />
          <span className="font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase leading-none" style={{ color: p.f }}>
            {p.t}
          </span>
        </span>
      ))}
      <BichoBug className="absolute -right-1 top-0 h-12 w-12 rotate-[14deg]" />
    </div>
  );
}
