import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { productosDe } from '@/lib/products';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmForm } from '@/components/ui/ConfirmForm';
import { MODALIDADES, type Modalidad } from '@/lib/meetings/kinds';
import { NuevoTipo } from './NuevoTipo';
import { deleteMeetingType, setMeetingTypeActive } from '../actions';

export const dynamic = 'force-dynamic';

// Los tipos de reunión: lo que el prospecto elige al agendar.
//
// Viven en `service_types` con `kind = 'reunion'` (db/039) y por eso
// NO aparecen en el catálogo de servicios: ahí serían filas con precio
// $0 que nadie puede explicar, y en la página pública de citas serían
// un servicio que no se vende.

export default async function TiposPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tenantId } = await requireTenantStaff(slug);
  const productos = await productosDe(slug);
  if (!productos.reuniones) redirect('/dashboard');

  const db = createAdminClient();
  const { data: tipos, error } = await db
    .from('service_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('kind', 'reunion')
    .order('created_at');

  if (error) {
    return (
      <div>
        <PageHeader title="Tipos de reunión" />
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Falta correr una migración</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Corre <code className="rounded bg-ink/[0.06] px-1.5 py-0.5">db/039_reuniones.sql</code>{' '}
            en el SQL Editor de Supabase y recarga esta página.
          </p>
        </div>
      </div>
    );
  }

  const activos = (tipos ?? []).filter((t) => t.active).length;

  return (
    <div>
      <Link
        href="/dashboard/reuniones"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Reuniones
      </Link>

      <PageHeader
        title="Tipos de reunión"
        description="Lo que alguien elige al agendar contigo. Solo los activos se ofrecen en tu página."
      />

      <div className="mt-6">
        <NuevoTipo slug={slug} />
      </div>

      {(tipos ?? []).length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={CalendarClock}
            title="Todavía no hay tipos de reunión"
            description="Crea el primero —una videollamada de 30 minutos suele ser el que más se usa— y tu página empieza a aceptar reuniones."
          />
        </div>
      ) : (
        <>
          <p className="mt-8 text-xs text-muted">
            {activos} {activos === 1 ? 'activo' : 'activos'} de {(tipos ?? []).length}
          </p>
          <ul className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            {(tipos ?? []).map((t, i) => {
              const m = MODALIDADES[t.modality as Modalidad];
              return (
                <li key={t.id} className={i > 0 ? 'border-t border-border' : ''}>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
                    <div className={'min-w-0 ' + (t.active ? '' : 'opacity-55')}>
                      <p className="font-medium text-ink">{t.name}</p>
                      <p className="mt-0.5 text-sm text-muted">
                        {t.duration_minutes} min · {m?.label ?? 'Sin modalidad'}
                        {!t.active && ' · No se ofrece'}
                      </p>
                      {m && <p className="mt-0.5 text-xs text-muted">{m.ayuda}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Activar y desactivar es reversible de un clic, así
                          que no pide confirmación. Borrar sí. */}
                      <form action={setMeetingTypeActive.bind(null, slug, t.id, !t.active)}>
                        <button
                          type="submit"
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          {t.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </form>

                      <ConfirmForm
                        action={deleteMeetingType.bind(null, t.id, slug)}
                        confirmTitle="Borrar tipo de reunión"
                        confirmMessage={`¿Borrar "${t.name}"? Si ya hay reuniones agendadas con este tipo, mejor desactívalo: así deja de ofrecerse y las que ya existen conservan su nombre.`}
                        confirmLabel="Sí, borrarlo"
                        dismissLabel="No, conservarlo"
                        triggerClassName="px-3 py-1.5 text-xs"
                      >
                        Borrar
                      </ConfirmForm>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
