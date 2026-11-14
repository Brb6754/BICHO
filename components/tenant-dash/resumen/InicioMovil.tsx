import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Zap,
  CalendarDays,
  ChevronRight,
  FileText,
  Handshake,
  HandCoins,
  HeartHandshake,
  Landmark,
  Lock,
  MessageCircle,
  Megaphone,
  Package,
  ReceiptText,
  Sparkles,
  Stamp,
  Tag,
  Wallet,
} from 'lucide-react';
import { formatTime } from '@/lib/dates/tenantTime';
import { ACENTO_COPILOTO, colorDe, type ClaveColor, type TileModulo } from '@/lib/branding/moduloColores';
import { ListaPendientes, enCuanto, plural, type Dia, type ResumenProps } from './comun';

// EL INICIO EN EL TELÉFONO — "todo tu salón desde el cel".
//
// Debajo de 768px el Resumen deja de ser un tablero y se vuelve la
// pantalla de inicio de una app: lo esencial de hoy en una tarjeta, lo
// que pide atención, y una cuadrícula de módulos con el color de cada
// uno (el mismo de los anuncios). Arriba de 768px no se pinta: ahí
// mandan los cuatro estilos. Mismas cuentas (armar), cero consultas.

const ICONO: Record<ClaveColor, LucideIcon> = {
  agenda: CalendarDays,
  recordatorios: MessageCircle,
  regresan: HeartHandshake,
  lealtad: Stamp,
  caja: Wallet,
  inventario: Package,
  comisiones: HandCoins,
  facturacion: ReceiptText,
  resico: Landmark,
  copiloto: Sparkles,
  servicios: Tag,
  cotizaciones: FileText,
  reuniones: Handshake,
  posts: Megaphone,
  whatsapp: MessageCircle,
  boost: Zap,
};

function Tile({ t, ancho }: { t: TileModulo; ancho: boolean }) {
  const Icon = ICONO[t.clave];
  const { bg, fg } = colorDe(t.clave);
  const base = `group relative flex min-h-[7.25rem] flex-col justify-between rounded-[1.375rem] p-4 transition-transform duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:ring-primary ${ancho ? 'min-h-[5.5rem] flex-row items-center justify-start gap-4' : ''}`;

  if (t.bloqueado) {
    // Fuera del plan: el color del módulo apenas como tinte, para que se
    // reconozca sin parecer que ya lo tienes.
    return (
      <Link
        href={t.href}
        aria-label={`${t.label}: incluido en el plan ${t.bloqueado.plan}`}
        className={`${base} border border-dashed border-border-strong text-ink`}
        style={{ background: `color-mix(in srgb, ${bg} 14%, rgb(var(--color-surface)))` }}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink/70 shadow-xs" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </span>
        <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-muted" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-tight">{t.label}</span>
          <span className="mt-0.5 block text-[12px] text-muted">Plan {t.bloqueado.plan}</span>
        </span>
      </Link>
    );
  }

  const copiloto = t.clave === 'copiloto';
  return (
    <Link
      href={t.href}
      className={`${base} ${copiloto ? 'ring-1 ring-inset' : ''}`}
      style={{
        background: bg,
        color: `rgb(${fg})`,
        boxShadow: `0 1px 2px rgb(0 0 0 / 0.08), 0 10px 20px -12px ${bg}`,
        ...(copiloto ? { '--tw-ring-color': `${ACENTO_COPILOTO}66` } : {}),
      } as React.CSSProperties}
    >
      <Icon className="h-7 w-7 shrink-0" strokeWidth={2.1} style={copiloto ? { color: ACENTO_COPILOTO } : undefined} aria-hidden="true" />
      <span className="block text-[15px] font-semibold leading-tight">{t.label}</span>
    </Link>
  );
}

export function InicioMovil({ p, d, modulos }: { p: ResumenProps; d: Dia; modulos: TileModulo[] }) {
  const { tz, active, done, next, inProgress } = d;
  const restantes = active.length - done;
  return (
    <div className="md:hidden">
      <header>
        <h1 className="text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">{d.saludo}</h1>
        <p className="mt-1 text-sm text-muted first-letter:uppercase">{d.fecha}</p>
      </header>

      {p.setup}

      <Link
        href={`${p.base}/calendar`}
        className="group mt-5 flex items-center gap-4 rounded-[1.375rem] border border-border bg-surface p-4 shadow-xs transition-transform duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="Abrir la agenda de hoy"
      >
        <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-[rgb(var(--color-cta-fg))]">
          <span className="text-[1.375rem] font-semibold leading-none tabular-nums">{active.length}</span>
          <span className="mt-0.5 text-[10px] font-medium leading-none opacity-85">{active.length === 1 ? 'cita' : 'citas'}</span>
        </span>
        <span className="min-w-0 flex-1">
          {next ? (
            <>
              <span className="block text-[13px] text-muted">
                {inProgress ? `En curso, termina ${formatTime(next.ends_at, tz)}` : enCuanto(new Date(next.starts_at).getTime() - p.now.getTime())}
              </span>
              <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink">
                <span className="tabular-nums">{formatTime(next.starts_at, tz)}</span> · {next.service_types?.name ?? 'Cita'}
              </span>
              <span className="block truncate text-[13px] text-muted">con {next.customers?.name ?? 'cliente'}</span>
            </>
          ) : (
            <>
              <span className="block text-[15px] font-semibold text-ink">{active.length ? 'Sin más citas por hoy' : 'Nada agendado hoy'}</span>
              <span className="block text-[13px] text-muted">
                {p.upcoming.length ? `${plural(p.upcoming.length, 'cita', 'citas')} en los próximos 7 días` : 'Comparte tu página para recibir citas'}
              </span>
            </>
          )}
          {active.length > 0 && (
            <span className="mt-1.5 block text-[12px] text-muted">
              {done} atendidas · {restantes} por atender
            </span>
          )}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>

      {p.alertas.length > 0 && (
        <div className="mt-3">
          <ListaPendientes alertas={p.alertas} />
        </div>
      )}

      {modulos.length > 0 && (
        <section aria-labelledby="inicio-modulos" className="mt-8">
          <h2 id="inicio-modulos" className="text-[17px] font-semibold tracking-tight text-ink">
            Tu negocio
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {modulos.map((t, i) => {
              // Con número impar, el último ocupa el renglón entero en vez de dejar un hueco.
              const ancho = modulos.length % 2 === 1 && i === modulos.length - 1;
              return (
                <li key={t.clave} className={ancho ? 'col-span-2' : ''}>
                  <Tile t={t} ancho={ancho} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {p.action && <div className="mt-6 flex justify-center">{p.action}</div>}
    </div>
  );
}
