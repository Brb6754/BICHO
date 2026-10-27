// El vocabulario de reuniones, en un solo lugar.
//
// Una reunión comparte tabla con una cita (ver db/039), así que la
// diferencia entre las dos es un campo — y un campo que se lee mal en
// una sola pantalla mezcla el catálogo de servicios con los tipos de
// reunión delante de un cliente. Por eso nadie compara contra el
// string a mano: se pregunta aquí.

export type Naturaleza = 'servicio' | 'reunion';
export type Modalidad = 'video' | 'sitio' | 'oficina';
export type Resultado = 'interesado' | 'cotizado' | 'ganado' | 'perdido';

// `kind` llega `undefined` mientras db/039 no esté corrida. Las dos
// funciones tratan ese caso como "es un servicio", que es lo que era
// todo antes de que existieran las reuniones: una migración pendiente
// cuesta el módulo nuevo, nunca el catálogo que ya opera.
export function esServicio(x: { kind?: string | null } | null | undefined): boolean {
  return x?.kind !== 'reunion';
}

export function esReunion(x: { kind?: string | null } | null | undefined): boolean {
  return x?.kind === 'reunion';
}

export const MODALIDADES: Record<Modalidad, { label: string; corto: string; ayuda: string }> = {
  video: {
    label: 'Videollamada',
    corto: 'En línea',
    ayuda: 'Te enviamos el enlace por correo.',
  },
  sitio: {
    label: 'Visita en sitio',
    corto: 'En tu domicilio',
    ayuda: 'Vamos a donde se va a hacer el trabajo.',
  },
  oficina: {
    label: 'En la oficina',
    corto: 'En oficina',
    ayuda: 'Nos vemos en nuestras instalaciones.',
  },
};

export function modalidadLabel(m: string | null | undefined): string {
  return m && m in MODALIDADES ? MODALIDADES[m as Modalidad].label : 'Reunión';
}

// Solo la visita en sitio necesita dirección: es el único caso en que
// el negocio tiene que ir a algún lado. Pedírsela a quien agenda una
// videollamada es pedir un dato que nadie va a usar.
export function pideDireccion(m: string | null | undefined): boolean {
  return m === 'sitio';
}

// El resultado comercial. El orden es el del embudo, y es el que usan
// tanto el selector del panel como las columnas del pipeline: que la
// lista salga siempre en el mismo orden es lo que hace que se lea como
// un avance y no como cuatro etiquetas sueltas.
export const RESULTADOS: {
  value: Resultado;
  label: string;
  ayuda: string;
  tono: 'info' | 'primary' | 'success' | 'muted';
}[] = [
  {
    value: 'interesado',
    label: 'Interesado',
    ayuda: 'Quiere seguir, todavía sin números.',
    tono: 'info',
  },
  {
    value: 'cotizado',
    label: 'Le cotizamos',
    ayuda: 'Ya tiene precio y está decidiendo.',
    tono: 'primary',
  },
  { value: 'ganado', label: 'Cerró', ayuda: 'Aceptó y es cliente.', tono: 'success' },
  { value: 'perdido', label: 'No va', ayuda: 'No se concretó.', tono: 'muted' },
];

export function resultadoLabel(r: string | null | undefined): string | null {
  return RESULTADOS.find((x) => x.value === r)?.label ?? null;
}
