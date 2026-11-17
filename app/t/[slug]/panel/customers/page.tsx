import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { ContactDirectory } from '@/components/tenant-dash/ContactDirectory';
import { cargarPanelDemo } from '@/lib/demo/panelData';
import { buildDirectory, type ContactSeedRow } from '@/lib/contacts/directory';

export const dynamic = 'force-dynamic';

// Clientes: el MISMO directorio del panel real (ContactDirectory +
// buildDirectory) sobre las citas de ejemplo, con su buscador y sus
// secciones. Antes la demo tenía su propia lista, distinta de la real:
// quien la veía aprendía una pantalla que no iba a encontrar al entrar.
//
// Las citas de la demo no traen contacto, así que se agrupan por NOMBRE
// para armar uno por persona: en los datos de ejemplo el teléfono no va
// amarrado al nombre (dos personas distintas comparten número), y agrupar
// por teléfono juntaba a cinco clientas en una.
export default async function ClientesDemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const datos = await cargarPanelDemo(slug);
  if (!datos) notFound();

  const { citas, now, tenant } = datos;

  const contactos = new Map<string, ContactSeedRow>();
  const bookings = citas.map((c) => {
    const nombre = c.customers?.name ?? 'Clienta';
    const tel = c.customers?.phone ?? null;
    const id = `demo-${nombre}`;
    if (!contactos.has(id)) {
      contactos.set(id, { id, name: nombre, phone: tel, email: null, tags: [], notes: null, rfc: null });
    }
    return { contact_id: id, starts_at: c.starts_at, status: c.status };
  });

  const entries = buildDirectory([...contactos.values()], bookings, [], [], now, tenant.timezone);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Busca a cualquier cliente, llámale o mira quién dejó de venir."
      />
      {/* hrefBase null: en la demo no hay ficha que abrir. */}
      <ContactDirectory entries={entries} now={now} timezone={tenant.timezone} hrefBase={null} />
    </div>
  );
}
