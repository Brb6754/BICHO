import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

// El icono de la pestaña, por negocio.
//
// La raíz de la app trae `app/icon.png` (el bicho sobre morado), que es
// lo correcto para bichomx.com, el panel interno y el de vendedores.
// Pero dentro de `{slug}.bichomx.com` la página no es de bicho: es del
// negocio, y la pestaña del cliente debe mostrar SU logo. Es la misma
// decisión que ya rige los colores y la tipografía de esa página.
//
// Este layout existe solo para eso. No dibuja nada —devuelve `children`
// tal cual— así que no cambia el render de ninguna pantalla de abajo;
// ponerlo aquí y no en cada página es lo que hace que lo hereden las
// cuatro zonas del negocio: reservar, cotización, panel y dashboard.
//
// Sin logo configurado NO se devuelve `icons`: así hereda el de bicho en
// vez de dejar la pestaña con el icono roto del navegador.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('tenants')
      .select('logo_url')
      .eq('slug', slug)
      .maybeSingle();

    const logo = data?.logo_url?.trim();
    if (!logo) return {};

    return { icons: { icon: logo, shortcut: logo, apple: logo } };
  } catch {
    // Un icono nunca vale tumbar la página de un negocio.
    return {};
  }
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
