import Link from 'next/link';
import { CentralLogo } from './CentralLogo';
import { focusRingOnDark } from '@/components/marketing/Primitives';

export function CentralFooter() {
  return (
    <footer className="bg-[#14092E] px-5 py-14 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CentralLogo className="h-7" />
          <p className="mt-3 max-w-[17rem] text-sm text-[#B9B1E6]">
            Tecnología para pymes: accesible y muy funcional.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm text-[#B9B1E6]">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
              this footer only renders on the home page, so these are
              anchors within the current document, not navigations. */}
          <a href="/#servicios" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Servicios
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- same-page anchor */}
          <a href="/#nosotros" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Cómo trabajamos
          </a>
          {/* The only cross-page link in this row: a <Link> so it
              client-navigates instead of reloading the whole app. The
              two above it are hash anchors into THIS page. */}
          <Link href="/reservas" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            La plataforma
          </Link>
          <a
            href="mailto:nonameynk@gmail.com"
            className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}
          >
            Contacto
          </a>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-3 border-t border-white/12 pt-6 text-xs text-[#B9B1E6]/70 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} bicho.</p>
        <div className="flex gap-6">
          <a href="/privacidad" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Aviso de privacidad
          </a>
          <a href="/terminos" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Términos
          </a>
        </div>
      </div>
    </footer>
  );
}
