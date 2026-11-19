import { afterEach, describe, expect, it, vi } from 'vitest';

const enviado = vi.hoisted(() => ({ ultimo: null as null | { subject: string; html: string } }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: async (m: { subject: string; html: string }) => void (enviado.ultimo = m) };
  },
}));

import { sendBookingConfirmation } from './sendBookingConfirmation';

const base = {
  customerEmail: 'dani@correo.com',
  customerName: 'Dani',
  businessName: 'Salón A',
  serviceName: 'Corte',
  startsAt: '2026-11-20T17:00:00.000Z',
  manageUrl: 'https://bichomx.com/t/salon-a/reservar/cita/b-1',
  accentColor: '#8FE24A',
  timezone: 'America/Mexico_City',
};

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  enviado.ultimo = null;
});

describe('correo de cita con anticipo', () => {
  it('apartada: no dice "confirmada", da monto, hora local de vencimiento y link de pago', async () => {
    process.env.RESEND_API_KEY = 're_test';
    await sendBookingConfirmation({
      ...base,
      anticipo: { montoMxn: 150, venceEn: '2026-11-18T18:15:00.000Z', pagoUrl: 'https://mp.test/pagar?a=1&b=2' },
    });
    const m = enviado.ultimo!;
    expect(m.subject).toContain('Falta tu anticipo');
    expect(m.html).not.toContain('Cita confirmada');
    expect(m.html).toContain('$150');
    expect(m.html).toContain('12:15'); // 18:15 UTC = 12:15 en CDMX
    expect(m.html).toContain('https://mp.test/pagar?a=1&amp;b=2');
    // Acento lima: el texto del botón va oscuro, no blanco.
    expect(m.html).toContain('color: rgb(17, 24, 21)');
  });

  it('apartada sin link: dice que el negocio dirá cómo pagar', async () => {
    process.env.RESEND_API_KEY = 're_test';
    await sendBookingConfirmation({ ...base, anticipo: { montoMxn: 150, venceEn: '2026-11-18T18:15:00.000Z', pagoUrl: null } });
    expect(enviado.ultimo!.html).toContain('te dirá cómo pagar');
  });

  it('sin anticipo: la confirmación de siempre', async () => {
    process.env.RESEND_API_KEY = 're_test';
    await sendBookingConfirmation(base);
    expect(enviado.ultimo!.subject).toContain('Cita confirmada');
    expect(enviado.ultimo!.html).not.toContain('Anticipo');
  });
});
