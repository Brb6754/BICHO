import { BichoLogo, BichoTagline } from './BichoLogo';

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#1E3A28] bg-[#0D2B1B] px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BichoLogo className="h-7" />
          <BichoTagline className="mt-2 text-[10px]" />
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4 text-sm text-[#9CA99A]">
          <a href="#funciones" className="hover:text-white">
            Funciones
          </a>
          <a href="#precios" className="hover:text-white">
            Precios
          </a>
          <a href="#vendedores" className="hover:text-white">
            Vendedores
          </a>
          <a href="mailto:nonameynk@gmail.com" className="hover:text-white">
            Contacto
          </a>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-3 border-t border-[#1E3A28] pt-6 text-xs text-[#9CA99A]/70 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} bicho. Software &amp; AI Solutions.</p>
        <div className="flex gap-6">
          <a href="/privacidad" className="hover:text-white">
            Aviso de privacidad
          </a>
          <a href="/terminos" className="hover:text-white">
            Términos
          </a>
        </div>
      </div>
    </footer>
  );
}
