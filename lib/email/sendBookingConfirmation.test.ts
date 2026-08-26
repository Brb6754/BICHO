import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sendBookingConfirmation } from './sendBookingConfirmation';

describe('sendBookingConfirmation', () => {
  const original = process.env.RESEND_API_KEY;

  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    if (original) process.env.RESEND_API_KEY = original;
  });

  it('resolves without throwing when RESEND_API_KEY is not configured', async () => {
    // Bookings must keep working even before Bruno adds a Resend key —
    // this is the exact safety property /api/reservar depends on to
    // await this call without risking turning a successful booking
    // into a 500.
    await expect(
      sendBookingConfirmation({
        customerEmail: 'test@example.com',
        customerName: 'Test',
        businessName: 'Test Salon',
        serviceName: 'Corte',
        startsAt: new Date().toISOString(),
      })
    ).resolves.toBeUndefined();
  });
});
