import type { Metadata } from 'next';
import Link from 'next/link';
import { FUNCIONES } from '@/lib/seo/funciones';
import { GIROS } from '@/lib/seo/giros';
import { PLANES, planMinimoPara } from '@/lib/billing/planes';
import { ldMigas, ldSoftware, metaPagina } from '@/lib/seo/sitio';
import { Cabecera, Cierre, JsonLd, Marco, Relacionados } from '@/components/marketing/seo/Piezas';
import { IlustracionFuncion, VistaTarjeta } from '@/components/marketing/seo/Graficos';

const DESCRIPCION =
  'Todas las herramientas de bicho para negocios de servicios en México: agenda en línea, recordatorios, lealtad, caja, inventario, comisiones, cotizaciones, facturación y un asistente con IA.';

export const metadata: Metadata = metaPagina({ titulo: 'Funciones de bicho: agenda, caja, lealtad y más', descripcion: DESCRIPCION, path: '/funciones' });

// Agrupadas por el momento del negocio que resuelven, no por plan.
const GRUPOS: { titulo: string; slugs: string[] }[] = [
  { titulo: 'Que te encuentren y reserven', slugs: ['reservas-en-linea', 'recordatorios', 'directorio'] },
  { titulo: 'Que vuelvan', slugs: ['clientes-que-regresan', 'lealtad', 'referidos'] },
  { titulo: 'Que cuadren las cuentas', slugs: ['caja', 'inventario', 'comisiones', 'guia-resico'] },
  { titulo: 'Para vender servicios más grandes', slugs: ['cotizaciones', 'reuniones', 'facturacion', 'copiloto'] },
];

export default function FuncionesPage() {
  return (
    <Marco>
      <JsonLd data={[ldSoftware(DESCRIPCION), ldMigas([{ nombre: 'Inicio', path: '/' }, { nombre: 'Funciones', path: '/funciones' }])]} />
      <Cabecera
        migas={[{ nombre: 'Inicio', href: '/' }, { nombre: 'Funciones', href: '/funciones' }]}
        eyebrow="Funciones"
        titulo="Todo lo que hace bicho por tu negocio"
        bajada="Empieza con la agenda en línea y prende lo demás cuando lo necesites. Cada herramienta resuelve un problema concreto, no una lista de casillas."
        secundario={{ href: '/#demos', label: 'Ve un demo real' }}
      >
        <div className="relative mx-auto h-[340px] w-full max-w-[420px]" aria-hidden="true">
          <IlustracionFuncion slug="inventario" className="absolute left-0 top-0 w-[62%] -rotate-[4deg]" />
          <IlustracionFuncion slug="lealtad" className="mk-rise absolute bottom-0 right-0 w-[58%] rotate-[5deg]" />
        </div>
      </Cabecera>
      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl space-y-14">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4vw,2.4rem)] font-extrabold uppercase leading-[0.95] text-[#140F2E]">{g.titulo}</h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {g.slugs.map((s) => {
                  const f = FUNCIONES.find((x) => x.slug === s)!;
                  const plan = f.modulo ? PLANES[planMinimoPara(f.modulo)].nombre : 'Todos';
                  return (
                    <li key={s}>
                      <Link
                        href={`/funciones/${s}`}
                        className="group flex h-full flex-col rounded-[24px] bg-[#F5F3FC] p-6 transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(20,15,46,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B34E8]"
                      >
                        <VistaTarjeta slug={s} />
                        <span className="text-lg font-semibold text-[#140F2E]">{f.nombre}</span>
                        <span className="mt-2 flex-1 text-[14px] leading-relaxed text-[#4A4370]">{f.descripcion.split('. ')[0]}.</span>
                        <span className="mt-4 text-xs font-semibold text-[#5B34E8]">Plan: {plan === 'Esencial' ? 'todos' : plan === 'Todos' ? 'todos' : `${plan}${plan === 'Negocio' ? ' y Pro' : ''}`}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <Relacionados
        titulo="bicho para tu giro"
        enlaces={GIROS.map((g) => ({ href: `/para/${g.slug}`, nombre: `Para ${g.nombre}`, texto: g.dolores[0].titulo + '.' }))}
      />
      <Cierre titulo={<>Empieza por la agenda</>} texto="Lo demás lo prendes cuando lo necesites. 15 días gratis, sin tarjeta." />
    </Marco>
  );
}
