import { beforeEach, describe, expect, it, vi } from 'vitest';

// registerBusiness con Supabase y Resend falsos: lo que se prueba es que
// un correo caído (aviso a Bruno o confirmación) NO tumba un alta que ya
// escribió el negocio, y que el WhatsApp se valida y normaliza en server.

const inserts: { table: string; row: unknown }[] = [];

function builder(table: string) {
  const b = {
    select: () => b,
    eq: () => b,
    in: () => b,
    delete: () => b,
    insert: (row: unknown) => {
      inserts.push({ table, row });
      return b;
    },
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: { id: `${table}-id` }, error: null }),
    then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
  };
  return b;
}

const generateLink = vi.fn();
const deleteUser = vi.fn();

vi.mock('next/headers', () => ({ headers: async () => new Map([['x-forwarded-for', `1.1.1.${Math.random()}`]]) }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: builder, auth: { admin: { generateLink, deleteUser } } }),
}));
vi.mock('@/lib/email/registro', () => ({
  sendSignupConfirmation: vi.fn(async () => {
    throw new Error('Resend caído');
  }),
  sendSignupNotice: vi.fn(async () => {
    throw new Error('Resend caído');
  }),
}));

const { registerBusiness } = await import('./actions');

const input = {
  name: 'Barbería Prueba',
  giro: 'unas',
  slug: 'barberia-prueba-test',
  services: [{ name: 'Corte', minutes: 30, priceMxn: 150 }],
  days: [1, 2, 3],
  opens: '10:00',
  closes: '19:00',
  email: 'Dueno@Ejemplo.com',
  whatsapp: '618 123 4567',
  password: 'una-contrasena-larga',
  website: '',
};

describe('registerBusiness', () => {
  beforeEach(() => {
    inserts.length = 0;
    generateLink.mockReset();
    generateLink.mockResolvedValue({
      data: { user: { id: 'user-1' }, properties: { hashed_token: 'hash', verification_type: 'signup' } },
      error: null,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('completa el alta aunque fallen los dos correos', async () => {
    const r = await registerBusiness(input);
    expect(r).toEqual({ ok: true, slug: input.slug, email: 'dueno@ejemplo.com' });
    expect(deleteUser).not.toHaveBeenCalled();
    // Usuario sin confirmar: signup por generateLink, no createUser con email_confirm.
    expect(generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'dueno@ejemplo.com' }));
    expect(inserts.find((i) => i.table === 'tenant_owner_contacts')?.row).toEqual({
      tenant_id: 'tenants-id',
      whatsapp: '+526181234567',
    });
    expect((inserts.find((i) => i.table === 'tenants')?.row as { status: string }).status).toBe('trial');
  });

  it('un ?ref= inválido o inexistente no liga referido ni tumba el alta', async () => {
    for (const ref of ['no existe', 'negocio-fantasma']) {
      inserts.length = 0;
      const r = await registerBusiness({ ...input, ref });
      expect(r.ok).toBe(true);
      expect(inserts.some((i) => i.table === 'referrals')).toBe(false);
    }
  });

  it('rechaza un WhatsApp inválido antes de crear nada', async () => {
    const r = await registerBusiness({ ...input, whatsapp: '12345' });
    expect(r.ok).toBe(false);
    expect(generateLink).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
  });
});
