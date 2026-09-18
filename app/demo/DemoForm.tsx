'use client';

import { useState } from 'react';
import { CalendarCheck, Check, Loader2 } from 'lucide-react';
import { submitDemoRequest } from './actions';

// Every field is 16px on phones (`text-base sm:text-sm`): iOS Safari
// zooms into any input whose text is smaller than that, and a form that
// jumps on focus is the fastest way to lose a lead on a phone. Same rule
// already applied to the booking flow.
const FIELD =
  'w-full rounded-2xl border border-[#140F2E]/12 bg-white px-4 py-3 text-base text-[#140F2E] outline-none transition-shadow placeholder:text-[#6A6488]/60 focus:border-[#5B34E8] focus:ring-4 focus:ring-[#5B34E8]/15 sm:py-2.5 sm:text-sm';

const LABEL = 'mb-1.5 block text-sm font-semibold text-[#140F2E]';

const VERTICALS = [
  'Peluquería o barbería',
  'Spa o salón de belleza',
  'Consultorio (dental, médico)',
  'Gimnasio o estudio',
  'Otro',
];

export function DemoForm({ plan }: { plan?: string }) {
  const [form, setForm] = useState({
    name: '',
    business: '',
    phone: '',
    email: '',
    vertical: '',
    city: '',
    message: '',
    website: '', // honeypot
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await submitDemoRequest({ ...form, plan: plan ?? '' });
    setSubmitting(false);
    if (result.ok) {
      setDone(true);
      return;
    }
    setError(result.error);
  }

  if (done) {
    return (
      <div className="rounded-[28px] bg-white p-8 text-center ring-1 ring-[#140F2E]/[0.06] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D4F23A]">
          <Check className="h-7 w-7 text-[#140F2E]" strokeWidth={3} />
        </span>
        <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase leading-tight tracking-[-0.01em] text-[#140F2E]">
          Listo, {form.name.split(' ')[0]}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-[#6A6488]">
          Te contactamos al {form.phone} dentro de las próximas 24 horas para agendar
          la demo. Si prefieres adelantarlo, escríbenos a{' '}
          <a
            href="mailto:nonameynk@gmail.com"
            className="font-semibold text-[#5B34E8] underline-offset-4 hover:underline"
          >
            nonameynk@gmail.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] bg-white p-6 ring-1 ring-[#140F2E]/[0.06] sm:p-8"
      noValidate
    >
      {plan && (
        <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#5B34E8]/[0.07] px-3 py-1.5 text-xs font-semibold text-[#5B34E8] ring-1 ring-inset ring-[#5B34E8]/20">
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Te interesa el plan {plan}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="demo-name">
            Tu nombre
          </label>
          <input
            id="demo-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="María Fernanda"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="demo-business">
            Tu negocio
          </label>
          <input
            id="demo-business"
            name="organization"
            type="text"
            autoComplete="organization"
            required
            value={form.business}
            onChange={(e) => set('business', e.target.value)}
            placeholder="Studio Bella"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="demo-phone">
            Teléfono / WhatsApp
          </label>
          <input
            id="demo-phone"
            name="tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="618 123 4567"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="demo-email">
            Correo
          </label>
          <input
            id="demo-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="maria@studiobella.mx"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL} htmlFor="demo-vertical">
            Giro
          </label>
          <select
            id="demo-vertical"
            value={form.vertical}
            onChange={(e) => set('vertical', e.target.value)}
            className={FIELD}
          >
            <option value="">Elige uno</option>
            {VERTICALS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL} htmlFor="demo-city">
            Ciudad
          </label>
          <input
            id="demo-city"
            name="city"
            type="text"
            autoComplete="address-level2"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            placeholder="Durango"
            className={FIELD}
          />
        </div>
      </div>

      <div className="mt-5">
        <label className={LABEL} htmlFor="demo-message">
          ¿Cómo agendas hoy? <span className="font-normal text-[#6A6488]">(opcional)</span>
        </label>
        <textarea
          id="demo-message"
          rows={3}
          value={form.message}
          onChange={(e) => set('message', e.target.value)}
          placeholder="Por WhatsApp, y se me encima con las citas del sábado."
          className={FIELD}
        />
      </div>

      {/* Honeypot: off-screen rather than display:none, since some bots
          skip hidden inputs. Never announced to screen readers, never
          reachable by keyboard. */}
      <div className="absolute left-[-9999px] top-0" aria-hidden="true">
        <label htmlFor="demo-website">No llenar</label>
        <input
          id="demo-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => set('website', e.target.value)}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-[#FDE8E8] px-4 py-3 text-sm leading-relaxed text-[#8E1B1B]"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5B34E8] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#4423C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8] focus-visible:ring-offset-2 disabled:opacity-70 sm:w-auto sm:px-8"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {submitting ? 'Enviando' : 'Agendar mi demo'}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-[#6A6488]">
        Usamos tus datos solo para contactarte por esta demo. Nada de listas de correo.
      </p>
    </form>
  );
}
