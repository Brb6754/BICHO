import { BichoLogo, BichoTagline } from './BichoLogo';

// Deliberately no legal-page links (Aviso de Privacidad / T&Cs) — those
// pages don't exist yet in this codebase (CLAUDE.md lists them as a
// pending, unbuilt item), and a footer link to a route that 404s is
// worse than no link at all. Only anchors to sections that really exist
// on this same page, plus a real mailto contact.
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

      <p className="mx-auto mt-12 max-w-6xl text-xs text-[#9CA99A]/70">
        © {new Date().getFullYear()} bicho. Software &amp; AI Solutions.
      </p>
    </footer>
  );
}
