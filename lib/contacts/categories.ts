import type { DirectoryEntry } from './directory';

// El directorio, partido en secciones por el ESTADO de la relación.
//
// Antes eran dos grupos ("necesitan algo de ti" y "al día"), y el
// segundo era un cajón: ahí caían por igual alguien que vino ayer por
// primera vez, alguien que viene cada mes desde hace dos años y alguien
// que tiene cita el jueves. Son tres personas distintas y cada una pide
// algo distinto del negocio.
//
// LA REGLA QUE LO HACE CONFIABLE: cada persona cae en EXACTAMENTE UNA
// categoría. Es tentador dejar que alguien con una cotización abierta
// salga también en "vienen pronto" —las dos cosas son ciertas— pero
// entonces la suma de los contadores no es el número de clientes, y una
// pantalla cuyos números no suman deja de usarse. La categoría es la
// PRIMERA que aplica en este orden, y el orden es el de urgencia.

export type CategoriaKey =
  | 'sinContestar'
  | 'noLlegaron'
  | 'seEnfriaron'
  | 'vienenPronto'
  | 'nuevos'
  | 'frecuentes';

export type Categoria = {
  key: CategoriaKey;
  titulo: string;
  /** Qué hacer con esta gente. No es decoración: una sección sin
   *  siguiente paso es un reporte, y nadie actúa sobre un reporte. */
  ayuda: string;
  /** Solo las accionables llevan color; el resto se calma. Misma regla
   *  que la agenda, donde un "no vino" es el único estado sin atenuar. */
  accionable: boolean;
  entries: DirectoryEntry[];
};

const DEFINICIONES: {
  key: CategoriaKey;
  titulo: string;
  ayuda: string;
  accionable: boolean;
  test: (e: DirectoryEntry) => boolean;
}[] = [
  {
    key: 'sinContestar',
    titulo: 'Te deben una respuesta',
    ayuda: 'Les mandaste una cotización y no han contestado. Una llamada aquí vale más que diez clientes nuevos.',
    accionable: true,
    test: (e) => e.openQuotes > 0,
  },
  {
    key: 'noLlegaron',
    titulo: 'No llegaron',
    ayuda: 'Faltaron sin avisar. Confírmales el día anterior la próxima vez.',
    accionable: true,
    test: (e) => e.noShows > 0,
  },
  {
    key: 'seEnfriaron',
    titulo: 'Se enfriaron',
    ayuda: 'Llevan más de tres meses sin volver y no tienen nada agendado. Un mensaje recupera a varios.',
    accionable: true,
    // `tenure` ya resuelve "más de 90 días y sin nada agendado". Usar la
    // misma definición que el resto del panel, y no una propia, es lo
    // que evita que dos pantallas llamen "inactivo" a cosas distintas.
    test: (e) => e.tenure === 'inactivo',
  },
  {
    key: 'vienenPronto',
    titulo: 'Vienen pronto',
    ayuda: 'Ya tienen algo agendado contigo.',
    accionable: false,
    test: (e) => e.nextVisit !== null,
  },
  {
    key: 'nuevos',
    titulo: 'Apenas te conocen',
    ayuda: 'Vinieron una vez, o todavía ninguna. Que vuelvan una segunda vez es lo que los convierte en clientes.',
    accionable: false,
    test: (e) => e.tenure === 'nuevo',
  },
  {
    key: 'frecuentes',
    titulo: 'Tu clientela',
    ayuda: 'Vuelven. Son los que sostienen el negocio.',
    accionable: false,
    // El cajón final: todo lo que llegó hasta aquí es alguien que ya
    // volvió al menos una vez y no está en ninguna de las anteriores.
    test: () => true,
  },
];

/**
 * Reparte el directorio en secciones. Devuelve solo las que tienen
 * gente: una sección vacía con su texto de ayuda ocupa el mismo espacio
 * que una llena y no dice nada.
 */
export function categorize(entries: DirectoryEntry[]): Categoria[] {
  const cubos = new Map<CategoriaKey, DirectoryEntry[]>(
    DEFINICIONES.map((d) => [d.key, [] as DirectoryEntry[]])
  );

  for (const e of entries) {
    const d = DEFINICIONES.find((x) => x.test(e));
    // El último `test` devuelve true siempre, así que esto no puede
    // quedar sin destino — pero si alguien edita las definiciones y lo
    // rompe, es mejor perder a una persona de una sección que tirar la
    // pantalla entera.
    if (d) cubos.get(d.key)!.push(e);
  }

  return DEFINICIONES.filter((d) => cubos.get(d.key)!.length > 0).map((d) => ({
    key: d.key,
    titulo: d.titulo,
    ayuda: d.ayuda,
    accionable: d.accionable,
    entries: cubos.get(d.key)!,
  }));
}

/** Cuántas personas piden algo ahora mismo. Es el número del encabezado. */
export function pendientes(categorias: Categoria[]): number {
  return categorias.filter((c) => c.accionable).reduce((n, c) => n + c.entries.length, 0);
}
