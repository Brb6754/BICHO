import ReservarPage, { generateMetadata, generateViewport } from './reservar/page';

// The root of a business's address ({slug}.dominio/) IS its booking
// page. This used to render a developer placeholder ("Pendiente:
// dashboard y página de reserva") to anyone who typed the bare
// subdomain, which is exactly what a customer does after hearing the
// name. Rendered in place rather than redirected: a redirect to
// "/reservar" is only correct on the subdomain, and would 404 when the
// page is reached through the path-based /t/{slug} form.
export { generateMetadata, generateViewport };
export default ReservarPage;
