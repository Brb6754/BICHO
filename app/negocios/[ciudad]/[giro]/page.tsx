import type { Metadata } from 'next';
import { DirectorioPagina } from '@/components/directorio/DirectorioPagina';
import { filtrarDirectorio, giroNombre, slugDirectorio } from '@/lib/directorio/directorio';
import { negociosDelDirectorio } from '@/lib/directorio/servidor';
import { nombreCiudad } from '../../titulos';

type Params = Promise<{ ciudad: string; giro: string }>;

async function datos(params: Params) {
  const p = await params;
  const ciudad = slugDirectorio(p.ciudad);
  const giro = slugDirectorio(p.giro);
  const todos = await negociosDelDirectorio();
  const negocios = filtrarDirectorio(todos, { ciudad, giro });
  return { ciudad, giro, todos, negocios, nombre: nombreCiudad(filtrarDirectorio(todos, { ciudad }), ciudad), giroPlural: giroNombre(giro, true) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { ciudad, giro, negocios, nombre, giroPlural } = await datos(params);
  return {
    title: `${giroPlural} en ${nombre} · Reserva en línea`,
    description: `${giroPlural} en ${nombre} donde puedes reservar tu cita en línea, a cualquier hora.`,
    alternates: { canonical: `/negocios/${ciudad}/${giro}` },
    robots: negocios.length ? undefined : { index: false },
  };
}

export default async function CiudadGiroPage({ params }: { params: Params }) {
  const { ciudad, giro, todos, negocios, nombre, giroPlural } = await datos(params);
  return (
    <DirectorioPagina
      todos={todos}
      negocios={negocios}
      ciudad={ciudad}
      giro={giro}
      titulo={`${giroPlural} en ${nombre}`}
      bajada={`${giroPlural} de ${nombre} con reserva en línea. Elige, aparta tu hora y listo.`}
    />
  );
}
