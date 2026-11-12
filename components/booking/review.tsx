'use client';

import { useState } from 'react';
import { CalendarPlus, Check, ChevronDown, MapPin, MessageCircle, Pencil } from 'lucide-react';
import { dayKey, formatTime } from '@/lib/dates/tenantTime';
import motion from './motion.module.css';
import { formatDuration, publicPrice, type Service, type StepId } from './types';

// The last step is two blocks, not one long form: first what you are
// about to book, then who you are. The old flow asked for a phone number
// while the thing being booked had scrolled off the screen.

function SummaryRow({
  label,
  value,
  onEdit,
  editLabel,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
      <span className="shrink-0 text-[13px] text-muted">{label}</span>
      <span className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right">
        <span className="text-[13px] font-medium text-ink">{value}</span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">{editLabel ?? `Cambiar ${label}`}</span>
            Editar
          </button>
        )}
      </span>
    </div>
  );
}

export function BookingSummary({
  service,
  resourceName,
  when,
  location,
  onEdit,
  showResourceRow,
}: {
  service: Service;
  resourceName: string;
  when: string;
  location?: string | null;
  onEdit: (step: StepId) => void;
  showResourceRow: boolean;
}) {
  return (
    <section className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-border">
      <h3 className="mb-1 pt-1 text-sm font-semibold text-ink">Tu reserva</h3>
      <div>
        <SummaryRow label="Servicio" value={service.name} onEdit={() => onEdit('service')} />
        <SummaryRow label="Duración" value={formatDuration(service.duration_minutes)} />
        {showResourceRow && (
          <SummaryRow label="Atiende" value={resourceName} onEdit={() => onEdit('resource')} />
        )}
        <SummaryRow label="Cuándo" value={when} onEdit={() => onEdit('date')} />
        {location && <SummaryRow label="Dónde" value={location} />}
        {publicPrice(service) && <SummaryRow label="Precio" value={publicPrice(service)} />}
      </div>

      {/* No invented cancellation policy: the business hasn't set one
          (see CLAUDE.md). What IS true is that the confirmation carries a
          link to change or cancel, so that's what this says. */}
      <p className="mt-2 flex items-start gap-2 border-t border-border pt-3 text-[12px] leading-relaxed text-muted">
        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
        Puedes cambiar o cancelar tu cita desde el enlace que te llega al confirmar.
      </p>
    </section>
  );
}

const FIELD =
  'w-full rounded-xl border bg-surface px-3.5 py-3 text-base text-ink outline-none transition-shadow placeholder:text-muted/70 focus:ring-4 sm:py-2.5 sm:text-sm';

export type CustomerFields = { name: string; phone: string; email: string; notes: string };

