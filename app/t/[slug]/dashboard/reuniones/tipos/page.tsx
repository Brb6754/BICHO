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
    // La causa real va al log del servidor; a la dueña nunca se le enseña un nombre de archivo.
    console.error('reuniones/tipos/page.tsx: falta db/039_reuniones.sql?', error.message);
    return (
      <div>
        <PageHeader title="Tipos de reunión" />
        <div className="mt-8 rounded-2xl bg-surface p-6 ring-1 ring-border">
          <p className="text-[15px] font-medium text-ink">Esta sección todavía no está lista en tu cuenta</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            No es nada que hayas hecho tú. Escríbenos y la dejamos lista; mientras, el resto de tu panel funciona igual.
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
        description="Las opciones que alguien ve al agendar contigo, por ejemplo una videollamada de 30 minutos o una visita a domicilio."
      />

      <div className="mt-6">
        <NuevoTipo slug={slug} />
      </div>

      {(tipos ?? []).length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={CalendarClock}
            title="Todavía no hay tipos de reunión"
            description="Escribe arriba un nombre, cuánto dura y cómo ocurre, y toca Agregar."
            why="Sin al menos uno, tu página no puede aceptar reuniones: es lo que el prospecto elige primero."
            example="Diagnóstico por videollamada · 30 min"
          />
        </div>
      ) : (
        <>
          <p className="mt-8 text-xs text-muted">
            {activos} de {(tipos ?? []).length} se {activos === 1 ? 'ofrece' : 'ofrecen'} en tu página
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
                        {!t.active && ' · Oculto de tu página'}
                      </p>
                      {m && <p className="mt-0.5 text-xs text-muted">{m.ayuda}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Activar y desactivar es reversible de un clic, así
                          que no pide confirmación. Borrar sí. */}
                      <form action={setMeetingTypeActive.bind(null, slug, t.id, !t.active)}>
                        <button
                          type="submit"
                          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          {t.active ? 'Ocultar de tu página' : 'Ofrecer en tu página'}
                        </button>
                      </form>

                      <ConfirmForm
                        action={deleteMeetingType.bind(null, t.id, slug)}
                        confirmTitle="Borrar tipo de reunión"
                        confirmMessage={`¿Borrar "${t.name}"? Si ya hay reuniones agendadas con este tipo, mejor ocúltalo de tu página: así deja de ofrecerse y las que ya existen conservan su nombre.`}
                        confirmLabel="Sí, borrarlo"
                        dismissLabel="No, conservarlo"
                        triggerClassName="min-h-11 px-4 text-sm"
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
