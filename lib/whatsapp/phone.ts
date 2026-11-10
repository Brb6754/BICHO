// Sin imports de servidor a propósito: lo usan también componentes de
// cliente (los botones wa.me de "Clientes que regresan").

// Mexican numbers get typed every which way: "618 123 4567",
// "6181234567", "+52 618 123 4567", and the old "521…" mobile form.
// WhatsApp wants digits only, country code included. Returns null when
// what's left can't be a number, rather than sending into the void.
export function toE164Mx(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `52${digits}`;
  // 521XXXXXXXXXX — the pre-2019 mobile prefix. Meta accepts it, but
  // normalising means the same person is one number in the log, not two.
  if (digits.length === 13 && digits.startsWith('521')) return `52${digits.slice(3)}`;
  if (digits.length === 12 && digits.startsWith('52')) return digits;
  // Anything else is either already international or unusable; only the
  // plausible lengths pass.
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}
