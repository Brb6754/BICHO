// Supabase Auth answers in English ("Invalid login credentials"), and
// that raw string was shown to the owner as-is. Mapped to plain Spanish
// that says what to do; anything unrecognised gets a generic line
// rather than leaking an internal message.
export function authErrorMessage(message: string | undefined, fallback: string): string | null {
  if (!message) return null;
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden.';
  if (m.includes('email not confirmed')) return 'Tu correo todavía no está confirmado. Revisa tu bandeja de entrada.';
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) {
    return 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.';
  }
  if (m.includes('fetch') || m.includes('network')) return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
  return fallback;
}

