// Plantillas de arranque por giro para el registro propio (/registro).
//
// Servicios, precios y horarios salen de los demos de
// db/seed-demo-tenants.mjs (lima-laca, don-ramon, casa-luma, agua-serena,
// dental-nova, clinica-alameda): ya son precios reales de Durango. Son un
// punto de partida — el dueño los edita antes de crear su página.
//
// `vertical` es la plantilla de página que se copia (tabla `templates`);
// 'general' no tiene plantilla y usa la página de respaldo.

export type PresetService = { name: string; minutes: number; priceMxn: number };

export type Giro = {
  id: string;
  label: string;
  vertical: string;
  resourceLabel: string;
  services: PresetService[];
  // 0=domingo … 6=sábado (igual que Postgres / resource_schedules)
  days: number[];
  opens: string;
  closes: string;
};

const s = (name: string, minutes: number, priceMxn: number): PresetService => ({ name, minutes, priceMxn });

export const GIROS: Giro[] = [
  {
    id: 'unas',
    label: 'Uñas',
    vertical: 'peluqueria',
    resourceLabel: 'Manicurista',
    services: [
      s('Manicure clásico', 45, 280),
      s('Manicure en gel', 60, 420),
      s('Acrílicas · juego nuevo', 150, 850),
      s('Acrílicas · relleno', 105, 600),
      s('Pedicure spa', 75, 480),
    ],
    days: [2, 3, 4, 5, 6],
    opens: '10:00',
    closes: '20:00',
  },
  {
    id: 'barberia',
    label: 'Barbería',
    vertical: 'peluqueria',
    resourceLabel: 'Barbero',
    services: [
      s('Corte clásico', 40, 220),
      s('Corte y barba', 60, 320),
      s('Perfilado de barba', 25, 150),
      s('Corte para niño', 30, 180),
    ],
    days: [1, 2, 3, 4, 5, 6],
    opens: '10:00',
    closes: '20:00',
  },
  {
    id: 'estetica',
    label: 'Estética / salón',
    vertical: 'peluqueria',
    resourceLabel: 'Estilista',
    services: [
      s('Corte y peinado', 60, 450),
      s('Color raíz', 90, 780),
      s('Tratamiento de reconstrucción', 45, 650),
      s('Peinado de evento', 75, 900),
    ],
    days: [2, 3, 4, 5, 6],
    opens: '10:00',
    closes: '20:00',
  },
  {
    id: 'spa',
    label: 'Spa / masajes',
    vertical: 'spa',
    resourceLabel: 'Cabina',
    services: [
      s('Masaje relajante', 60, 850),
      s('Masaje profundo', 80, 1150),
      s('Facial de hidratación', 60, 980),
    ],
    days: [2, 3, 4, 5, 6],
    opens: '11:00',
    closes: '20:00',
  },
  {
    id: 'dentista',
    label: 'Dentista',
    vertical: 'dentista',
    resourceLabel: 'Dentista',
    services: [
      s('Consulta y diagnóstico', 30, 400),
      s('Limpieza dental', 45, 800),
      s('Resina (una pieza)', 60, 1200),
      s('Urgencia por dolor', 30, 600),
    ],
    days: [1, 2, 3, 4, 5],
    opens: '09:00',
    closes: '19:00',
  },
  {
    id: 'consultorio',
    label: 'Consultorio',
    vertical: 'doctor',
    resourceLabel: 'Consultorio',
    services: [
      s('Primera consulta', 40, 700),
      s('Consulta de seguimiento', 25, 450),
      s('Certificado médico', 20, 350),
    ],
    days: [1, 2, 3, 4, 5],
    opens: '09:00',
    closes: '19:00',
  },
  {
    id: 'otro',
    label: 'Otro',
    vertical: 'general',
    resourceLabel: 'Profesional',
    services: [s('Cita', 60, 300)],
    days: [1, 2, 3, 4, 5],
    opens: '09:00',
    closes: '18:00',
  },
];

export function giroById(id: string): Giro | undefined {
  return GIROS.find((g) => g.id === id);
}
