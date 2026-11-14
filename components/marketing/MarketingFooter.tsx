import { BichoLogo, BichoTagline } from './BichoLogo';
import { focusRingOnDark } from './Primitives';

export function MarketingFooter() {
  return (
    <footer className="bg-[#1B1040] px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BichoLogo className="h-7" />
          <BichoTagline className="mt-2 text-[10px]" />
        </div>

        {/* Root-relative to /reservas (not bare `#id`, and not `/#id`
            since that now points at bicho central instead): this footer
            also renders on /privacidad and /terminos, where these
            section ids don't exist — same reasoning as before, updated
            for the route move (2026-09-18). */}
        <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm text-[#B9B1E6]">
          <a href="/reservas#funciones" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Funciones
          </a>
          <a href="/reservas#como-funciona" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Cómo funciona
          </a>
          <a href="/reservas#vendedores" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Vendedores
          </a>
          <a href="/negocios" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Negocios
          </a>
          <a href="mailto:nonameynk@gmail.com" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Contacto
          </a>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-3 border-t border-[#332A63] pt-6 text-xs text-[#B9B1E6]/70 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} bicho. Software &amp; AI Solutions.</p>
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
