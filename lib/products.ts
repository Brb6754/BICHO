import { createClient } from '@/lib/supabase/server';

// Qué productos tiene contratado un negocio.
//
// Vive en un solo lugar porque lo preguntan seis pantallas del panel,
// la página pública y los dos paneles internos. Si cada una lo
// resolviera por su cuenta, la primera que olvidara el caso "la columna
// todavía no existe" tumbaría el panel de alguien.
//
// Los dos valores por defecto son deliberados y opuestos:
//   · reservas en TRUE  — todos los negocios de hoy contrataron citas,
//     y sin la columna el panel debe comportarse como siempre.
//   · cotizaciones en FALSE — es un extra que se vende aparte; nadie lo
//     tiene hasta que alguien lo prende.
export type ProductosDelNegocio = {
  reservas: boolean;
  cotizaciones: boolean;
};

export async function productosDe(slug: string): Promise<ProductosDelNegocio> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tenants')
    .select('reservas_enabled, quotes_enabled')
    .eq('slug', slug)
    .maybeSingle();

  return {
    reservas: data?.reservas_enabled !== false,
    cotizaciones: data?.quotes_enabled === true,
  };
}
