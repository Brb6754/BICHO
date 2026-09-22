import { Lock } from 'lucide-react';

// Shown on the panel screens that would otherwise let you change
// something. The controls below it are the real ones and look exactly
// like the real ones — they just don't submit anywhere, because there
// is no business behind this to change.
//
// Said out loud rather than by disabling everything into a grey mush:
// a visitor should be able to see what the switches and buttons look
// like, and know why nothing happens when they press one.
export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 flex items-start gap-2 rounded-xl bg-ink/[0.04] px-4 py-3 text-[13px] leading-relaxed text-muted">
      <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
