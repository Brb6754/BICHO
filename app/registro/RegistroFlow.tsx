'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Loader2, MailCheck, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { GIROS, giroById, type PresetService } from '@/lib/onboarding/presets';
import { slugError, slugify } from '@/lib/onboarding/slug';
import { normalizeMxWhatsapp } from '@/lib/onboarding/phone';
import { tenantShareUrl } from '@/lib/urls';
import { PLANES, PLAN_IDS, planDe, type PlanId } from '@/lib/billing/planes';
import { track } from '@vercel/analytics';
import { checkSlug, registerBusiness, resendConfirmation } from './actions';

// 16px en teléfono (`text-base sm:text-sm`): iOS hace zoom en inputs más
// chicos. Mismo criterio que DemoForm.
const FIELD =
  'w-full rounded-2xl border border-[#140F2E]/12 bg-white px-4 py-3 text-base text-[#140F2E] outline-none transition-shadow placeholder:text-[#6A6488]/60 focus:border-[#5B34E8] focus:ring-4 focus:ring-[#5B34E8]/15 sm:py-2.5 sm:text-sm';
const LABEL = 'mb-1.5 block text-sm font-semibold text-[#140F2E]';
const PRIMARY =
  'inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5B34E8] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#4423C4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8] focus-visible:ring-offset-2 disabled:opacity-60';
const SECONDARY = 'inline-flex min-h-11 items-center px-4 text-sm font-semibold text-[#6A6488] hover:text-[#140F2E]';

const DAYS = [
  { d: 1, l: 'Lu' },
  { d: 2, l: 'Ma' },
  { d: 3, l: 'Mi' },
  { d: 4, l: 'Ju' },
  { d: 5, l: 'Vi' },
  { d: 6, l: 'Sá' },
  { d: 0, l: 'Do' },
];

const STEPS = ['Tu negocio', 'Servicios', 'Horario', 'Tu cuenta'];

type SlugState = { status: 'idle' | 'checking' | 'ok' | 'error'; message?: string };

