import { LabelHTMLAttributes } from 'react';

// 13 px como mínimo para información (UX-PANEL §2.8). `tone` es prop y no
// className: un text-ink extra no le gana de forma confiable al text-muted
// de la base (la trampa de className de CLAUDE.md).
const TONO = { muted: 'text-muted', ink: 'text-ink' };

export function Label({
  className = '',
  tone = 'muted',
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { tone?: keyof typeof TONO }) {
  return <label className={`mb-1 block text-[13px] font-medium ${TONO[tone]} ${className}`} {...props} />;
}
