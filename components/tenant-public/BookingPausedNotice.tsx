import { createClient } from '@/lib/supabase/server';
import { acceptsNewBookings } from '@/lib/billing/trial';

type Contact = { phone: string; kind: 'call' | 'whatsapp' };

// El teléfono del negocio vive en su bloque "Botón de contacto"; no hay
// columna propia en tenants.
export function contactFromBlocks(blocks: unknown): Contact | null {
  if (!Array.isArray(blocks)) return null;
  for (const b of blocks) {
    const props = (b as { type?: string; props?: { phone?: unknown; kind?: unknown } })?.props;
    if ((b as { type?: string })?.type !== 'contact_button' || typeof props?.phone !== 'string') continue;
    const digits = props.phone.replace(/\D/g, '');
    if (digits.length >= 8) return { phone: digits, kind: props.kind === 'call' ? 'call' : 'whatsapp' };
  }
  return null;
}

/** null si el negocio acepta reservas; si no, lo necesario para el aviso. */
export async function bookingPause(slug: string): Promise<{ name: string; contact: Contact | null } | null> {
  const supabase = await createClient();
  // select('*'): tolera que db/042 o db/044 no estén corridas (sin columnas = no se bloquea).
  const { data } = await supabase.from('tenants').select('*').eq('slug', slug).maybeSingle();
  if (!data || acceptsNewBookings(data)) return null;
  return { name: data.name as string, contact: contactFromBlocks(data.page_blocks) };
}

export function BookingPausedNotice({ name, contact }: { name: string; contact: Contact | null }) {
  // wa.me pide el número con lada de país; un número de 10 dígitos es de México.
  const waNumber = contact && contact.phone.length === 10 ? `52${contact.phone}` : contact?.phone;
  return (
    <main className="force-light flex min-h-screen items-center justify-center bg-paper px-4 py-16 text-ink">
      <div className="w-full max-w-md rounded-3xl bg-surface p-8 text-center shadow-sm ring-1 ring-border">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Por ahora no estamos tomando reservas en línea. Si quieres agendar, contáctanos directamente.
        </p>
        {contact && (
          <a
            href={contact.kind === 'whatsapp' ? `https://wa.me/${waNumber}` : `tel:${contact.phone}`}
            className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:opacity-90"
          >
            {contact.kind === 'whatsapp' ? 'Escríbenos por WhatsApp' : `Llámanos: ${contact.phone}`}
          </a>
        )}
      </div>
    </main>
  );
}