export function CustomerForm({
  values,
  onChange,
  showErrors,
}: {
  values: CustomerFields;
  onChange: (next: Partial<CustomerFields>) => void;
  // Errors appear once the visitor has tried to continue, or once they've
  // left a field — never while they're still typing their name for the
  // first time.
  showErrors: boolean;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [notesOpen, setNotesOpen] = useState(false);

  const nameError = !values.name.trim() ? 'Escribe tu nombre.' : null;
  const digits = values.phone.replace(/\D/g, '');
  const phoneError = !digits
    ? 'Escribe un teléfono.'
    : digits.length < 10
      ? 'Faltan dígitos: son 10.'
      : null;
  const emailError =
    values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
      ? 'Revisa el correo.'
      : null;

  const show = (field: string) => showErrors || touched[field];

  function fieldClass(error: string | null, field: string) {
    return `${FIELD} ${
      show(field) && error
        ? 'border-error focus:border-error focus:ring-error/15'
        : 'border-border focus:border-primary focus:ring-primary/15'
    }`;
  }

  return (
    <section className="pt-2">
      <h3 className="mb-3 text-sm font-semibold text-ink">Tus datos</h3>

      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink" htmlFor="booking-name">
            Nombre completo
          </label>
          <input
            id="booking-name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            aria-invalid={show('name') && !!nameError}
            className={fieldClass(nameError, 'name')}
            placeholder="María Fernanda Ruiz"
          />
          {show('name') && nameError && (
            <p className="mt-1.5 text-xs text-error">{nameError}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink" htmlFor="booking-phone">
            Teléfono
          </label>
          <input
            id="booking-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            aria-invalid={show('phone') && !!phoneError}
            aria-describedby="booking-phone-help"
            className={fieldClass(phoneError, 'phone')}
            placeholder="618 123 4567"
          />
          <p id="booking-phone-help" className="mt-1.5 text-xs text-muted">
            Por si el negocio necesita avisarte de un cambio. No se usa para nada más.
          </p>
          {show('phone') && phoneError && <p className="mt-1 text-xs text-error">{phoneError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink" htmlFor="booking-email">
            Correo <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="booking-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={show('email') && !!emailError}
            aria-describedby="booking-email-help"
            className={fieldClass(emailError, 'email')}
            placeholder="maria@correo.com"
          />
          <p id="booking-email-help" className="mt-1.5 text-xs text-muted">
            Si lo dejas, te mandamos la confirmación y el enlace para cambiar la cita.
          </p>
          {show('email') && emailError && <p className="mt-1 text-xs text-error">{emailError}</p>}
        </div>

        {/* Notes are behind a disclosure: almost nobody writes one, and an
            open textarea made the form look twice as long as it is. */}
        <div>
          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            aria-expanded={notesOpen}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${notesOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
            Agregar una nota para el negocio
          </button>
          {notesOpen && (
            <textarea
              id="booking-notes"
              rows={3}
              value={values.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Alergias, preferencias, si llegas con alguien más…"
              className={`mt-2 ${FIELD} border-border focus:border-primary focus:ring-primary/15`}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// The last screen is the one people screenshot, so it's built like a
// ticket: the date and time set large enough to read at a glance from a
// lock-screen photo, a perforated stub with the code, and every way to
// keep the appointment (manage link, calendar file, WhatsApp) one tap away.
export function ConfirmationScreen({
  businessName,
  service,
  when,
  startsAt,
  endsAt,
  timezone,
  resourceName,
  showResource,
  location,
  bookingId,
  manageUrl,
  calendarUrl,
  emailed,
  onBookAnother,
}: {
  businessName: string;
  service: Service;
  when: string;
  startsAt: string;
  endsAt: string;
  timezone?: string | null;
  resourceName: string;
  showResource: boolean;
  location?: string | null;
  bookingId: string;
  manageUrl: string;
  calendarUrl: string;
  // Only claim an email was sent when one actually was.
  emailed: boolean;
  onBookAnother: () => void;
}) {
  // Date parts in the BUSINESS's timezone: the calendar day comes from
  // dayKey, then it's spelled out from noon UTC of that day (same trick
  // the date strip uses) so the browser's own clock never gets a say.
  const key = dayKey(startsAt, timezone);
  const noon = new Date(`${key}T12:00:00Z`);
  const part = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-MX', { ...o, timeZone: 'UTC' }).format(noon);
  const code = bookingId.slice(0, 8).toUpperCase();

  const icsHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(
    icsFile({ title: `${service.name} — ${businessName}`, startsAt, endsAt, location, uid: bookingId })
  )}`;
  const shareText = [
    `Ya aparté mi cita en ${businessName}:`,
    `${service.name} — ${when}`,
    location ? `Dirección: ${location}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="px-5 pb-8 pt-10 sm:px-8">
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center" aria-hidden="true">
        <span className={`${motion.ring} absolute inset-0 rounded-full bg-success`} />
        {BURST_ANGLES.map((a, i) => (
          <span
            key={a}
            className={motion.burst}
            style={
              {
                '--a': `${a}deg`,
                background: i % 2 ? 'rgb(var(--color-primary))' : 'rgb(var(--color-accent))',
              } as React.CSSProperties
            }
          />
        ))}
        <svg
          viewBox="0 0 24 24"
          className="relative h-8 w-8"
          fill="none"
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className={motion.drawCheck} d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>

      <h1
        className="mt-5 text-balance text-center text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2.1rem]"
        style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))', letterSpacing: 'var(--tpl-heading-tracking)' }}
      >
        ¡Listo! Tu cita está apartada
      </h1>
      <p className="mt-2 text-center text-sm text-muted">{businessName} te espera.</p>

      {/* The ticket */}
      <div className={`${motion.ticket} mx-auto mt-7 max-w-sm overflow-clip rounded-3xl bg-paper ring-1 ring-border`}>
        <div className="flex items-stretch">
          <div className="flex w-[104px] shrink-0 flex-col items-center justify-center gap-0.5 bg-primary py-5 text-[rgb(var(--color-cta-fg))]">
            <span className="text-xs font-semibold capitalize">{part({ weekday: 'long' })}</span>
            <span
              className="text-[2.75rem] font-bold leading-none tabular-nums"
              style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))' }}
            >
              {Number(key.slice(8, 10))}
            </span>
            <span className="text-xs font-semibold capitalize">{part({ month: 'long' })}</span>
          </div>
          <div className="min-w-0 flex-1 p-4 text-left">
            <p
              className="text-[1.9rem] font-semibold leading-none tabular-nums text-ink"
              style={{ fontFamily: 'var(--tpl-heading-font, var(--font-heading))' }}
            >
              {formatTime(startsAt, timezone)}
            </p>
            <p className="mt-2 text-sm font-semibold leading-snug text-ink">{service.name}</p>
            <p className="mt-0.5 text-[13px] text-muted">
              {formatDuration(service.duration_minutes)}
              {showResource ? ` · ${resourceName}` : ''}
            </p>
          </div>
        </div>
        {/* Perforation: a dashed seam with two notches cut into the edges. */}
        <div className="relative h-0 border-t-2 border-dashed border-ink/15" aria-hidden="true">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-surface" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-surface" />
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-left">
          <span className="min-w-0 text-[13px] text-muted">
            {location ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{location}</span>
              </span>
            ) : (
              'Código de tu cita'
            )}
          </span>
          <span className="shrink-0 font-mono text-sm font-semibold tracking-wider text-ink">{code}</span>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5">
        <a
          href={manageUrl}
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-[rgb(var(--color-cta-fg))] shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.6)] transition active:scale-[0.99]"
        >
          Ver, cambiar o cancelar mi cita
        </a>
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-primary/40"
          >
            <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            Google Calendar
          </a>
          <a
            href={icsHref}
            download={`cita-${code}.ics`}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-primary/40"
          >
            <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            iPhone / Outlook
          </a>
        </div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 text-sm font-medium text-ink transition-colors hover:border-primary/40"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Compartir por WhatsApp
        </a>
        <button
          type="button"
          onClick={onBookAnother}
          className="min-h-[44px] text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Hacer otra reserva
        </button>
      </div>

      <p className="mx-auto mt-4 max-w-sm text-center text-xs leading-relaxed text-muted">
        {emailed
          ? 'Te mandamos la confirmación por correo. Si no llega en unos minutos, revisa tu carpeta de spam.'
          : 'Guarda este enlace o toma una captura: es la forma de volver a tu cita, y no dejaste un correo donde mandártelo.'}
      </p>
    </div>
  );
}

const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// A minimal RFC 5545 event. Apple Calendar and Outlook open it directly;
// Google already has its own link above.
export function icsFile({
  title,
  startsAt,
  endsAt,
  location,
  uid,
}: {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
  uid: string;
}): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const esc = (t: string) => t.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//reservas//cita//ES',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(startsAt)}`,
    `DTEND:${stamp(endsAt)}`,
    `SUMMARY:${esc(title)}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
