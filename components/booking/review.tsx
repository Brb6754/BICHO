'use client';

import { useState } from 'react';
import { CalendarPlus, Check, ChevronDown, MapPin, Pencil } from 'lucide-react';
import { formatDuration, formatPrice, type Service, type StepId } from './types';

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
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-1 text-sm font-semibold text-ink">Tu reserva</h2>
      <div>
        <SummaryRow label="Servicio" value={service.name} onEdit={() => onEdit('service')} />
        <SummaryRow label="Duración" value={formatDuration(service.duration_minutes)} />
        {showResourceRow && (
          <SummaryRow label="Atiende" value={resourceName} onEdit={() => onEdit('resource')} />
        )}
        <SummaryRow label="Cuándo" value={when} onEdit={() => onEdit('date')} />
        {location && <SummaryRow label="Dónde" value={location} />}
        {formatPrice(service.price_cents) && (
          <SummaryRow label="Precio" value={formatPrice(service.price_cents)} />
        )}
      </div>

      {/* No invented cancellation policy: the business hasn't set one
          (see CLAUDE.md). What IS true is that the confirmation carries a
          link to change or cancel, so that's what this says. */}
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-paper px-3 py-2.5 text-[12px] leading-relaxed text-muted">
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
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">Tus datos</h2>

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

export function ConfirmationScreen({
  businessName,
  service,
  when,
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
  return (
    <div className="px-5 py-8 text-center sm:px-6">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
        <Check className="h-7 w-7 text-success" strokeWidth={3} aria-hidden="true" />
      </span>

      <h1 className="mt-4 text-xl font-bold text-ink">Tu reserva está confirmada</h1>
      <p className="mt-1.5 text-sm text-muted">
        {businessName} te espera. Ya quedó apartado tu lugar.
      </p>

      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-surface p-4 text-left">
        <SummaryRow label="Servicio" value={service.name} />
        <SummaryRow label="Cuándo" value={when} />
        {showResource && <SummaryRow label="Atiende" value={resourceName} />}
        {location && <SummaryRow label="Dónde" value={location} />}
        <SummaryRow label="Código" value={bookingId.slice(0, 8).toUpperCase()} />
      </div>

      <div className="mx-auto mt-5 flex max-w-sm flex-col gap-2.5">
        <a
          href={manageUrl}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-[rgb(var(--color-cta-fg))] transition active:scale-[0.99]"
        >
          Ver, cambiar o cancelar mi cita
        </a>
        <a
          href={calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border bg-surface px-6 text-sm font-medium text-ink transition-colors hover:border-primary/40"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Agregar a mi calendario
        </a>
        <button
          type="button"
          onClick={onBookAnother}
          className="min-h-[44px] text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          Hacer otra reserva
        </button>
      </div>

      <p className="mx-auto mt-6 max-w-sm text-xs leading-relaxed text-muted">
        {emailed
          ? 'Te mandamos la confirmación por correo. Si no llega en unos minutos, revisa tu carpeta de spam.'
          : 'Guarda este enlace o toma una captura: es la forma de volver a tu cita, y no dejaste un correo donde mandártelo.'}
      </p>

      {location && (
        <p className="mx-auto mt-3 flex max-w-sm items-center justify-center gap-1.5 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {location}
        </p>
      )}
    </div>
  );
}
