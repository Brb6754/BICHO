import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Mail, MessageCircle, Phone } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { computeTotals, formatMoney, formatFolio } from '@/lib/quotes/totals';
import { appointmentWhen, dayKey, longDate } from '@/lib/dates/tenantTime';
import { ContactNotes } from './ContactNotes';

export const dynamic = 'force-dynamic';

// LA FICHA — la pantalla que justifica que exista `contacts`.
//
// Todo lo que pasó con una persona, en una sola línea de tiempo: sus
// citas, sus cotizaciones y sus facturas mezcladas por fecha. Antes esa
// pregunta no se podía contestar en ningún lado: las citas vivían en una
// pantalla, las cotizaciones en otra, y las facturas en una tercera.
//
// Lee con service_role porque `contacts`, `quotes` e `invoices` tienen
// RLS sin policies — guardan teléfonos, RFC, montos y notas sobre
// personas. La membresía se comprueba antes, en requireTenantStaff.

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// "5 oct" desde el día local del negocio. Se parte la cadena de dayKey
// en vez de construir un Date: es una fecha de calendario, no un
// instante, y convertirla es de donde salen los desfases de un día que
// este proyecto ya corrigió tres veces.
function fechaCorta(iso: string, timezone: string | null) {
  const [anio, mes, dia] = dayKey(iso, timezone).split('-');
  return { dia: String(Number(dia)), mes: MESES[Number(mes) - 1], anio };
}

type Evento = {
  id: string;
  tipo: 'cita' | 'cotizacion' | 'factura';
  cuando: string;
  titulo: string;
  detalle: string;
  href?: string;
  tono: 'normal' | 'atenuado' | 'alerta';
};

