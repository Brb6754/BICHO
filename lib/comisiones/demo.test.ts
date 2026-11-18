import { describe, expect, it } from 'vitest';
import { demoComisiones, ventasDemo } from './demo';
import { periodoDe } from './calculo';

// La demo cuenta UNA historia: lo que Comisiones dice que vendió cada
// quien sale de los mismos cobros de cita que enseña la Caja demo, y la
// lista de citas de cada persona suma exactamente su "vendió".
describe('demoComisiones', () => {
  const now = new Date('2026-11-17T18:00:00Z');
  const timezone = 'America/Mexico_City';
  const services = [
    { id: 's1', name: 'Corte', price_cents: 25000 },
    { id: 's2', name: 'Tinte', price_cents: 90000 },
  ];
  const resources = [
    { id: 'r1', name: 'Ana' },
    { id: 'r2', name: 'Luz' },
  ];
  const citas = [
    {
      id: 'a1',
      starts_at: '2026-11-16T17:00:00Z',
      status: 'completed',
      resource_id: 'r2',
      service_type_id: 's2',
      service_types: { name: 'Tinte' },
      customers: { name: 'Marta' },
    },
  ];
  const hoy = '2026-11-17';
  const rango = periodoDe('quincena', hoy);

  it('cuadra con las ventas de cita de la Caja demo', () => {
    const { filas } = demoComisiones('casa-luma', { resources, services, citas, timezone, now }, rango, hoy);
    const caja = ventasDemo('casa-luma', services, timezone, now, citas)
      .filter((m) => m.tipo === 'venta' && m.bookingId && !(m as { porCobrar?: boolean }).porCobrar)
      .filter((m) => m.dia >= rango.desde && m.dia <= rango.hasta)
      .reduce((s, m) => s + m.montoCents, 0);
    expect(filas.reduce((s, f) => s + f.vendidoCents, 0)).toBe(caja);
  });

  it('las citas de cada persona suman lo que vendió', () => {
    const { filas, detalle } = demoComisiones('casa-luma', { resources, services, citas, timezone, now }, rango, hoy);
    for (const f of filas) {
      const suyas = detalle.filter((c) => c.resourceId === f.resourceId);
      expect(suyas.length).toBe(f.citas);
      expect(suyas.reduce((s, c) => s + c.precioCents, 0)).toBe(f.vendidoCents);
    }
  });
});
