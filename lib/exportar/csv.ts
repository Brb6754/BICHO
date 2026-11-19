import { buildRoster, type RosterBooking } from '@/lib/customers/roster';
import { dayKey, formatTime } from '@/lib/dates/tenantTime';

// "Descargar mis datos": la landing promete que sus datos siguen siendo
// suyos. Esto los convierte en CSV que se abre bien en Excel en español.
//
// - BOM UTF-8 al inicio: sin él, Excel en Windows lee "Peña" como "PeÃ±a".
// - Separador coma y fin de línea \r\n (RFC 4180).
// - Inyección de fórmulas: un nombre que empieza con = + - @ (o tab/CR)
//   Excel lo ejecuta como fórmula. Lo escribe cualquiera que reserva en la
//   página pública, así que se neutraliza con un ' al frente (OWASP).
//   De paso, "+52 618…" deja de convertirse en número.

const BOM = '﻿';
const FORMULA = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (typeof value === 'string' && FORMULA.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return BOM + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export type ExportBooking = RosterBooking & { resources?: { name: string } | null };

const ESTADO: Record<string, string> = {
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Vino',
  no_show: 'No vino',
};

// Fecha "2026-11-03" y hora "17:30" en columnas separadas, en la zona del
// negocio (nunca la del servidor, que en Vercel es UTC).
export function citasCsv(bookings: ExportBooking[], timezone: string | null): string {
  const rows = [...bookings]
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((b) => [
      dayKey(b.starts_at, timezone),
      formatTime(b.starts_at, timezone),
      b.service_types?.name ?? '',
      b.resources?.name ?? '',
      b.customers?.name ?? '',
      b.customers?.phone ?? '',
      ESTADO[b.status] ?? b.status,
    ]);
  return toCsv(['Fecha', 'Hora', 'Servicio', 'Quién atiende', 'Cliente', 'Teléfono', 'Estado'], rows);
}

// Una fila por persona (agrupada por teléfono, igual que la pantalla de
// Clientes), no una por cita.
export function clientesCsv(bookings: ExportBooking[], timezone: string | null, now: Date): string {
  const rows = buildRoster(bookings, now)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map((c) => [
      c.name,
      c.phone,
      c.email,
      c.visits,
      c.lastVisit ? `${dayKey(c.lastVisit, timezone)} ${formatTime(c.lastVisit, timezone)}` : '',
    ]);
  return toCsv(['Nombre', 'Teléfono', 'Correo', 'Visitas', 'Última visita'], rows);
}
