// Los cuatro estilos del panel del negocio (db/054). El dueño escoge uno
// en /dashboard/marca; la demo (/panel) los alterna por ?estilo=.

export const ESTILOS = [
  { id: 'clasico', nombre: 'Clásico', tipo: 'Tradicional', detalle: 'Tarjetas blancas, números grandes y tu color en la principal.' },
  { id: 'suave', nombre: 'Suave', tipo: 'Tradicional', detalle: 'Gris perla, esquinas muy redondas y un solo dato que brilla.' },
  { id: 'vibrante', nombre: 'Vibrante', tipo: 'Innovador', detalle: 'Media pantalla en tu color, con el dato del día en grande.' },
  { id: 'poster', nombre: 'Póster', tipo: 'Innovador', detalle: 'Oscuro, en mosaico, con tipografía gigante y tu color como luz.' },
] as const;

export type Estilo = (typeof ESTILOS)[number]['id'];

export const ESTILO_POR_OMISION: Estilo = 'clasico';

/** Cualquier valor (columna, query string, cookie) → un estilo válido. */
export function estiloDe(valor: unknown): Estilo {
  return ESTILOS.some((e) => e.id === valor) ? (valor as Estilo) : ESTILO_POR_OMISION;
}

/** Cookie de la demo pública: recuerda el estilo al navegar entre módulos. No toca la base. */
export const COOKIE_ESTILO_DEMO = 'demo_estilo';
