// A small curated set, not free text — a font name coming from the DB
// gets used to build a Google Fonts URL at runtime, so it has to be
// validated against a known-safe list rather than trusted directly.
export const FONT_OPTIONS = {
  inter: { label: 'Inter — moderna, geométrica', family: 'Inter', googleParam: 'Inter:wght@400;500;600;700' },
  playfair: {
    label: 'Playfair Display — elegante, lujo',
    family: 'Playfair Display',
    googleParam: 'Playfair+Display:wght@400;600;700',
  },
  poppins: { label: 'Poppins — redondeada, amigable', family: 'Poppins', googleParam: 'Poppins:wght@400;500;600;700' },
  merriweather: {
    label: 'Merriweather — seria, corporativa',
    family: 'Merriweather',
    googleParam: 'Merriweather:wght@400;700',
  },
} as const;

export type FontKey = keyof typeof FONT_OPTIONS;

export function isFontKey(value: string): value is FontKey {
  return value in FONT_OPTIONS;
}

export function googleFontsHref(keys: FontKey[]) {
  const unique = Array.from(new Set(keys));
  const params = unique.map((k) => `family=${FONT_OPTIONS[k].googleParam}`).join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
