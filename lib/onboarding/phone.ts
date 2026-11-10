// WhatsApp del dueño en el registro: 10 dígitos de México, guardado como
// +52XXXXXXXXXX. Acepta lo que la gente escribe de verdad: espacios,
// guiones, paréntesis, +52 / 52 al frente y el viejo "521" de celulares.
export function normalizeMxWhatsapp(input: string): string | null {
  if (typeof input !== 'string' || input.length > 30) return null;
  if (/[^\d\s()+.-]/.test(input)) return null;
  let digits = input.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('521')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('52')) digits = digits.slice(2);
  if (!/^[1-9]\d{9}$/.test(digits)) return null;
  return `+52${digits}`;
}
