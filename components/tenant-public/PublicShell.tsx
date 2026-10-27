import { googleFontsHref, FONT_OPTIONS, type FontKey } from '@/lib/branding/fonts';
import {
  tenantColorCssVars,
  tenantDarkModeCssVars,
  withAlpha,
} from '@/lib/branding/colors';
import { templateDesignCssVars } from '@/lib/templates/blocks';
import type { TemplateDesign } from '@/lib/templates/blocks';

// La piel de las páginas públicas de un negocio.
//
// Vivía entera dentro de `reservar/page.tsx`. Se sacó aquí cuando nació
// la segunda página pública (`/reuniones`): un negocio que sirve sus
// dos páginas con dos copias de este bloque acaba con una en modo
// oscuro y la otra no, o con la tipografía aplicada en una sola. Lo que
// hace que las dos se vean del MISMO negocio es que sea literalmente el
// mismo componente.
//
// Todos los comentarios que siguen son los originales de esa página:
// explican decisiones que costaron bugs reales y no se pierden por
// mudarse de archivo.

export function PublicShell({
  headingKey,
  bodyKey,
  design,
  isDark,
  primaryColor,
  secondaryColor,
  accentColor,
  backgroundColor,
  textColor,
  children,
}: {
  headingKey: FontKey;
  bodyKey: FontKey;
  design: TemplateDesign;
  isDark: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  /** Ya resuelto por quien llama: el papel con tinte del negocio. Ignorado en oscuro. */
  backgroundColor: string;
  textColor: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Runtime font choice → a real <link>, not next/font (which needs
          the family known at build time). Next.js hoists this into <head>
          even though it's rendered mid-tree. */}
      <link rel="stylesheet" href={googleFontsHref([headingKey, bodyKey])} />

      {/* "dark" below is a deliberate, self-contained class directly on
          <main> — not inherited from <html> (which the admin/dashboard's
          own ThemeToggle controls) — because this page's mode is an
          admin-panel setting, not the visitor's or a leftover staff
          member's OS/browser preference. Light mode keeps using
          force-light for the same reason it always has: pin the surface
          tokens regardless of whatever `.dark` state happens to be on an
          ancestor. tenant-shell + tenantColorCssVars/tenantDarkModeCssVars
          are the exact same mechanism already built for the tenant
          dashboard's own dark mode — reused as-is. */}
      <main
        className={`${isDark ? 'dark tenant-shell bg-paper text-ink' : 'force-light'} relative min-h-screen overflow-hidden`}
        style={
          isDark
            ? ({
                ...tenantColorCssVars(primaryColor, secondaryColor, accentColor),
                ...tenantDarkModeCssVars(primaryColor, secondaryColor, accentColor),
                ...templateDesignCssVars(design),
                fontFamily: FONT_OPTIONS[bodyKey].family,
                '--font-heading': FONT_OPTIONS[headingKey].family,
              } as React.CSSProperties)
            : ({
                // Light mode gets the tenant's colour vars too, not just
                // dark. Without them `bg-primary` / `text-primary` inside
                // this page resolve to the PLATFORM's indigo, which is why
                // the booking flow used to paint brand colour through
                // inline styles instead. With the vars bound here the flow
                // can be written against semantic tokens only, and each
                // business's identity arrives as a theme.
                ...tenantColorCssVars(primaryColor, secondaryColor, accentColor),
                ...templateDesignCssVars(design),
                // El papel toma un tinte del negocio en vez de un gris fijo:
                // con el fondo neutro, cinco negocios distintos servian la
                // misma hoja y la pagina se leia como un documento. Sigue
                // siendo papel —4% de color, no un campo— pero ahora es
                // SU papel. Un background_color configurado a mano en el
                // panel sigue mandando sobre esto.
                backgroundColor,
                color: textColor,
                fontFamily: FONT_OPTIONS[bodyKey].family,
                '--font-heading': FONT_OPTIONS[headingKey].family,
              } as React.CSSProperties)
        }
      >
        {/* ATMÓSFERA. Dos manchas enormes y difusas con los colores del
            negocio, fijas al viewport.

            La versión anterior de esta página no tenía ninguna, y el
            comentario que estaba aquí defendía esa decisión: antes eran
            dos cuñas con clip-path que cortaban una diagonal dura y se
            leían como un error de render. El problema era la FORMA, no
            la existencia — una hoja plana de un solo color es
            exactamente lo que hace que una página se vea hecha con un
            generador de sitios.

            Son radiales suaves, sin borde que recortar, al 10% y 7%, y
            van en `fixed` para que el fondo no se desplace con el
            scroll: la página se mueve, la luz no. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background: `radial-gradient(60rem 40rem at 12% -10%, ${withAlpha(primaryColor, 0.1)}, transparent 60%), radial-gradient(45rem 35rem at 100% 15%, ${withAlpha(accentColor, 0.07)}, transparent 65%)`,
          }}
        />

        {/* Sin cuñas.
            This used to be two large clip-path wedges tinted with the
            tenant's colours. They cut a hard diagonal seam across the
            page that read as a rendering artefact rather than as
            design, and they put brand colour everywhere — which is
            exactly what makes a page look cheap: colour spread thin
            over everything instead of spent in one place.
            The ground is now a quiet neutral and the tenant's colour
            is saved for the things you act on (the CTA, the selected
            slot, the active step). */}
        <div className="relative z-10">{children}</div>
      </main>
    </>
  );
}
