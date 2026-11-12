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
//   · cotizaciones y facturación en FALSE — son extras que se venden
//     aparte; nadie los tiene hasta que alguien los prende.
//
// Se consulta con `select('*')` y no con la lista de columnas: un
// ambiente sin la migración más nueva debe comportarse como "ese
// producto no está contratado", no tumbar las seis pantallas que
// preguntan esto.
export type ProductosDelNegocio = {
  reservas: boolean;
  cotizaciones: boolean;
  facturacion: boolean;
  reuniones: boolean;
  copiloto: boolean;
  caja: boolean;
  lealtad: boolean;
  regresan: boolean;
  posts: boolean;
  resico: boolean;
  comisiones: boolean;
  inventario: boolean;
};

export async function productosDe(slug: string): Promise<ProductosDelNegocio> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  return {
    reservas: data?.reservas_enabled !== false,
    cotizaciones: data?.quotes_enabled === true,
    // Igual que cotizaciones: nadie lo tiene hasta que se vende. Y
    // con más razón, porque emite documentos fiscales a nombre del
    // negocio.
    facturacion: data?.facturacion_enabled === true,
    // Mismo criterio: extra que se vende aparte, apagado hasta que
    // alguien lo prende.
    reuniones: data?.reuniones_enabled === true,
    // Copiloto (db/040): mismo criterio, apagado hasta que se prende.
    copiloto: data?.copiloto_enabled === true,
    // Caja (db/045): mismo criterio, apagado hasta que se prende.
    caja: data?.caja_enabled === true,
    // Lealtad (db/047): mismo criterio, apagado hasta que se prende.
    lealtad: data?.lealtad_enabled === true,
    // Clientes que regresan (db/046): mismo criterio, apagado hasta que se prende.
    regresan: data?.regresan_enabled === true,
    // Posts con IA (db/048): mismo criterio, apagado hasta que se prende.
    posts: data?.posts_enabled === true,
    // Guía RESICO (db/051): mismo criterio, apagado hasta que se prende.
    resico: data?.resico_enabled === true,
    // Comisiones por empleado (db/050): mismo criterio, apagado hasta que se prende.
    comisiones: data?.comisiones_enabled === true,
    // Inventario (db/049): mismo criterio, apagado hasta que se prende.
    inventario: data?.inventario_enabled === true,
  };
}
