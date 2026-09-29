// The page's pictures. Every one of them is DRAWN FROM THE POST IT SITS
// ON — the repeated WhatsApp question, the receipt, the agenda with a
// hole in it. None of them is a stock photo, an icon from a set, or a
// gradient blob.
//
// That is the whole rule here, and it is not aesthetic purism: a stock
// photo of a smiling stranger on a post about a real salon implies those
// are that salon's customers, and a generic icon says nothing the heading
// did not already say. These scenes are the content one level more
// literal, so a person scrolling past on a phone understands the post
// before reading a word.
//
// All of them are inline SVG on a `viewBox` with no fixed size, so they
// scale with their container and stay crisp; all are aria-hidden, because
// the heading beside them already carries the meaning.

const INK = '#141024';
const VIOLET = '#3B00FF';

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="h-full w-full"
    >
      {children}
    </svg>
  );
}

// 1 · The same question, over and over. This is the page's thesis made
// literal: five identical incoming bubbles, one after another, and a
// single reply. The repetition IS the picture — which is why the bubbles
// are identical rather than varied.
function RepeatedQuestion() {
  const rows = [0, 1, 2, 3];
  return (
    <Frame>
      {rows.map((i) => (
        <g key={i} opacity={1 - i * 0.18}>
          <rect x="18" y={18 + i * 34} width="132" height="24" rx="12" fill={INK} opacity="0.08" />
          <rect x="30" y={26 + i * 34} width="78" height="4" rx="2" fill={INK} opacity="0.35" />
          <rect x="30" y={34 + i * 34} width="52" height="4" rx="2" fill={INK} opacity="0.2" />
        </g>
      ))}
      {/* One answer, in the accent — the point of the post is that you
          write it once. */}
      <rect x="168" y="86" width="134" height="52" rx="14" fill={VIOLET} />
      <rect x="182" y="102" width="92" height="5" rx="2.5" fill="#fff" opacity="0.95" />
      <rect x="182" y="114" width="64" height="5" rx="2.5" fill="#fff" opacity="0.6" />
      <circle cx="292" cy="152" r="5" fill={VIOLET} opacity="0.25" />
    </Frame>
  );
}

// 2 · A receipt, and the one number that matters on it pulled out. The
// post is about replacing a form with a photo, so the picture is the
// photo.
function ReceiptToNumber() {
  return (
    <Frame>
      <rect x="22" y="24" width="112" height="152" rx="8" fill="#fff" stroke={INK} strokeOpacity="0.14" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x="36" y={44 + i * 18} width={i % 3 === 0 ? 70 : 84} height="4" rx="2" fill={INK} opacity="0.18" />
      ))}
      {/* The line the machine actually reads. */}
      <rect x="36" y="152" width="58" height="9" rx="3" fill={VIOLET} opacity="0.85" />

      {/* The hand-off: receipt in, number out. */}
      <path d="M148 100 H182" stroke={INK} strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" />
      <path d="M176 94 L184 100 L176 106" stroke={INK} strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <rect x="196" y="66" width="104" height="68" rx="12" fill={VIOLET} />
      <rect x="212" y="86" width="44" height="10" rx="4" fill="#fff" />
      <rect x="212" y="104" width="72" height="5" rx="2.5" fill="#fff" opacity="0.6" />
    </Frame>
  );
}

// 3 · A month. Eight days marked, which is exactly the number the post
// tells you to sit down and write — not a decorative calendar.
function EightDays() {
  const marked = new Set([2, 5, 9, 12, 16, 19, 23, 26]);
  return (
    <Frame>
      {Array.from({ length: 28 }).map((_, i) => {
        const col = i % 7;
        const row = Math.floor(i / 7);
        const x = 30 + col * 38;
        const y = 34 + row * 38;
        return marked.has(i) ? (
          <rect key={i} x={x} y={y} width="26" height="26" rx="8" fill={VIOLET} />
        ) : (
          <rect key={i} x={x} y={y} width="26" height="26" rx="8" fill={INK} opacity="0.07" />
        );
      })}
    </Frame>
  );
}

