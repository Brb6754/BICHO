'use client';

import { useId, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { subscribeToNoti } from '@/app/ia/actions';

// The one thing this page asks for. Deliberately a single field: every
// extra input is a measurable share of people who close the tab, and a
// weekly newsletter does not need a name to be sent.
//
// It does not live behind a modal, a scroll trigger or an exit-intent
// popup. Those exist to extract an address from someone who did not want
// to give it; the whole premise of this page is that the writing earns
// it. If the posts are not good enough to make someone subscribe, a
// popup is not the fix.
export function SubscribeBox({
  source,
  tone = 'light',
}: {
  /** Which post or section this box sits under, stored with the row. */
  source: string;
  tone?: 'light' | 'ink';
}) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'already'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onInk = tone === 'ink';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError(null);

    const result = await subscribeToNoti({ email, source, website });

    if (!result.ok) {
      setError(result.error);
      setState('idle');
      return;
    }
    setState(result.already ? 'already' : 'done');
    setEmail('');
  }

  if (state === 'done' || state === 'already') {
    return (
      <div
        role="status"
        className={`flex items-start gap-3 rounded-2xl px-5 py-4 ${
          onInk ? 'bg-white/10 text-white' : 'bg-[#141024] text-white'
        }`}
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3B00FF]">
          <Check className="h-3 w-3 text-white" strokeWidth={3.5} aria-hidden="true" />
        </span>
        <p className="text-[15px] leading-relaxed">
          {state === 'already'
            ? 'Ya estabas en la lista. El jueves te llega igual.'
            : 'Listo. El próximo jueves te llega la primera.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div
        className={`flex flex-col gap-2 sm:flex-row ${
          onInk ? '' : ''
        }`}
      >
        <label htmlFor={`${id}-email`} className="sr-only">
          Tu correo
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@negocio.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          /* 16px on phones: iOS Safari zooms into any field whose text is
             smaller than that the moment it is focused, which yanks the
             whole page sideways. */
          className={`min-w-0 flex-1 rounded-xl px-4 py-3.5 text-base outline-none transition sm:text-[15px] ${
            onInk
              ? 'bg-white/10 text-white ring-1 ring-inset ring-white/20 placeholder:text-white/45 focus:ring-2 focus:ring-white'
              : 'bg-white text-[#141024] ring-1 ring-inset ring-[#141024]/15 placeholder:text-[#141024]/35 focus:ring-2 focus:ring-[#3B00FF]'
          }`}
        />

        {/* Off-screen rather than display:none — there are bots that skip
            hidden inputs on purpose. tabIndex/aria-hidden keep it away
            from keyboards and screen readers. */}
        <div className="absolute left-[-9999px] top-0" aria-hidden="true">
          <label htmlFor={`${id}-website`}>No llenes esto</label>
          <input
            id={`${id}-website`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={state === 'sending'}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-semibold transition disabled:opacity-60 ${
            onInk
              ? 'bg-white text-[#141024] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
              : 'bg-[#3B00FF] text-white hover:bg-[#5B2BFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B00FF] focus-visible:ring-offset-2'
          }`}
        >
          {state === 'sending' ? 'Enviando…' : 'Quiero recibirlo'}
          {state !== 'sending' && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {error && (
        <p id={`${id}-err`} role="alert" className={`mt-2 text-sm ${onInk ? 'text-[#FFB4B4]' : 'text-[#B00020]'}`}>
          {error}
        </p>
      )}

      <p className={`mt-3 text-[13px] ${onInk ? 'text-white/55' : 'text-[#141024]/50'}`}>
        Un correo por semana. Te puedes dar de baja con un clic.
      </p>
    </form>
  );
}
