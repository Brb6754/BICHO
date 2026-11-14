import { addDaysKey, dayKey } from '@/lib/dates/tenantTime';
import { REGLA_DEFAULT, type DatosLealtad, type Promo } from './datos';
import { estadoTarjeta } from './tarjeta';

// Datos de ejemplo para los negocios de demostración (DEMO_SLUGS).
// Inventados y deterministas, igual que la agenda de lib/demo/panelFixtures:
// el panel demo es público y no puede enseñar personas reales.

const CLIENTAS: [string, string, number][] = [
  ['María Fernanda L.', '618 112 4590', 6],
  ['Ana Sofía Trejo', '618 445 1120', 5],
  ['Lucía Mendoza', '618 203 7781', 3],
  ['Paulina Arreola', '618 390 6634', 2],
  ['Ximena Durán', '618 557 2048', 1],
];

export const TOKEN_DEMO = 'demo';

export function promoDemo(now: Date, timezone: string): Promo {
  const hoy = dayKey(now, timezone);
  return {
    id: 'demo-promo',
    title: 'Martes 20% en tu segundo servicio',
    details: 'Todo el mes.',
    code: 'MARTES20',
    starts_on: addDaysKey(hoy, -3),
    ends_on: addDaysKey(hoy, 25),
    active: true,
  };
}

export function lealtadDemo(now: Date, timezone: string): DatosLealtad {
  const regla = REGLA_DEFAULT;
  const ayer = new Date(now.getTime() - 86_400_000).toISOString();
  return {
    falta: false,
    regla,
    tarjetas: CLIENTAS.map(([nombre, telefono, sellos], i) => ({
      id: `demo-${i}`,
      token: TOKEN_DEMO,
      nombre,
      telefono,
      estado: estadoTarjeta(sellos, 0, regla.requeridos),
      ultimoSello: ayer,
    })),
    canjes: [
      { id: 'demo-c1', nombre: 'Daniela Ibarra', premio: regla.premio, cuando: new Date(now.getTime() - 5 * 86_400_000).toISOString() },
    ],
    promos: [promoDemo(now, timezone)],
    sinTarjeta: [],
  };
}
