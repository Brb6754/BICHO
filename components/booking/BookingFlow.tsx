'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { addDaysKey, appointmentWhen, dayKey, formatTime, longDate } from '@/lib/dates/tenantTime';
import { tenantManageBookingUrl } from '@/lib/urls';
import {
  SelectionSummary,
  SidePanel,
  StepHeader,
  StickyActionBar,
  type SummaryItem,
} from './chrome';
import { ResourceCard, ServiceCard, ShowMore, TimeGroup, TimeSlot } from './cards';
import { CalendarSheet, DateStrip, type StripDay } from './dates';
import { BookingSummary, ConfirmationScreen, CustomerForm, type CustomerFields } from './review';
import { EmptyCatalog, ErrorState, LoadingSlots, NoSlotsState } from './states';
import {
  ANY_RESOURCE,
  formatDuration,
  publicPrice,
  stepsFor,
  type Resource,
  type ResourceChoice,
  type Service,
  type Slot,
  type StepId,
} from './types';

// Rebuilt as a guided five-step process instead of one long page.
//
// What changed structurally, and why each one:
//
//  - Five explicit steps with a persistent header. The old flow was a
//    page you scrolled: nothing said where you were or how much was left.
//  - A summary of decisions under the header, editable in place. Choosing
//    a service used to make it disappear; by the form you could no longer
//    see what you were booking.
//  - Availability is loaded for EVERY resource at once, which is what
//    makes "cualquiera disponible" possible — it shows the union of all
//    their free times, so the visitor sees more hours, not fewer.
//  - Going back never resets. Editing one decision keeps the ones after
//    it that are still valid and only re-asks what genuinely changed.
//  - A sticky action bar, so the way forward is never below the fold.
//  - A review block before confirming, and a separate success screen.
//
// Colour: this file names none. Everything is a semantic token, and the
// tenant's palette arrives through the CSS variables the page binds. That
// is what makes this a template rather than one business's booking page.

const STRIP_DAYS = 14;
const INITIAL_SLOTS_SHOWN = 9;

type Props = {
  slug: string;
  businessName?: string;
  services: Service[];
  resources: Resource[];
  accentColor?: string;
  primaryColor?: string;
  timezone?: string | null;
  // What this business calls the thing you book with. A salon picks
  // "profesional", a padel court "cancha", a clinic "consultorio".
  resourceLabel?: string;
  /** La pregunta tal cual la escribió el negocio (db/030). Gana sobre la derivada. */
  resourceQuestion?: string;
  // Shown in the summary and the confirmation when the business has one.
  location?: string | null;

  // ── Injection points, both optional ──────────────────────────────
  // A real tenant page passes neither and gets the real behaviour:
  // availability from the get_available_slots RPC, booking through
  // /api/reservar. They exist so the public platform demo
  // (app/plataforma) can run this EXACT component against fixtures —
  // the demo has to be the real flow, not a lookalike, and it must not
  // read or write a live business's data. Defaults live below, so
  // nothing that renders this today changes at all.
  loadSlots?: (service: Service) => Promise<Record<string, Slot[]>>;
  // Where the confirmation's "Ver, cambiar o cancelar mi cita" goes.
  // Defaults to the tenant's own subdomain URL for that booking; the
  // demo overrides it because that URL would 404 for a business that
  // doesn't exist, and a dead link on the last screen of a demo is the
  // worst possible place to have one.
  manageUrl?: string;
  onSubmitBooking?: (payload: {
    resourceId: string;
    service: Service;
    slot: Slot;
    customer: CustomerFields;
  }) => Promise<{ ok: true; bookingId: string } | { ok: false; error: string }>;
};

// Un recurso SIN restricción guardada da todos los servicios. Esa es la
// regla de db/032: la ausencia de filas es la restricción vacía, no la
// prohibición total — si fuera al revés, la migración le apagaría la
// agenda a todos los negocios que ya existen.
function puedeDar(r: Resource, serviceId: string): boolean {
  return !r.service_ids?.length || r.service_ids.includes(serviceId);
}

