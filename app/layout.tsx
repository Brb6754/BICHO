import type { Metadata } from 'next';
import { Inter, Baloo_2, Space_Grotesk, Archivo, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Display face for the bicho reservas marketing site's own headlines
// only (see components/marketing/*.tsx's
// `font-[family-name:var(--font-display)]` usage) — a bold, rounded
// geometric sans that echoes the actual logo's own rounded-bug-mascot
// character (the thick ring "o", the soft ellipse antennae), instead of
// leaning on Inter for both body text AND display type everywhere,
// which was flattening the brand's personality. Declared here (next/font
// needs a build-time import) but the variable is only ever referenced
// by marketing components — the admin panel and tenant dashboard keep
// reading plain `font-sans` (Inter), untouched.
const displayFont = Baloo_2({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });

// Display face for bicho CENTRAL (components/central/*.tsx) only — a
// separate variable, not a reuse of --font-display, on purpose: the two
// bicho identities need to read as related but distinct (see
// components/central/tokens.ts), and sharing a display face would blur
// that. Space Grotesk is a geometric-but-technical sans, sentence case
// rather than Baloo's rounded/uppercase treatment.
const centralFont = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-central' });

// Display face for the campaign landing (/ia) only. A third variable
// rather than reusing --font-display or --font-central on purpose: that
// page is a READING surface, and Baloo's rounded display voice and Space
// Grotesk's technical one both fight a page of running prose. Archivo is
// a plain, sturdy grotesque with the weights a headline needs and proper
// Spanish diacritics.
const iaFont = Archivo({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-ia' });

// El titular de NOTI. Las dos caras que usan los posts son exactamente
// estas: una didona de contraste altísimo para el titular y una
// grotesca pesada (Archivo, arriba) para subtítulos y etiquetas. Esa
// tensión ES la identidad editorial — una sola de las dos la deshace.
//
// Playfair y no una de las didonas de pago que se ven en los posts:
// es la que más se acerca de lo que hay en Google Fonts, con el peso
// 900 que el titular necesita y las diacríticas del español bien
// dibujadas (la ó de "conversación" es la prueba).
const notiFont = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-noti',
});

export const metadata: Metadata = {
  title: 'Reservas SaaS',
};

// Applied before paint so switching themes never flashes the wrong one
// on load — reads the stored preference, falls back to the OS setting.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${displayFont.variable} ${centralFont.variable} ${iaFont.variable} ${notiFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
