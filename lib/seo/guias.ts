// Índice de las guías (/guias/<slug>). El contenido vive en cada página.
export const GUIAS = [
  {
    slug: 'resico-para-salones',
    nombre: 'RESICO para salones',
    texto: 'Cómo darte de alta, qué te toca cada mes y calculadora del ISR mensual.',
    fecha: '2026-11-14',
  },
  {
    slug: 'como-reducir-citas-que-no-llegan',
    nombre: 'Cómo reducir las citas que no llegan',
    texto: 'Lo que sí funciona para que tus clientas no te dejen plantada, sin perderlas.',
    fecha: '2026-11-14',
  },
  {
    slug: 'precios-servicios-salon',
    nombre: 'Cómo ponerle precio a tus servicios',
    texto: 'Costo por minuto, materiales y margen: la cuenta para no trabajar gratis.',
    fecha: '2026-11-14',
  },
] as const;

export type GuiaSlug = (typeof GUIAS)[number]['slug'];

export function guiaPorSlug(slug: string) {
  return GUIAS.find((g) => g.slug === slug);
}
