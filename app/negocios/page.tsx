import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DirectorioPagina } from '@/components/directorio/DirectorioPagina';
import { filtrarDirectorio, giroNombre, slugDirectorio } from '@/lib/directorio/directorio';
import { negociosDelDirectorio } from '@/lib/directorio/servidor';

export const metadata: Metadata = {
  title: 'Negocios con reserva en línea · Directorio Bicho',
  description: 'Encuentra estéticas, spas, consultorios y más en tu ciudad, y reserva en línea en segundos.',
  alternates: { canonical: '/negocios' },
};

// El buscador manda ?ciudad=&giro= aquí. Con ciudad, la URL buena es la
// ruta SEO; solo el filtro por giro sin ciudad se queda en esta página.
export default async function NegociosPage({ searchParams }: { searchParams: Promise<{ ciudad?: string; giro?: string }> }) {
  const sp = await searchParams;
  const ciudad = slugDirectorio(sp.ciudad ?? '');
  const giro = slugDirectorio(sp.giro ?? '');
  if (ciudad) redirect(giro ? `/negocios/${ciudad}/${giro}` : `/negocios/${ciudad}`);

  const todos = await negociosDelDirectorio();
  const negocios = filtrarDirectorio(todos, { giro });
  const nombreGiro = giro ? giroNombre(negocios[0]?.vertical ?? giro, true) : null;
  return (
    <DirectorioPagina
      todos={todos}
      negocios={negocios}
      giro={giro || undefined}
      titulo={nombreGiro ? `${nombreGiro} con reserva en línea` : 'Reserva cerca de ti'}
      bajada="Negocios de tu ciudad donde apartas tu lugar en línea, a cualquier hora, sin llamar ni esperar respuesta."
    />
  );
}
