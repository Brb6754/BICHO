import { CentralLogo } from './CentralLogo';
import { focusRingOnDark } from './Primitives';

export function CentralFooter() {
  return (
    <footer className="bg-[#0B1030] px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CentralLogo className="h-7" />
          <p className="mt-3 max-w-[17rem] text-sm text-[#8C9BC9]">
            Software, sitios, IA y datos para negocios reales.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm text-[#8C9BC9]">
          <a href="/#servicios" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Servicios
          </a>
          <a href="/#nosotros" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Cómo trabajamos
          </a>
          <a href="/reservas" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            bicho reservas
          </a>
          <a
            href="mailto:nonameynk@gmail.com"
            className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}
          >
            Contacto
          </a>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-3 border-t border-[#24345F] pt-6 text-xs text-[#8C9BC9]/70 sm:flex-row sm:items-center sm:justify-between">
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
