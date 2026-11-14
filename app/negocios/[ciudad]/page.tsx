import type { Metadata } from 'next';
import { DirectorioPagina } from '@/components/directorio/DirectorioPagina';
import { filtrarDirectorio, slugDirectorio } from '@/lib/directorio/directorio';
import { negociosDelDirectorio } from '@/lib/directorio/servidor';
import { nombreCiudad } from '../titulos';

type Params = Promise<{ ciudad: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const ciudad = slugDirectorio((await params).ciudad);
  const negocios = filtrarDirectorio(await negociosDelDirectorio(), { ciudad });
  const nombre = nombreCiudad(negocios, ciudad);
  return {
    title: `Negocios en ${nombre} · Reserva en línea`,
    description: `Estéticas, spas, consultorios y más en ${nombre} donde puedes reservar en línea.`,
    alternates: { canonical: `/negocios/${ciudad}` },
    // Una página vacía no debe indexarse: contenido delgado.
    robots: negocios.length ? undefined : { index: false },
  };
}

export default async function CiudadPage({ params }: { params: Params }) {
  const ciudad = slugDirectorio((await params).ciudad);
  const todos = await negociosDelDirectorio();
  const negocios = filtrarDirectorio(todos, { ciudad });
  const nombre = nombreCiudad(negocios, ciudad);
  return (
    <DirectorioPagina
      todos={todos}
      negocios={negocios}
      ciudad={ciudad}
      titulo={`Reserva en ${nombre}`}
      bajada={`Negocios de ${nombre} con reserva en línea. Elige, aparta tu hora y listo.`}
    />
  );
}