export default function BookingFlow({
  slug,
  businessName = 'este negocio',
  services,
  resources,
  accentColor = '#8FE24A',
  timezone,
  resourceLabel,
  resourceQuestion,
  location,
  loadSlots,
  onSubmitBooking,
  manageUrl,
}: Props) {
  // "Profesional" is the fallback, not a value a business picked. The
  // difference matters one place below: a salon that never configured
  // anything keeps reading "¿Con quién prefieres reservar?", which is
  // friendlier than the generic phrasing — but a padel court that set
  // "Cancha" must not be asked "¿con quién?" about a slab of concrete.
  const label = resourceLabel?.trim() || 'Profesional';
  const hasOwnLabel = Boolean(resourceLabel?.trim());

  // Tres niveles, del mas especifico al mas generico: la frase que
  // escribio el negocio, la derivada de su sustantivo, y la de
  // siempre. Derivar gramatica de un sustantivo ajeno es adivinar
  // —genero, preposicion, y si eso que reservan es alguien o algo—
  // asi que el negocio puede escribirla y ya.
  const resourceHeading =
    resourceQuestion?.trim() ||
    (hasOwnLabel ? `¿Qué ${label.toLowerCase()} prefieres?` : '¿Con quién prefieres reservar?');

  const [stepIndex, setStepIndex] = useState(0);
  const [service, setService] = useState<Service | null>(null);
  const [resourceChoice, setResourceChoice] = useState<ResourceChoice | null>(
    resources.length === 1 ? resources[0].id : null
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [customer, setCustomer] = useState<CustomerFields>({ name: '', phone: '', email: '', notes: '' });

  // Quien puede dar el servicio elegido (db/032). Sin servicio elegido
  // todavía, son todos.
  const bookableServices = useMemo(
    () => services.filter((s) => resources.some((r) => puedeDar(r, s.id))),
    [services, resources]
  );

  const eligible = useMemo(
    () => (service ? resources.filter((r) => puedeDar(r, service.id)) : resources),
    [resources, service]
  );

  const steps = useMemo(() => stepsFor(eligible.length, label), [eligible.length, label]);

  const [slotsByResource, setSlotsByResource] = useState<Record<string, Slot[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showAllTimes, setShowAllTimes] = useState(false);
  const [showFormErrors, setShowFormErrors] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[stepIndex]?.id ?? 'service';
  const today = dayKey(new Date(), timezone);

  // ── availability ──────────────────────────────────────────────────
  const loadAvailability = useCallback(
    async (svc: Service) => {
      setLoading(true);
      setLoadError(null);

      // Injected source (the demo) short-circuits the whole Supabase
      // path — including the client creation, so a page with no
      // Supabase keys configured can still run this flow.
      if (loadSlots) {
        try {
          const bySource = await loadSlots(svc);
          setLoading(false);
          setSlotsByResource(bySource);
        } catch {
          setLoading(false);
          setLoadError('No pudimos cargar los horarios.');
        }
        return;
      }

      const supabase = createClient();
      const from = dayKey(new Date(), timezone);
      const to = addDaysKey(from, 60);

      // One call per resource, in parallel. The old flow asked for a
      // single resource's slots, which is why "cualquiera" couldn't exist.
      const results = await Promise.all(
        eligible.map(async (r) => {
          const { data, error } = await supabase.rpc('get_available_slots', {
            p_resource_id: r.id,
            p_service_type_id: svc.id,
            p_from: from,
            p_to: to,
          });
          return { id: r.id, slots: (data as Slot[]) ?? [], error };
        })
      );

      setLoading(false);
      if (results.every((r) => r.error)) {
        setLoadError('No pudimos cargar los horarios.');
        return;
      }
      setSlotsByResource(Object.fromEntries(results.map((r) => [r.id, r.slots])));
    },
    [eligible, timezone, loadSlots]
  );

  // Slots for the current choice. For "cualquiera" it's the union across
  // resources, deduped by start time — two free stylists at 15:30 is one
  // appointment offered, not two identical buttons.
  const activeSlots = useMemo(() => {
    if (!resourceChoice) return [] as Slot[];
    if (resourceChoice !== ANY_RESOURCE) return slotsByResource[resourceChoice] ?? [];
    const seen = new Map<string, Slot>();
    for (const list of Object.values(slotsByResource)) {
      for (const s of list) if (!seen.has(s.slot_start)) seen.set(s.slot_start, s);
    }
    return [...seen.values()].sort((a, b) => a.slot_start.localeCompare(b.slot_start));
  }, [resourceChoice, slotsByResource]);

  const availableDayKeys = useMemo(() => {
    const set = new Set<string>();
    for (const s of activeSlots) set.add(dayKey(s.slot_start, timezone));
    return set;
  }, [activeSlots, timezone]);

  const slotsForDay = useMemo(
    () => (selectedDay ? activeSlots.filter((s) => dayKey(s.slot_start, timezone) === selectedDay) : []),
    [activeSlots, selectedDay, timezone]
  );

  const stripDays: StripDay[] = useMemo(() => {
    const out: StripDay[] = [];
    for (let i = 0; i < STRIP_DAYS; i++) {
      const key = addDaysKey(today, i);
      // Noon avoids the DST edge where midnight doesn't exist.
      const date = new Date(`${key}T12:00:00Z`);
      out.push({
        key,
        weekday: new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' }).format(date).replace('.', ''),
        dayNumber: String(Number(key.slice(8, 10))),
        available: availableDayKeys.has(key),
        isToday: i === 0,
      });
    }
    return out;
  }, [today, availableDayKeys]);

  const nextAvailableDay = useMemo(() => {
    const sorted = [...availableDayKeys].sort();
    return sorted.find((k) => !selectedDay || k > selectedDay) ?? null;
  }, [availableDayKeys, selectedDay]);

  // Soonest three, then the rest by part of the day. Not called
  // "recomendados": there is no ranking data behind it, and a label that
  // implies one would be a claim the product can't back.
  const timeGroups = useMemo(() => {
    if (slotsForDay.length === 0) return [];
    const groups: { label: string; slots: Slot[] }[] = [];
    if (slotsForDay.length > INITIAL_SLOTS_SHOWN) {
      groups.push({ label: 'Más pronto', slots: slotsForDay.slice(0, 3) });
    }
    const rest = slotsForDay.length > INITIAL_SLOTS_SHOWN ? slotsForDay.slice(3) : slotsForDay;
    const buckets: Record<string, Slot[]> = { Mañana: [], Tarde: [], Noche: [] };
    for (const s of rest) {
      const hour = Number(formatTime(s.slot_start, timezone).slice(0, 2));
      buckets[hour < 12 ? 'Mañana' : hour < 19 ? 'Tarde' : 'Noche'].push(s);
    }
    for (const [label, slots] of Object.entries(buckets)) {
      if (slots.length > 0) groups.push({ label, slots });
    }
    return groups;
  }, [slotsForDay, timezone]);

  const visibleGroups = useMemo(() => {
    if (showAllTimes) return timeGroups;
    let budget = INITIAL_SLOTS_SHOWN;
    const out: { label: string; slots: Slot[] }[] = [];
    for (const g of timeGroups) {
      if (budget <= 0) break;
      out.push({ label: g.label, slots: g.slots.slice(0, budget) });
      budget -= Math.min(budget, g.slots.length);
    }
    return out;
  }, [timeGroups, showAllTimes]);

  const hiddenCount = slotsForDay.length - visibleGroups.reduce((n, g) => n + g.slots.length, 0);

  // ── navigation ────────────────────────────────────────────────────
  const goTo = useCallback((id: StepId) => {
    setStepIndex(steps.findIndex((s) => s.id === id));
    requestAnimationFrame(() => scrollRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }, [steps]);

  function handleService(svc: Service) {
    const changed = svc.id !== service?.id;
    setService(svc);
    if (changed) {
      // A different service means different durations, so every slot
      // computed for the old one is meaningless. The resource choice
      // survives — it's still the same person or room.
      setSelectedSlot(null);
      setSelectedDay(null);
      setSlotsByResource({});
      loadAvailability(svc);
    }
  }

  function handleResource(choice: ResourceChoice) {
    setResourceChoice(choice);
    // The day survives if that resource still has something free on it;
    // only the exact time is always re-asked, since it's per resource.
    setSelectedSlot(null);
  }

  function handleDay(key: string) {
    setSelectedDay(key);
    setSelectedSlot(null);
    setShowAllTimes(false);
  }

  // Keep a day that stopped being available after another choice changed.
  useEffect(() => {
    if (selectedDay && availableDayKeys.size > 0 && !availableDayKeys.has(selectedDay)) {
      setSelectedDay(null);
      setSelectedSlot(null);
    }
  }, [availableDayKeys, selectedDay]);

  // Warn before leaving with data typed in. Only once there IS something
  // to lose — a confirm dialog on an empty form is just noise.
  useEffect(() => {
    const dirty = !bookingId && (customer.name || customer.phone || selectedSlot);
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [customer.name, customer.phone, selectedSlot, bookingId]);

  // ── summary ───────────────────────────────────────────────────────
  const resourceName =
    resourceChoice === ANY_RESOURCE
      ? `Cualquier ${label.toLowerCase()}`
      : (eligible.find((r) => r.id === resourceChoice)?.name ?? '');

  const summaryItems: SummaryItem[] = [];
  if (service) summaryItems.push({ id: 'service', label: 'servicio', value: service.name });
  if (resourceChoice && eligible.length > 1)
    summaryItems.push({ id: 'resource', label: label.toLowerCase(), value: resourceName });
  if (selectedDay && !selectedSlot)
    summaryItems.push({ id: 'date', label: 'fecha', value: longDate(`${selectedDay}T12:00:00Z`, timezone) });
  if (selectedSlot)
    summaryItems.push({ id: 'time', label: 'horario', value: appointmentWhen(selectedSlot.slot_start, timezone) });

  const sidePanelRows: { label: string; value: string }[] = [];
  if (service) {
    sidePanelRows.push({ label: 'Servicio', value: service.name });
    sidePanelRows.push({ label: 'Duración', value: formatDuration(service.duration_minutes) });
  }
  if (resourceChoice && eligible.length > 1)
    sidePanelRows.push({ label: hasOwnLabel ? label : 'Atiende', value: resourceName });
  if (selectedSlot)
    sidePanelRows.push({ label: 'Cuándo', value: appointmentWhen(selectedSlot.slot_start, timezone) });
  else if (selectedDay)
    sidePanelRows.push({ label: 'Día', value: longDate(`${selectedDay}T12:00:00Z`, timezone) });

  // ── submit ────────────────────────────────────────────────────────
  const formValid =
    customer.name.trim().length > 0 && customer.phone.replace(/\D/g, '').length >= 10;

  async function submitBooking() {
    if (!service || !selectedSlot || !resourceChoice) return;
    if (!formValid) {
      setShowFormErrors(true);
      return;
    }
    // With "cualquiera", pick a resource that actually has this exact
    // slot free. Postgres' exclusion constraint is still the last word if
    // someone else takes it in the meantime.
    const resourceId =
      resourceChoice === ANY_RESOURCE
        ? Object.entries(slotsByResource).find(([, list]) =>
            list.some((s) => s.slot_start === selectedSlot.slot_start)
          )?.[0]
        : resourceChoice;

    if (!resourceId) {
      setSubmitError('Ese horario acaba de ocuparse. Elige otro, por favor.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Injected submit (the demo) never touches /api/reservar, so a
      // visitor playing with the public demo can't land a real row in a
      // real business's calendar.
      if (onSubmitBooking) {
        const result = await onSubmitBooking({ resourceId, service, slot: selectedSlot, customer });
        setSubmitting(false);
        if (result.ok) {
          setBookingId(result.bookingId);
        } else {
          setSubmitError(result.error);
        }
        return;
      }

      const res = await fetch('/api/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          resource_id: resourceId,
          service_type_id: service.id,
          starts_at: selectedSlot.slot_start,
          ends_at: selectedSlot.slot_end,
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email || undefined,
          notes: customer.notes || undefined,
        }),
      });
      const body = await res.json();
      setSubmitting(false);

      if (res.ok) {
        setBookingId(body.bookingId);
        return;
      }
      // The slot went while they were typing: reload, drop it, and send
      // them back to pick again instead of leaving a dead button.
      setSelectedSlot(null);
      await loadAvailability(service);
      setSubmitError(body.error ?? 'No se pudo agendar la cita.');
      goTo('time');
    } catch {
      setSubmitting(false);
      setSubmitError('Se cayó la conexión. Revisa tu internet e inténtalo otra vez.');
    }
  }

  function resetFlow() {
    setStepIndex(0);
    setService(null);
    setResourceChoice(eligible.length === 1 ? eligible[0].id : null);
    setSelectedDay(null);
    setSelectedSlot(null);
    setCustomer({ name: '', phone: '', email: '', notes: '' });
    setSlotsByResource({});
    setBookingId(null);
    setSubmitError(null);
    setShowFormErrors(false);
  }

  function googleCalendarUrl() {
    if (!selectedSlot || !service) return '#';
    const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${service.name} — ${businessName}`,
      dates: `${stamp(selectedSlot.slot_start)}/${stamp(selectedSlot.slot_end)}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  // ── confirmation ──────────────────────────────────────────────────
  if (bookingId && service && selectedSlot) {
    return (
      <div className="overflow-hidden border-y border-border bg-surface sm:rounded-3xl sm:border sm:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.14)]">
        <ConfirmationScreen
          businessName={businessName}
          service={service}
          when={appointmentWhen(selectedSlot.slot_start, timezone)}
          resourceName={resourceName}
          showResource={eligible.length > 1}
          location={location}
          bookingId={bookingId}
          manageUrl={manageUrl ?? tenantManageBookingUrl(slug, bookingId)}
          calendarUrl={googleCalendarUrl()}
          emailed={Boolean(customer.email)}
          onBookAnother={resetFlow}
        />
      </div>
    );
  }

  if (bookableServices.length === 0 || resources.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-5">
        <EmptyCatalog
          what={bookableServices.length === 0 ? 'servicios para reservar' : 'horarios configurados'}
        />
      </div>
    );
  }

  // ── per-step content and action ───────────────────────────────────
  const canContinue =
    currentStep === 'service'
      ? Boolean(service)
      : currentStep === 'resource'
        ? Boolean(resourceChoice)
        : currentStep === 'date'
          ? Boolean(selectedDay)
          : currentStep === 'time'
            ? Boolean(selectedSlot)
            : formValid;

  const missingHelper =
    currentStep === 'details' && showFormErrors && !formValid
      ? 'Falta tu nombre o un teléfono de 10 dígitos.'
      : undefined;

  const actionLabel =
    currentStep === 'details'
      ? 'Confirmar reserva'
      : currentStep === 'time' && selectedSlot
        ? 'Continuar'
        : 'Continuar';

  function onAction() {
    if (currentStep === 'details') {
      submitBooking();
      return;
    }
    if (stepIndex < steps.length - 1) goTo(steps[stepIndex + 1].id);
  }

  return (
    <div
      ref={scrollRef}
      className="overflow-hidden border-y border-border bg-surface sm:rounded-3xl sm:border sm:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.14)]"
    >
      <StepHeader
        businessName={businessName}
        steps={steps}
        currentIndex={stepIndex}
        canGoBack={stepIndex > 0}
        onBack={() => goTo(steps[stepIndex - 1].id)}
      />

      <SelectionSummary items={summaryItems} onEdit={goTo} />

      {/* Desktop is two columns: the step on the left, a panel on the
          right that keeps the booking and the action in view. Below lg
          it collapses to one column and the action moves to the bar
          pinned at the bottom. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6 lg:px-6 lg:py-6">
      <div className="px-5 py-5 sm:px-6 lg:p-0">
        {currentStep === 'service' && (
          <>
            <h2 className="text-base font-semibold text-ink">Elige un servicio</h2>
            <p className="mt-1 text-[13px] text-muted">
              Después eliges cuándo. Puedes cambiarlo en cualquier momento.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              {bookableServices.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  selected={service?.id === s.id}
                  onSelect={() => handleService(s)}
                />
              ))}
            </div>
          </>
        )}

        {currentStep === 'resource' && (
          <>
            <h2 className="text-base font-semibold text-ink">
              {resourceHeading}
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Si te da igual, elige cualquiera: vas a ver más horarios libres.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <ResourceCard
                name={`Cualquier ${label.toLowerCase()} disponible`}
                meta="La opción con más horarios"
                recommended
                selected={resourceChoice === ANY_RESOURCE}
                onSelect={() => handleResource(ANY_RESOURCE)}
              />
              {eligible.map((r) => {
                const slots = slotsByResource[r.id] ?? [];
                const next = slots[0];
                return (
                  <ResourceCard
                    key={r.id}
                    name={r.name}
                    meta={
                      loading
                        ? 'Buscando horarios…'
                        : next
                          ? `Libre desde el ${longDate(next.slot_start, timezone)}`
                          : 'Sin horarios en los próximos 60 días'
                    }
                    selected={resourceChoice === r.id}
                    onSelect={() => handleResource(r.id)}
                  />
                );
              })}
            </div>
          </>
        )}

        {currentStep === 'date' && (
          <>
            <h2 className="text-base font-semibold text-ink">¿Qué día te acomoda?</h2>
            <p className="mt-1 text-[13px] text-muted">
              Solo aparecen los días con horarios libres.
            </p>
            <div className="mt-4">
              {loading ? (
                <LoadingSlots label="Revisando la agenda" />
              ) : loadError ? (
                <ErrorState
                  title="No pudimos cargar la agenda"
                  message={loadError}
                  onRetry={() => service && loadAvailability(service)}
                />
              ) : availableDayKeys.size === 0 ? (
                <EmptyCatalog what="horarios libres en los próximos dos meses" />
              ) : (
                <DateStrip
                  days={stripDays}
                  selectedKey={selectedDay}
                  onSelect={handleDay}
                  onOpenCalendar={() => setCalendarOpen(true)}
                />
              )}
            </div>
          </>
        )}

        {currentStep === 'time' && (
          <>
            <h2 className="text-base font-semibold text-ink">Elige tu horario</h2>
            <p className="mt-1 text-[13px] text-muted">
              {selectedDay ? longDate(`${selectedDay}T12:00:00Z`, timezone) : ''}
            </p>
            <div className="mt-4">
              {loading ? (
                <LoadingSlots />
              ) : slotsForDay.length === 0 ? (
                <NoSlotsState
                  nextDayLabel={nextAvailableDay ? longDate(`${nextAvailableDay}T12:00:00Z`, timezone) : null}
                  onNextDay={() => nextAvailableDay && handleDay(nextAvailableDay)}
                  onBackToDates={() => goTo('date')}
                  onAnyResource={
                    eligible.length > 1 && resourceChoice !== ANY_RESOURCE
                      ? () => {
                          handleResource(ANY_RESOURCE);
                          goTo('time');
                        }
                      : undefined
                  }
                />
              ) : (
                <>
                  {visibleGroups.map((group) => (
                    <TimeGroup key={group.label} label={group.label} count={group.slots.length}>
                      {group.slots.map((slot) => (
                        <TimeSlot
                          key={slot.slot_start}
                          label={formatTime(slot.slot_start, timezone)}
                          state={selectedSlot?.slot_start === slot.slot_start ? 'selected' : 'available'}
                          onSelect={() => setSelectedSlot(slot)}
                        />
                      ))}
                    </TimeGroup>
                  ))}
                  <ShowMore hidden={hiddenCount} onClick={() => setShowAllTimes(true)} />
                </>
              )}
            </div>
          </>
        )}

        {currentStep === 'details' && service && selectedSlot && (
          <div className="flex flex-col gap-4">
            <BookingSummary
              service={service}
              resourceName={resourceName}
              when={appointmentWhen(selectedSlot.slot_start, timezone)}
              location={location}
              onEdit={goTo}
              showResourceRow={eligible.length > 1}
            />
            {submitError && (
              <ErrorState
                title="No se pudo confirmar"
                message={submitError}
                onRetry={() => setSubmitError(null)}
                retryLabel="Entendido"
              />
            )}
            <CustomerForm
              values={customer}
              onChange={(next) => setCustomer((c) => ({ ...c, ...next }))}
              showErrors={showFormErrors}
            />
          </div>
        )}
      </div>

        <SidePanel
          rows={sidePanelRows}
          total={service ? publicPrice(service) || undefined : undefined}
          helper={missingHelper}
          actionLabel={actionLabel}
          onAction={onAction}
          disabled={!canContinue && currentStep !== 'details'}
          loading={submitting}
          footnote={
            currentStep === 'details'
              ? 'Puedes cambiar o cancelar tu cita después, desde el enlace que te llega.'
              : undefined
          }
        />
      </div>

      <div className="lg:hidden">
      <StickyActionBar
        hint={
          currentStep === 'details' && service && selectedSlot
            ? `${formatTime(selectedSlot.slot_start, timezone)} · ${service.name}`
            : undefined
        }
        helper={missingHelper}
        actionLabel={actionLabel}
        onAction={onAction}
        disabled={!canContinue && currentStep !== 'details'}
        loading={submitting}
      />
      </div>

      <CalendarSheet
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selected={selectedDay ? new Date(`${selectedDay}T12:00:00`) : undefined}
        onSelect={(date) => date && handleDay(format(date, 'yyyy-MM-dd'))}
        availableDateKeys={availableDayKeys}
        accentColor={accentColor}
        onToday={() => handleDay(today)}
      />
    </div>
  );
}
