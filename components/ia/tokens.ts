// La paleta editorial de NOTI, tomada de los posts de la campaña
// (2026-10-02). Esta página y los posts de Instagram son la misma
// publicación: alguien llega aquí desde uno de ellos, y si el sitio
// está en otro color la continuidad se rompe justo en el momento en que
// más importa.
//
// Lo que cambió respecto a la versión anterior de /ia: el violeta
// eléctrico de la plataforma (#3B00FF) sale de esta página. Ese es el
// color de bicho como estudio; NOTI es una publicación con su propia
// voz — tinta berenjena sobre papel crema, lavanda para las
// ilustraciones y lima solo como resaltador.
export const NOTI = {
  /** Papel. Crema, no blanco: el blanco puro con la didona encima se ve clínico. */
  paper: '#FBF9F5',
  /** Un tono más cálido para separar bandas sin meter otro color. */
  paperDeep: '#F4F0E9',
  /** Tinta. Berenjena muy oscura, no negro — es lo que hace que la página se sienta impresa. */
  ink: '#241038',
  /** Lavanda: el relleno de las ilustraciones y de los chips tranquilos. */
  lavender: '#C9B6EA',
  lavenderSoft: '#EDE6F8',
  /**
   * Lima. SOLO como resaltador con tinta encima, nunca como texto: sobre
   * el papel crema da 1.3:1 y desaparece. La misma regla que ya rige el
   * lima de la landing de reservas.
   */
  lime: '#CBFC31',
} as const;

/** Hairline de la retícula editorial: la regla fina que separa cada banda. */
export const RULE = 'rgba(36, 16, 56, 0.16)';