export default async function ContactPage({
  params,
}: {
  params: Promise<{ slug: string; contactId: string }>;
}) {
  const { slug, contactId } = await params;

  const { tenantId, timezone } = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  const db = createAdminClient();

  const { data: contacto, error } = await db
    .from('contacts')
    .select('id, name, phone, email, tags, notes, rfc, razon_social, created_at')
    .eq('id', contactId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    return (
      <div>
        <PageHeader title="Cliente" />
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/037_contacts.sql</code> en
            Supabase para activar las fichas de cliente.
          </p>
        </div>
      </div>
    );
  }
  if (!contacto) notFound();
  if (!productos.reservas && !productos.cotizaciones && !productos.facturacion) {
    redirect('/dashboard');
  }

  const [{ data: citas }, { data: cotizaciones }, { data: facturas }] = await Promise.all([
    db
      .from('bookings')
      .select('id, starts_at, status, customers!inner(contact_id), service_types(name)')
      .eq('tenant_id', tenantId)
      .eq('customers.contact_id', contactId)
      .order('starts_at', { ascending: false }),
    db
      .from('quotes')
      .select('id, folio, status, created_at, tax_rate, discount_cents')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId),
    db
      .from('invoices')
      .select('id, uuid_fiscal, serie, folio, status, total_cents, stamped_at, created_at')
      .eq('tenant_id', tenantId)
      .eq('contact_id', contactId),
  ]);

  const quoteIds = (cotizaciones ?? []).map((q) => q.id);
  const { data: partidas } = quoteIds.length
    ? await db
        .from('quote_items')
        .select('quote_id, quantity, unit_price_cents')
        .in('quote_id', quoteIds)
    : { data: [] as { quote_id: string; quantity: number; unit_price_cents: number }[] };

  const eventos: Evento[] = [];

  for (const c of (citas ?? []) as unknown as {
    id: string;
    starts_at: string;
    status: string;
    service_types: { name: string } | null;
  }[]) {
    eventos.push({
      id: `cita-${c.id}`,
      tipo: 'cita',
      cuando: c.starts_at,
      titulo: c.service_types?.name ?? 'Cita',
      detalle: appointmentWhen(c.starts_at, timezone),
      tono: c.status === 'no_show' ? 'alerta' : c.status === 'cancelled' ? 'atenuado' : 'normal',
    });
  }

  for (const q of cotizaciones ?? []) {
    const total = computeTotals(
      (partidas ?? [])
        .filter((p) => p.quote_id === q.id)
        .map((p) => ({
          description: '',
          quantity: Number(p.quantity),
          unitPriceCents: p.unit_price_cents,
        })),
      { discountCents: q.discount_cents, taxRate: Number(q.tax_rate) }
    ).totalCents;

    eventos.push({
      id: `cot-${q.id}`,
      tipo: 'cotizacion',
      cuando: q.created_at,
      titulo: `Cotización #${formatFolio(q.folio)} · ${formatMoney(total)}`,
      detalle: ETIQUETA_COTIZACION[q.status] ?? q.status,
      href: '/dashboard/cotizaciones',
      tono: q.status === 'declined' ? 'atenuado' : q.status === 'accepted' ? 'normal' : 'alerta',
    });
  }

  for (const f of facturas ?? []) {
    eventos.push({
      id: `fac-${f.id}`,
      tipo: 'factura',
      cuando: f.stamped_at ?? f.created_at,
      titulo: `Factura ${f.serie ?? ''}${f.folio ?? ''} · ${formatMoney(f.total_cents)}`,
      detalle:
        f.status === 'stamped'
          ? `Folio fiscal ${f.uuid_fiscal ?? '—'}`
          : f.status === 'cancelled'
            ? 'Cancelada'
            : 'Sin timbrar',
      href: '/dashboard/facturas',
      tono: f.status === 'stamped' ? 'normal' : 'atenuado',
    });
  }

  eventos.sort((a, b) => new Date(b.cuando).getTime() - new Date(a.cuando).getTime());

  const tel = contacto.phone ?? '';

  return (
    <div>
      <Link
        href="/dashboard/customers"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Clientes
      </Link>

      <PageHeader
        title={contacto.name}
        description={`Cliente desde ${longDate(contacto.created_at, timezone)}`}
      />

      {/* Escribirle es lo que alguien viene a hacer a esta pantalla, así
          que va antes que cualquier dato. En un teléfono los tres botones
          abren la app correspondiente. */}
      {(tel || contacto.email) && (
        <div className="mt-6 flex flex-wrap gap-2">
          {tel && (
            <>
              <a
                href={`https://wa.me/${tel}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-[rgb(var(--color-cta-fg))]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp
              </a>
              <a
                href={`tel:${tel}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                Llamar
              </a>
            </>
          )}
          {contacto.email && (
            <a
              href={`mailto:${contacto.email}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04]"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Correo
            </a>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section>
          <h2 className="text-[15px] font-semibold text-ink">Historial</h2>

          {eventos.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <p className="text-sm text-muted">
                Todavía no hay nada registrado con esta persona.
              </p>
            </div>
          ) : (
            /* Una superficie para todo el historial, no una tarjeta por
               evento, y una columna de fecha alineada a la izquierda:
               exactamente lo que hace la agenda con la hora. Un cliente
               con veinte movimientos se escanea por esa columna. */
            <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
              {eventos.map((e, i) => {
                const f = fechaCorta(e.cuando, timezone);
                const anioPasado = f.anio !== String(new Date().getFullYear());
                return (
                  <li key={e.id} className={i > 0 ? 'border-t border-border' : ''}>
                    <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start gap-x-4 px-4 py-3.5 sm:px-5">
                      <div className={e.tono === 'atenuado' ? 'opacity-50' : ''}>
                        <p className="text-base font-semibold tabular-nums leading-none text-ink">
                          {f.dia} <span className="text-sm font-medium text-muted">{f.mes}</span>
                        </p>
                        {/* El año solo cuando no es este: en un historial
                            de meses, repetirlo en cada renglón es ruido. */}
                        {anioPasado && (
                          <p className="mt-1 text-[11px] leading-none tabular-nums text-muted">
                            {f.anio}
                          </p>
                        )}
                      </div>

                      <div className={'min-w-0 ' + (e.tono === 'atenuado' ? 'opacity-50' : '')}>
                        <p className="text-[15px] text-ink">
                          {e.href ? (
                            <Link href={e.href} className="underline-offset-4 hover:underline">
                              {e.titulo}
                            </Link>
                          ) : (
                            e.titulo
                          )}
                        </p>
                        <p
                          className={
                            'mt-0.5 truncate text-[13px] ' +
                            (e.tono === 'alerta' ? 'font-medium text-warning' : 'text-muted')
                          }
                        >
                          {e.detalle}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <ContactNotes
            slug={slug}
            contactId={contacto.id}
            notes={contacto.notes}
            tags={contacto.tags ?? []}
          />

          {/* Los datos fiscales solo se enseñan si existen: un bloque
              vacío en cada ficha sería ruido para los negocios que no
              facturan. Se llenan solos al emitir la primera factura. */}
          {contacto.rfc && (
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="text-[15px] font-semibold text-ink">Datos fiscales</h2>
              <p className="mt-3 text-sm text-ink">{contacto.razon_social ?? contacto.name}</p>
              <p className="mt-1 text-sm tabular-nums text-muted">{contacto.rfc}</p>
              <p className="mt-3 text-xs text-muted">
                Se usan para prellenar su próxima factura.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

const ETIQUETA_COTIZACION: Record<string, string> = {
  draft: 'Borrador, sin enviar',
  sent: 'Enviada, sin respuesta',
  viewed: 'La abrió y no ha contestado',
  accepted: 'Aceptada',
  declined: 'Rechazada',
  expired: 'Venció',
};
