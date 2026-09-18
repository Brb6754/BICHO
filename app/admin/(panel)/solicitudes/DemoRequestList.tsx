import { Mail, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { appointmentWhen } from '@/lib/dates/tenantTime';
import { deleteDemoRequest, setDemoRequestStatus } from './actions';
import type { DemoStatus } from './statuses';

// Presentation only, split out of page.tsx so the page stays about
// fetching and this can be rendered against fixture rows. The admin
// panel sits behind a login this session can't pass, and "it compiles"
// is not evidence that a list looks right.

export type DemoRequest = {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  vertical: string | null;
  city: string | null;
  plan: string | null;
  message: string | null;
  status: DemoStatus;
  created_at: string;
};

export const STATUS_LABEL: Record<DemoStatus, string> = {
  new: 'Sin contactar',
  contacted: 'Contactada',
  won: 'Cerrada',
  lost: 'Perdida',
};

// Status colour uses the semantic tokens, not brand colours: these are
// states (pending / in progress / good / dead), the same vocabulary
// StatusBadge already uses for tenants.
const STATUS_TONE: Record<DemoStatus, string> = {
  new: 'bg-warning-soft text-warning',
  contacted: 'bg-info-soft text-info',
  won: 'bg-success-soft text-success',
  lost: 'bg-elevated text-muted',
};

// Which buttons a row offers depends on where it is: a lead already
// marked won doesn't need a "Se cerró" button, and offering every
// transition on every row turns the list into a wall of controls.
const NEXT_STEPS: Record<DemoStatus, { status: DemoStatus; label: string }[]> = {
  new: [
    { status: 'contacted', label: 'Ya la contacté' },
    { status: 'lost', label: 'Descartar' },
  ],
  contacted: [
    { status: 'won', label: 'Se cerró' },
    { status: 'lost', label: 'No se dio' },
  ],
  won: [{ status: 'contacted', label: 'Reabrir' }],
  lost: [{ status: 'new', label: 'Reabrir' }],
};

export function DemoRequestList({ requests }: { requests: DemoRequest[] }) {
  return (
    <ul>
      {requests.map((r, i) => (
        <li key={r.id} className={i > 0 ? 'border-t border-border' : ''}>
          <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{r.business}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {r.name}
                  {r.vertical ? ` · ${r.vertical}` : ''}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[r.status]}`}
              >
                {STATUS_LABEL[r.status]}
              </span>
            </div>

            {/* Phone first and as a real tel: link — the whole point of
                this list is to call these people, and on a phone that
                link dials instead of selecting text. */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <a
                href={`tel:${r.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline"
              >
                <Phone className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                {r.phone}
              </a>
              <a
                href={`mailto:${r.email}?subject=${encodeURIComponent(`Tu demo de bicho — ${r.business}`)}`}
                className="inline-flex items-center gap-1.5 text-muted hover:text-ink hover:underline"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {r.email}
              </a>
              {r.city && (
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {r.city}
                </span>
              )}
            </div>

            {r.message && (
              <p className="rounded-2xl bg-elevated px-4 py-3 text-sm leading-relaxed text-muted">
                {r.message}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
              {/* Dates are formatted against an explicit timezone, never
                  the process one: on Vercel that is UTC, so a lead that
                  arrived at 19:00 in Durango would be filed under the
                  next day. */}
              <p className="mr-auto text-xs text-muted">
                {appointmentWhen(r.created_at)}
                {r.plan ? ` · vio el plan ${r.plan}` : ''}
              </p>

              {/* Status changes are one click and reversible, so no
                  confirmation — the same rule the rest of the panel
                  follows. Deleting isn't, so it keeps one. */}
              {NEXT_STEPS[r.status].map(({ status, label }) => (
                <form key={status} action={setDemoRequestStatus.bind(null, r.id, status)}>
                  <Button type="submit" variant="outline">
                    {label}
                  </Button>
                </form>
              ))}

              <ConfirmForm
                action={deleteDemoRequest.bind(null, r.id)}
                confirmTitle="¿Borrar esta solicitud?"
                confirmMessage="Se va para siempre, con el teléfono y el correo de esa persona. Si solo no se dio, márcala como perdida."
                confirmLabel="Sí, borrarla"
                dismissLabel="No, conservarla"
              >
                Borrar
              </ConfirmForm>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
