'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, ChevronLeft, CalendarPlus, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { tenantCtaStyle } from '@/lib/branding/colors';
import { AvailabilityCalendar } from './AvailabilityCalendar';

type Service = { id: string; name: string; duration_minutes: number; price_cents: number };
type Resource = { id: string; name: string };
type Slot = { slot_start: string; slot_end: string };
type Step = 'service' | 'date' | 'time' | 'details' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'service', label: 'Servicio' },
  { key: 'date', label: 'Fecha' },
  { key: 'time', label: 'Hora' },
  { key: 'details', label: 'Datos' },
  { key: 'done', label: 'Confirmación' },
];

export default function BookingFlow({
  slug,
  businessName,
  services,
  resources,
  accentColor = '#8FE24A',
  primaryColor = '#0E3B2C',
}: {
  slug: string;
  businessName?: string;
  services: Service[];
  resources: Resource[];
  accentColor?: string;
  primaryColor?: string;
}) {
  const ctaStyle = tenantCtaStyle(primaryColor, accentColor);

  const [step, setStep] = useState<Step>('service');
  const [service, setService] = useState<Service | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(resources.length === 1 ? resources[0].id : null);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  async function loadAvailability(svc: Service, resId: string) {
    setLoadingSlots(true);
    setError(null);

    const supabase = createClient();
    const from = format(new Date(), 'yyyy-MM-dd');
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 60);
    const to = format(toDate, 'yyyy-MM-dd');

    const { data, error: rpcError } = await supabase.rpc('get_available_slots', {
      p_resource_id: resId,
      p_service_type_id: svc.id,
      p_from: from,
      p_to: to,
    });

    setLoadingSlots(false);

    if (rpcError) {
      setError('No se pudo cargar la disponibilidad.');
      return;
    }

    setAllSlots((data as Slot[]) ?? []);
    setStep('date');
  }

  function handleSelectService(svc: Service) {
    setService(svc);
    if (resourceId) {
      loadAvailability(svc, resourceId);
    }
  }

  function handleSelectResource(resId: string) {
    setResourceId(resId);
    if (service) {
      loadAvailability(service, resId);
    }
  }

  const availableDateKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSlots) set.add(format(new Date(s.slot_start), 'yyyy-MM-dd'));
    return set;
  }, [allSlots]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return allSlots.filter((s) => format(new Date(s.slot_start), 'yyyy-MM-dd') === key);
  }, [allSlots, selectedDate]);

  async function submitBooking() {
    if (!service || !resourceId || !selectedSlot || !name || !phone) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/reservar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        resource_id: resourceId,
        service_type_id: service.id,
        starts_at: selectedSlot.slot_start,
        ends_at: selectedSlot.slot_end,
        customer_name: name,
        customer_phone: phone,
        customer_email: email || undefined,
        notes: notes || undefined,
      }),
    });

    const body = await res.json();
    setSubmitting(false);

    if (res.ok) {
      setBookingId(body.bookingId);
      setStep('done');
    } else {
      // loadAvailability() resets error to null at its start (it's also
      // used for the normal, non-error load path) — so it has to run
      // and finish BEFORE setting the message here, or this gets wiped
      // the instant it's set.
      setSelectedSlot(null);
      await loadAvailability(service, resourceId);
      setError(body.error ?? 'No se pudo agendar la cita.');
    }
  }

  function resetFlow() {
    setStep('service');
    setService(null);
    setResourceId(resources.length === 1 ? resources[0].id : null);
    setAllSlots([]);
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setError(null);
    setBookingId(null);
  }

  function googleCalendarUrl() {
    if (!selectedSlot || !service) return '#';
    const toGoogleDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const text = encodeURIComponent(`${service.name}${businessName ? ` — ${businessName}` : ''}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${toGoogleDate(
      selectedSlot.slot_start
    )}/${toGoogleDate(selectedSlot.slot_end)}`;
  }

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300 ${
                  i <= currentStepIndex ? '' : 'bg-ink/5 text-ink/35'
                }`}
                style={i <= currentStepIndex ? { backgroundColor: accentColor, color: primaryColor } : undefined}
              >
                {i < currentStepIndex ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={`mx-1 h-px w-5 transition-colors duration-300 sm:w-8 ${i < currentStepIndex ? '' : 'bg-ink/10'}`}
                  style={i < currentStepIndex ? { backgroundColor: accentColor } : undefined}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs font-medium text-muted">{STEPS[currentStepIndex].label}</p>
      </div>

      {error && step !== 'done' && (
        <p className="animate-fade-in rounded-2xl bg-error-soft px-4 py-3 text-center text-sm text-error">
          {error}
        </p>
      )}

      {step === 'service' && (
        <div className="animate-fade-in flex flex-col gap-3">
          <p className="text-sm font-medium text-muted">Elige un servicio</p>
          {services.map((s) => (
            <Card
              key={s.id}
              padded={false}
              hoverable
              className="flex items-center justify-between px-5 py-4"
            >
              <div>
                <p className="font-medium text-ink">{s.name}</p>
                <p className="text-sm text-muted">{s.duration_minutes} min</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-ink">${(s.price_cents / 100).toFixed(2)} MXN</p>
                <Button
                  type="button"
                  className="px-4 py-1.5 text-xs"
                  disabled={loadingSlots}
                  isLoading={loadingSlots && service?.id === s.id}
                  onClick={() => handleSelectService(s)}
                  style={ctaStyle}
                >
                  Seleccionar
                </Button>
              </div>
            </Card>
          ))}

          {service && resources.length > 1 && !resourceId && (
            <div className="mt-2">
              <p className="mb-2 text-sm font-medium text-muted">¿Con quién?</p>
              <div className="flex flex-wrap gap-2">
                {resources.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectResource(r.id)}
                    className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink transition hover:border-primary/30 active:scale-[0.98]"
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'date' && service && (
        <div className="animate-fade-in flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setStep('service')}
            className="flex items-center gap-1 self-start text-xs text-muted hover:text-ink hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Cambiar servicio
          </button>
          <p className="text-sm font-medium text-muted">Selecciona una fecha</p>
          <Card className="flex justify-center">
            <AvailabilityCalendar
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                if (date) setStep('time');
              }}
              availableDateKeys={availableDateKeys}
              accentColor={accentColor}
            />
          </Card>
          {availableDateKeys.size === 0 && (
            <p className="text-center text-sm text-muted">No hay horarios disponibles en los próximos 60 días.</p>
          )}
        </div>
      )}

      {step === 'time' && selectedDate && (
        <div className="animate-fade-in flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setStep('date')}
            className="flex items-center gap-1 self-start text-xs text-muted hover:text-ink hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Cambiar fecha
          </button>
          <p className="text-sm font-medium text-muted">
            Horarios para el {format(selectedDate, 'd MMMM', { locale: es })}
          </p>
          <div className="flex flex-wrap gap-2">
            {slotsForSelectedDate.map((slot) => {
              const isSelected = selectedSlot?.slot_start === slot.slot_start;
              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep('details');
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition active:scale-[0.97] ${
                    isSelected ? '' : 'border-border bg-surface text-ink'
                  }`}
                  style={isSelected ? { ...ctaStyle, borderColor: 'transparent' } : undefined}
                >
                  {format(new Date(slot.slot_start), 'h:mm a', { locale: es })}
                </button>
              );
            })}
            {slotsForSelectedDate.length === 0 && (
              <p className="text-sm text-muted">Sin horarios ese día.</p>
            )}
          </div>
        </div>
      )}

      {step === 'details' && selectedSlot && service && (
        <div className="animate-fade-in flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setStep('time')}
            className="flex items-center gap-1 self-start text-xs text-muted hover:text-ink hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Cambiar hora
          </button>
          <Card padded={false} className="px-5 py-4">
            <p className="font-medium text-ink">{service.name}</p>
            <p className="text-sm text-muted">
              {format(new Date(selectedSlot.slot_start), 'd MMMM, h:mm a', { locale: es })}
            </p>
          </Card>
          <div>
            <Label>Tu nombre</Label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full" />
          </div>
          <div>
            <Label>Tu teléfono</Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full" />
          </div>
          <div>
            <Label>Correo (opcional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
          </div>
          <div>
            <Label>Notas (opcional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-2xl border border-border bg-glass/55 backdrop-blur-md px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button
            type="button"
            onClick={submitBooking}
            disabled={submitting || !name || !phone}
            isLoading={submitting}
            style={ctaStyle}
          >
            {submitting ? 'Agendando...' : 'Confirmar cita'}
          </Button>
        </div>
      )}

      {step === 'done' && service && selectedSlot && (
        <Card className="animate-fade-in flex flex-col items-center gap-3 text-center">
          <span
            className="animate-pop-in flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: accentColor, color: primaryColor }}
          >
            <Check className="h-6 w-6" strokeWidth={3} />
          </span>
          <p className="text-xl font-semibold text-ink">¡Cita confirmada!</p>
          <p className="text-ink">{service.name}</p>
          <p className="text-muted">
            {format(new Date(selectedSlot.slot_start), "EEEE d 'de' MMMM, h:mm a", { locale: es })}
          </p>
          {bookingId && <p className="text-xs text-muted">Referencia: {bookingId.slice(0, 8)}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <a href={googleCalendarUrl()} target="_blank" rel="noreferrer">
              <Button type="button" variant="ghost" className="text-xs">
                <CalendarPlus className="h-3.5 w-3.5" />
                Agregar al calendario
              </Button>
            </a>
            <Button type="button" variant="ghost" className="text-xs" onClick={resetFlow}>
              <RotateCcw className="h-3.5 w-3.5" />
              Volver al inicio
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
