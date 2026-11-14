import type { Metadata } from 'next';
import { GUIAS } from '@/lib/seo/guias';
import { ldMigas, metaPagina } from '@/lib/seo/sitio';
import { Cabecera, Cierre, JsonLd, Marco, Relacionados } from '@/components/marketing/seo/Piezas';
import { EscenaGuias } from '@/components/marketing/seo/Graficos';

export const metadata: Metadata = metaPagina({
  titulo: 'Guías para dueñas de salón y negocios de servicios · bicho',
  descripcion: 'Guías prácticas y gratuitas: RESICO para salones, cómo reducir las citas que no llegan y cómo ponerle precio a tus servicios.',
  path: '/guias',
});

export default function GuiasPage() {
  return (
    <Marco>
      <JsonLd data={ldMigas([{ nombre: 'Inicio', path: '/' }, { nombre: 'Guías', path: '/guias' }])} />
      <Cabecera
        migas={[{ nombre: 'Inicio', href: '/' }, { nombre: 'Guías', href: '/guias' }]}
        eyebrow="Guías gratis"
        titulo="Lo que nadie te explica de tener un salón"
        bajada="Impuestos, citas que no llegan y precios, en lenguaje de mostrador. Sin registrarte."
      >
        <EscenaGuias />
      </Cabecera>
      <Relacionados titulo="Guías" enlaces={GUIAS.map((g) => ({ href: `/guias/${g.slug}`, nombre: g.nombre, texto: g.texto }))} />
      <Cierre titulo={<>Y cuando quieras ordenar tu agenda</>} texto="bicho te da tu página de citas en unos 10 minutos. 15 días gratis, sin tarjeta." />
    </Marco>
  );
}
