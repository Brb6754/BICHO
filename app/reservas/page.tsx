import LandingPage, { metadata as landing } from '../page';

// bichomx.com/reservas y reservas.bichomx.com (proxy.ts reescribe su "/"
// aquí) eran la landing vieja del producto. Desde 2026-11-14 el producto
// vive en la raíz, así que esta ruta sirve la misma página con la
// canonical apuntando a https://bichomx.com/ (la da metaPagina en
// app/page.tsx): ninguna de las dos URLs compite con la otra en Google.
// Un redirect aquí haría bucle en reservas.bichomx.com (ver lib/domains.ts).
export const metadata = landing;
export default LandingPage;