// 4 · Visits over time, and then nothing. The gap is the subject of the
// post, so the gap is the largest thing in the picture.
function TheGap() {
  const bars = [46, 62, 54, 70, 58, 66];
  return (
    <Frame>
      {bars.map((h, i) => (
        <rect key={i} x={26 + i * 30} y={150 - h} width="18" height={h} rx="5" fill={INK} opacity="0.16" />
      ))}
      {/* Where they stopped coming. Dashed, because nothing happened —
          drawing a bar of zero height would say the opposite. */}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={206 + i * 30}
          y="138"
          width="18"
          height="12"
          rx="5"
          fill="none"
          stroke={VIOLET}
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeDasharray="3 3"
        />
      ))}
      <path d="M22 150 H302" stroke={INK} strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
      <circle cx="215" cy="114" r="4" fill={VIOLET} />
      <path d="M215 118 V134" stroke={VIOLET} strokeWidth="2" strokeLinecap="round" />
    </Frame>
  );
}

// 5 · The honest one. A process that is understood goes through; one
// that lives in somebody's head does not. Two paths, one stopped — no
// warning triangle, no red, because the post is advice and not an error.
function StoppedPath() {
  return (
    <Frame>
      <g>
        <rect x="24" y="44" width="58" height="32" rx="10" fill={INK} opacity="0.1" />
        <path d="M90 60 H124" stroke={INK} strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
        <rect x="132" y="44" width="58" height="32" rx="10" fill={INK} opacity="0.1" />
        <path d="M198 60 H232" stroke={INK} strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
        <rect x="240" y="44" width="58" height="32" rx="10" fill={VIOLET} />
      </g>
      <g>
        <rect x="24" y="126" width="58" height="32" rx="10" fill={INK} opacity="0.1" />
        <path d="M90 142 H124" stroke={INK} strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
        <rect
          x="132"
          y="126"
          width="58"
          height="32"
          rx="10"
          fill="none"
          stroke={INK}
          strokeOpacity="0.25"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        {/* The path simply stops. */}
        <path d="M198 142 H214" stroke={INK} strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M232 132 L252 152 M252 132 L232 152"
          stroke={VIOLET}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>
    </Frame>
  );
}

const SCENES = {
  repeated: RepeatedQuestion,
  receipt: ReceiptToNumber,
  calendar: EightDays,
  gap: TheGap,
  stopped: StoppedPath,
} as const;

export type SceneKey = keyof typeof SCENES;

export function PostScene({ scene, className = '' }: { scene: SceneKey; className?: string }) {
  const Scene = SCENES[scene];
  return (
    <div className={`overflow-hidden rounded-2xl bg-[#EAEAF3] ${className}`}>
      <Scene />
    </div>
  );
}

// THE HERO. The same four-bubble stack as post #1, but at the scale of
// the page's opening statement — because the headline says "la pregunta
// que te hacen diez veces al día" and this is that sentence, drawn.
//
// It is the one place this page raises its voice. Everything below is
// quiet on purpose so that this lands.
export function HeroThread({ className = '' }: { className?: string }) {
  const bubbles = [
    '¿A qué hora abren hoy?',
    '¿Cuánto cuesta el corte?',
    '¿Aceptan tarjeta?',
    '¿A qué hora abren hoy?',
  ];

  return (
    <div
      className={`rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(20,16,36,0.05),0_24px_50px_-28px_rgba(20,16,36,0.45)] ring-1 ring-[#141024]/[0.07] sm:p-6 ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[#141024]/[0.08] pb-3">
        <span className="h-2 w-2 rounded-full bg-[#3B00FF]" aria-hidden="true" />
        <p className="text-[13px] font-medium text-[#141024]/55">Tu WhatsApp, cualquier martes</p>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {bubbles.map((text, i) => (
          <li key={i} className="flex">
            <span
              className="max-w-[85%] rounded-2xl rounded-bl-md bg-[#F0F0F6] px-4 py-2.5 text-[14px] leading-snug text-[#141024]/80"
              /* The list is the point, so the repetition is not faded
                 out — a reader has to feel the fourth one arrive. */
            >
              {text}
            </span>
          </li>
        ))}
        <li className="flex justify-end">
          <span className="max-w-[85%] rounded-2xl rounded-br-md bg-[#3B00FF] px-4 py-2.5 text-[14px] font-medium leading-snug text-white">
            Abrimos 9 a 8. Corte $300. Sí, tarjeta.
          </span>
        </li>
      </ul>

      <p className="mt-4 border-t border-[#141024]/[0.08] pt-3 text-[13px] leading-relaxed text-[#141024]/55">
        Escribes esa respuesta <span className="font-semibold text-[#141024]">una vez</span>. El resto
        del martes es tuyo.
      </p>
    </div>
  );
}
