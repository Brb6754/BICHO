import type { Metadata } from 'next';
import { Inter, Baloo_2 } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Display face for the bicho marketing site's own headlines only (see
// components/marketing/*.tsx's `font-[family-name:var(--font-display)]`
// usage) — a bold, rounded geometric sans that echoes the actual logo's
// own rounded-bug-mascot character (the thick ring "o", the soft
// ellipse antennae), instead of leaning on Inter for both body text AND
// display type everywhere, which was flattening the brand's personality.
// Declared here (next/font needs a build-time import) but the variable
// is only ever referenced by marketing components — the admin panel
// and tenant dashboard keep reading plain `font-sans` (Inter), untouched.
const displayFont = Baloo_2({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });

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
    <html lang="es" className={`${inter.variable} ${displayFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
