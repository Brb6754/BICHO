import type { Metadata } from 'next';
import LoginForm from './LoginForm';
import { AuthShell } from '@/components/tenant-dash/AuthShell';
import { productosDe, type ProductosDelNegocio } from '@/lib/products';

export const metadata: Metadata = {
  title: 'Entrar a tu panel',
  robots: { index: false, follow: false },
};

// La frase bajo el nombre del negocio nombra lo que ESTE negocio usa.
// Decía "tu agenda y tus citas" para todos, y un negocio que solo
// cotiza y agenda reuniones (Nova Solar) no tiene ninguna de las dos.
function descripcion(p: ProductosDelNegocio): string {
  const cosas = [
    p.reservas && 'tu agenda',
    p.reuniones && 'tus reuniones',
    p.cotizaciones && 'tus cotizaciones',
    p.facturacion && 'tus facturas',
  ].filter(Boolean) as string[];
  if (cosas.length === 0) return 'Entra a tu panel.';
  const lista = cosas.length === 1 ? cosas[0] : `${cosas.slice(0, -1).join(', ')} y ${cosas.at(-1)}`;
  return `Entra para ver ${lista}.`;
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  // The dashboard layout sends people here with ?error= when their
  // account isn't a member of this business. That message used to be
  // dropped on the floor: they landed on a blank form with no idea why.
  const { error } = await searchParams;
  const productos = await productosDe(slug);

  return (
    <AuthShell slug={slug} description={descripcion(productos)}>
      <LoginForm initialError={typeof error === 'string' ? error : null} />
    </AuthShell>
  );
}