// refCode: el ?ref= del link de referido; vive en el prop todo el flujo.
// initialPlan: el ?plan= del botón de precios de la landing.
export function RegistroFlow({ refCode, initialPlan }: { refCode?: string; initialPlan?: string } = {}) {
  const [plan, setPlan] = useState<PlanId>(planDe(initialPlan) ?? 'negocio');
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [giro, setGiro] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [services, setServices] = useState<PresetService[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [opens, setOpens] = useState('10:00');
  const [closes, setCloses] = useState('19:00');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | string>('idle');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [doneSlug, setDoneSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Disponibilidad del slug con debounce: el formato se valida local al
  // instante (derivado) y la base solo cuando el usuario deja de escribir.
  const [remote, setRemote] = useState<{ slug: string; error: string | null; sugerencia?: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const localError = slug ? slugError(slug) : null;
  const slugState: SlugState = !slug
    ? { status: 'idle' }
    : localError
      ? { status: 'error', message: localError }
      : remote?.slug !== slug
        ? { status: 'checking' }
        : remote.error
          ? { status: 'error', message: remote.error }
          : { status: 'ok' };

  useEffect(() => {
    if (!slug || slugError(slug)) return;
    const t = setTimeout(async () => {
      try {
        const r = await checkSlug(slug);
        setRemote(r.ok ? { slug, error: null } : { slug, error: r.error, sugerencia: r.sugerencia });
      } catch {
        // Sin señal no se traba el paso: al crear la cuenta se vuelve a revisar.
        setRemote({ slug, error: null });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [slug]);

  function pickGiro(id: string) {
    const g = giroById(id)!;
    setGiro(id);
    // La plantilla precarga servicios y horario; el dueño los edita después.
    setServices(g.services.map((s) => ({ ...s })));
    setDays(g.days);
    setOpens(g.opens);
    setCloses(g.closes);
  }

  function onName(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function updateService(i: number, patch: Partial<PresetService>) {
    setServices((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  // El aviso sale abajo, junto al botón; el cursor va al campo que hay que
  // arreglar para que en el teléfono no tenga que buscarlo.
  function fail(message: string, fieldId?: string) {
    setError(message);
    if (fieldId) requestAnimationFrame(() => document.getElementById(fieldId)?.focus());
  }

  // Al cambiar de paso, arriba del formulario (no de la página: el título
  // morado empujaba los campos a media pantalla).
  function goToStep(n: number) {
    setError(null);
    setStep(n);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function next() {
    setError(null);
    if (step === 0) {
      if (name.trim().length < 2) return fail('Escribe el nombre de tu negocio.', 'reg-name');
      if (!giro) return fail('Elige a qué se dedica tu negocio.', `reg-giro-${GIROS[0].id}`);
      if (slugState.status === 'checking') return fail('Estamos revisando si tu link está libre. Espera un segundo.');
      if (slugState.status !== 'ok') return fail(slugState.message ?? 'Revisa tu link.', 'reg-slug');
    }
    if (step === 1) {
      if (!services.length) return fail('Agrega al menos un servicio.');
      const bad = services.findIndex((s) => !s.name.trim() || !(s.minutes >= 5) || !(s.priceMxn >= 0));
      if (bad >= 0) {
        return fail('A este servicio le falta el nombre, los minutos (5 o más) o el precio.', `reg-serv-${bad}`);
      }
    }
    if (step === 2) {
      if (!days.length) return fail('Elige al menos un día que abras.', 'reg-day-1');
      if (opens >= closes) return fail('La hora de cierre tiene que ser después de la de apertura.', 'reg-closes');
    }
    goToStep(step + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!normalizeMxWhatsapp(whatsapp)) return fail('Tu WhatsApp debe tener 10 dígitos, por ejemplo 618 123 4567.', 'reg-whatsapp');
    if (password.length < 10) return fail('La contraseña debe tener al menos 10 caracteres.', 'reg-password');
    setSubmitting(true);
    let r: Awaited<ReturnType<typeof registerBusiness>>;
    try {
      r = await registerBusiness({
        name,
        giro,
        slug,
        services: services.map((s) => ({ name: s.name.trim(), minutes: Math.round(s.minutes), priceMxn: s.priceMxn })),
        days,
        opens,
        closes,
        email,
        whatsapp,
        password,
        website,
        ref: refCode,
        plan,
      });
    } catch {
      // Sin señal la llamada truena; antes el botón se quedaba girando para siempre.
      setSubmitting(false);
      return setError('No pudimos conectar. Revisa tu internet e intenta de nuevo; lo que escribiste sigue aquí.');
    }
    setSubmitting(false);
    if (!r.ok) {
      // Un link que se ocupó mientras llenaba: regresarla al paso 1.
      if (/link/.test(r.error)) {
        goToStep(0);
        return fail(r.error, 'reg-slug');
      }
      return setError(r.error);
    }
    setPassword('');
    track('alta_completada', { plan });
    setDoneSlug(r.slug);
  }

  if (doneSlug) {
    const url = tenantShareUrl(doneSlug);
    const dashboardUrl = `${url}/dashboard`;
    const wa = `https://wa.me/?text=${encodeURIComponent(`¡Ya puedes agendar tu cita en ${name.trim()} en línea! ${url}`)}`;
    return (
      <div className="rounded-[28px] bg-white p-6 text-center ring-1 ring-[#140F2E]/[0.06] sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D4F23A]">
          <Check className="h-7 w-7 text-[#140F2E]" strokeWidth={3} aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-extrabold uppercase leading-tight text-[#140F2E]">
          Tu página está lista
        </h2>
        <div className="mx-auto mt-4 max-w-sm rounded-2xl bg-[#F4F1FF] px-4 py-4 text-left">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-[#140F2E]">
            <MailCheck className="h-5 w-5 shrink-0 text-[#5B34E8]" aria-hidden="true" />
            Te mandamos un correo para confirmar tu cuenta
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[#6A6488]">
            Ábrelo en <span className="font-semibold text-[#140F2E]">{email.trim()}</span> y toca «Confirmar mi correo» para entrar a tu panel. Revisa también spam.
          </p>
          <button
            type="button"
            disabled={resend === 'sending' || resend === 'sent'}
            onClick={async () => {
              setResend('sending');
              try {
                const r = await resendConfirmation(doneSlug, email);
                setResend(r.ok ? 'sent' : (r.error ?? 'No se pudo reenviar.'));
              } catch {
                setResend('No pudimos conectar. Revisa tu internet e intenta de nuevo.');
              }
            }}
            className="mt-1 min-h-11 text-sm font-semibold text-[#5B34E8] underline-offset-4 hover:underline disabled:no-underline disabled:opacity-70"
          >
            {resend === 'sending' ? 'Reenviando…' : resend === 'sent' ? 'Listo, te lo volvimos a mandar' : '¿No te llegó? Reenviar correo'}
          </button>
          {resend !== 'idle' && resend !== 'sending' && resend !== 'sent' && (
            <p role="alert" className="mt-1 text-xs text-[#8E1B1B]">{resend}</p>
          )}
        </div>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-[#6A6488]">
          Tu página ya se puede compartir. Tienes 15 días de prueba gratis, sin tarjeta.
        </p>
        <dl className="mt-6 space-y-2 text-left">
          <div className="rounded-2xl bg-[#F4F1FF] px-4 py-3">
            <dt className="text-xs font-semibold text-[#6A6488]">Tu página de reservas (compártela)</dt>
            <dd className="break-all text-sm font-semibold text-[#5B34E8]">{url}</dd>
          </div>
          <div className="rounded-2xl bg-[#F4F1FF] px-4 py-3">
            <dt className="text-xs font-semibold text-[#6A6488]">Tu panel, donde ves tus citas (guárdalo en favoritos)</dt>
            <dd className="break-all text-sm font-semibold text-[#5B34E8]">{dashboardUrl}</dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={PRIMARY}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            {copied ? '¡Copiado!' : 'Copiar link'}
          </button>
          <a href={wa} target="_blank" rel="noopener noreferrer" className={`${PRIMARY} !bg-[#25D366] !text-[#0B3D1F] hover:!bg-[#1EBE5B]`}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Mandar por WhatsApp
          </a>
        </div>
        <div className="mt-6 flex flex-col items-center gap-3">
          <a href={url} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
            Ver mi página
          </a>
          <a href={dashboardUrl} className={SECONDARY}>
            Ir a mi panel
          </a>
          <p className="text-xs text-[#6A6488]">Para entrar al panel primero confirma tu correo.</p>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={step === 3 ? submit : (e) => (e.preventDefault(), next())} className="relative scroll-mt-4 rounded-[28px] bg-white p-5 ring-1 ring-[#140F2E]/[0.06] sm:p-8">
      <ol className="mb-6 flex gap-1.5" aria-label="Pasos">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-[#5B34E8]' : 'bg-[#140F2E]/10'}`} />
            <span className={`mt-1.5 block text-[11px] font-semibold ${i === step ? 'text-[#140F2E]' : 'text-[#6A6488]'}`}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-5">
          <div>
            <label className={LABEL} htmlFor="reg-name">Nombre de tu negocio</label>
            <input id="reg-name" className={FIELD} value={name} onChange={(e) => onName(e.target.value)} maxLength={80} placeholder="Ej. Uñas Dafne" autoFocus />
          </div>
          <fieldset>
            <legend className={LABEL}>¿A qué se dedica?</legend>
            <div className="flex flex-wrap gap-2">
              {GIROS.map((g) => (
                <button
                  key={g.id}
                  id={`reg-giro-${g.id}`}
                  type="button"
                  onClick={() => pickGiro(g.id)}
                  aria-pressed={giro === g.id}
                  className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8] ${
                    giro === g.id ? 'bg-[#5B34E8] text-white ring-[#5B34E8]' : 'bg-white text-[#140F2E] ring-[#140F2E]/12 hover:ring-[#5B34E8]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label className={LABEL} htmlFor="reg-slug">Tu link</label>
            <p id="reg-slug-help" className="-mt-1 mb-1.5 text-xs text-[#6A6488]">Es el que vas a mandar a tus clientes. Lo armamos con el nombre; cámbialo si quieres.</p>
            <div className="flex items-center overflow-hidden rounded-2xl border border-[#140F2E]/12 focus-within:border-[#5B34E8] focus-within:ring-4 focus-within:ring-[#5B34E8]/15">
              <input
                id="reg-slug"
                className="min-w-0 flex-1 bg-white px-4 py-3 text-base text-[#140F2E] outline-none sm:py-2.5 sm:text-sm"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                }}
                maxLength={40}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="url"
                aria-describedby="reg-slug-help reg-slug-status"
                aria-invalid={slugState.status === 'error'}
              />
              <span className="shrink-0 bg-[#F4F1FF] px-3 py-3 text-sm text-[#6A6488] sm:py-2.5">.{process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'bichomx.com'}</span>
            </div>
            <p id="reg-slug-status" className={`mt-1.5 flex items-center gap-1.5 text-xs ${slugState.status === 'error' ? 'text-[#8E1B1B]' : 'text-[#6A6488]'}`} aria-live="polite">
              {slugState.status === 'checking' && (<><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Revisando si está libre…</>)}
              {slugState.status === 'ok' && (<><Check className="h-3 w-3 text-[#15803D]" aria-hidden="true" /> Está libre, es tuyo</>)}
              {slugState.status === 'error' && slugState.message}
            </p>
            {slugState.status === 'error' && remote?.slug === slug && remote.sugerencia && (
              <button
                type="button"
                onClick={() => {
                  setSlugTouched(true);
                  setSlug(remote.sugerencia!);
                }}
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#F4F1FF] px-4 text-sm font-semibold text-[#5B34E8] hover:bg-[#ECE7FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8]"
              >
                Usar «{remote.sugerencia}», que está libre
              </button>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-[#6A6488]">
            Te dejamos los servicios más comunes de tu giro. <span className="font-semibold text-[#140F2E]">Pon tus precios reales</span>: así los van a ver tus clientes. Quita los que no hagas; después puedes agregar más.
          </p>
          {services.map((s, i) => (
            <div key={i} className="rounded-2xl bg-[#F8F7FC] p-3">
              <div className="flex gap-2">
                <input id={`reg-serv-${i}`} aria-label={`Nombre del servicio ${i + 1}`} placeholder="Ej. Corte de cabello" className={FIELD} value={s.name} maxLength={80} onChange={(e) => updateService(i, { name: e.target.value })} />
                <button type="button" aria-label={`Quitar ${s.name || 'este servicio'}`} onClick={() => setServices((l) => l.filter((_, j) => j !== i))} className="flex h-12 w-11 shrink-0 items-center justify-center rounded-full text-[#6A6488] hover:bg-white hover:text-[#8E1B1B]">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-[#6A6488]">
                  Minutos
                  <input type="number" inputMode="numeric" min={5} max={600} step={5} className={`${FIELD} mt-1`} value={Number.isFinite(s.minutes) ? s.minutes : ''} onChange={(e) => updateService(i, { minutes: e.target.valueAsNumber })} />
                </label>
                <label className="text-xs font-semibold text-[#6A6488]">
                  Precio (MXN)
                  <input type="number" inputMode="decimal" min={0} max={100000} className={`${FIELD} mt-1`} value={Number.isFinite(s.priceMxn) ? s.priceMxn : ''} onChange={(e) => updateService(i, { priceMxn: e.target.valueAsNumber })} />
                </label>
              </div>
            </div>
          ))}
          {services.length < 30 && (
            <button
              type="button"
              onClick={() => {
                // Precio vacío, no 0: un 0 olvidado sale como "sin costo" en su página.
                setServices((l) => [...l, { name: '', minutes: 60, priceMxn: NaN }]);
                requestAnimationFrame(() => document.getElementById(`reg-serv-${services.length}`)?.focus());
              }}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#5B34E8]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Agregar servicio
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <fieldset>
            <legend className={LABEL}>Días que abres</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map(({ d, l }) => {
                const on = days.includes(d);
                return (
                  <button key={d} id={`reg-day-${d}`} type="button" aria-pressed={on} onClick={() => setDays((x) => (on ? x.filter((y) => y !== d) : [...x, d]))} className={`rounded-xl py-3 text-sm font-semibold ring-1 ${on ? 'bg-[#5B34E8] text-white ring-[#5B34E8]' : 'bg-white text-[#140F2E] ring-[#140F2E]/12'}`}>
                    {l}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="reg-opens">Abres</label>
              <input id="reg-opens" type="time" step={1800} className={FIELD} value={opens} onChange={(e) => setOpens(e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor="reg-closes">Cierras</label>
              <input id="reg-closes" type="time" step={1800} className={FIELD} value={closes} onChange={(e) => setCloses(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-[#6A6488]">Después puedes poner horarios distintos por día, descansos y más personas desde tu panel.</p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className={LABEL} htmlFor="reg-plan">Tu plan</label>
            <select id="reg-plan" className={FIELD} value={plan} onChange={(e) => setPlan(planDe(e.target.value) ?? 'negocio')}>
              {PLAN_IDS.map((id) => (
                <option key={id} value={id}>
                  {PLANES[id].nombre} · ${PLANES[id].precio} MXN/mes
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[#6A6488]">{PLANES[plan].resumen} Lo cambias cuando quieras desde tu panel.</p>
            <p className="mt-2 rounded-xl bg-[#F4F1FF] px-3 py-2 text-xs leading-relaxed text-[#140F2E]">
              Lo pruebas 15 días gratis y no te pedimos tarjeta: no se te cobra nada a menos que tú lo actives al terminar.
            </p>
          </div>
          <div>
            <label className={LABEL} htmlFor="reg-email">Tu correo</label>
            <input id="reg-email" type="email" autoComplete="email" className={FIELD} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} />
          </div>
          <div>
            <label className={LABEL} htmlFor="reg-whatsapp">Tu WhatsApp</label>
            <input
              id="reg-whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="618 123 4567"
              className={FIELD}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
              maxLength={20}
              aria-describedby="reg-whatsapp-help"
            />
            <p id="reg-whatsapp-help" className="mt-1.5 text-xs text-[#6A6488]">
              10 dígitos. Te escribimos solo para ayudarte con tu página y antes de que termine tu prueba.
            </p>
          </div>
          <div>
            <label className={LABEL} htmlFor="reg-password">Contraseña</label>
            <div className="relative">
              <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" className={`${FIELD} pr-12`} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} maxLength={72} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-0 px-4 text-[#6A6488]">
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-[#6A6488]">Mínimo 10 caracteres. Con esto entras a tu panel.</p>
          </div>
          <div className="absolute left-[-9999px] top-0" aria-hidden="true">
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <p className="text-xs leading-relaxed text-[#6A6488]">
            Al crear tu cuenta aceptas los <a href="/terminos" className="underline">términos</a> y el{' '}
            <a href="/privacidad" className="underline">aviso de privacidad</a>. 15 días gratis, sin tarjeta.
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-5 rounded-2xl bg-[#FDE8E8] px-4 py-3 text-sm leading-relaxed text-[#8E1B1B]">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <button type="button" className={SECONDARY} onClick={() => goToStep(step - 1)}>
            Atrás
          </button>
        ) : <span />}
        <button type="submit" disabled={submitting} className={`${PRIMARY} sm:w-auto sm:px-8`}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {step === 3 ? (submitting ? 'Creando tu página…' : 'Crear mi página') : 'Continuar'}
        </button>
      </div>
    </form>
  );
}
