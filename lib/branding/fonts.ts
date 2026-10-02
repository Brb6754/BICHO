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

  // ─── Caras de display, agregadas el 2026-10-02 ────────────────────
  // Las plantillas venian con pilas del SISTEMA en headingFont
  // (Georgia, Arial Black, 'Iowan Old Style'). Esa es la razon numero
  // uno por la que una pagina se ve, en palabras de Bruno, "hecha con
  // Google Sites": las fuentes del sistema son las que trae cualquier
  // documento, y ninguna marca se construye con ellas.
  fraunces: {
    label: 'Fraunces — serif con caracter, editorial',
    family: 'Fraunces',
    googleParam: 'Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,900',
  },
  cormorant: {
    label: 'Cormorant Garamond — fina, de lujo',
    family: 'Cormorant Garamond',
    googleParam: 'Cormorant+Garamond:wght@400;500;600;700',
  },
  dmserif: { label: 'DM Serif Display — titular con peso', family: 'DM Serif Display', googleParam: 'DM+Serif+Display' },
  oswald: { label: 'Oswald — condensada, de letrero', family: 'Oswald', googleParam: 'Oswald:wght@400;500;600;700' },
  anton: { label: 'Anton — bloque, deportiva', family: 'Anton', googleParam: 'Anton' },
  bebas: { label: 'Bebas Neue — mayusculas altas', family: 'Bebas Neue', googleParam: 'Bebas+Neue' },
  outfit: { label: 'Outfit — geometrica, limpia', family: 'Outfit', googleParam: 'Outfit:wght@400;500;600;700' },
  sora: { label: 'Sora — tecnica, moderna', family: 'Sora', googleParam: 'Sora:wght@400;500;600;700' },
  jost: { label: 'Jost — geometrica suave', family: 'Jost', googleParam: 'Jost:wght@400;500;600;700' },
  spacegrotesk: {
    label: 'Space Grotesk — grotesca con personalidad',
    family: 'Space Grotesk',
    googleParam: 'Space+Grotesk:wght@400;500;600;700',
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
