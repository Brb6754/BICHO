import Link from 'next/link';
import { BichoLogo, BichoTagline } from './BichoLogo';
import { focusRingOnDark } from './Primitives';
import { GIROS } from '@/lib/seo/giros';
import { CORREO_CONTACTO } from '@/lib/seo/sitio';

export function MarketingFooter() {
  return (
    <footer className="bg-[#1B1040] px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BichoLogo className="h-7" />
          <BichoTagline className="mt-2 text-[10px]" />
        </div>

        {/* Enlaces absolutos a la raíz (/#precios): este pie también sale en
            /privacidad, /terminos y las páginas de búsqueda. */}
        <nav aria-label="Pie de página" className="grid grid-cols-2 gap-x-10 gap-y-8 text-sm text-[#B9B1E6] sm:grid-cols-3">
          <div>
            <p className="font-semibold text-white">Producto</p>
            <ul className="mt-3 space-y-2.5">
              <li><Link href="/funciones" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>Funciones</Link></li>
              <li><Link href="/#precios" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>Precios</Link></li>
              <li><Link href="/#demos" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>Demos</Link></li>
              <li><Link href="/registro" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>Prueba gratis</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Para tu giro</p>
            <ul className="mt-3 space-y-2.5">
              {GIROS.map((g) => (
                <li key={g.slug}>
                  <Link href={`/para/${g.slug}`} className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
                    {g.nombre.charAt(0).toUpperCase() + g.nombre.slice(1)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-white">Recursos</p>
            <ul className="mt-3 space-y-2.5">
              <li><Link href="/guias" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>Guías</Link></li>
              <li><Link href="/negocios" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>Directorio de negocios</Link></li>
              <li><Link href="/estudio" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>Software a la medida</Link></li>
              <li><a href={`mailto:${CORREO_CONTACTO}`} className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>Contacto</a></li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-3 border-t border-[#332A63] pt-6 text-xs text-[#B9B1E6]/70 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} bicho. Software &amp; AI Solutions.</p>
        <div className="flex gap-6">
          <Link href="/privacidad" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Aviso de privacidad
          </Link>
          <Link href="/terminos" className={`rounded-sm transition-colors hover:text-white ${focusRingOnDark}`}>
            Términos
          </Link>
        </div>
      </div>
    </footer>
  );
}
