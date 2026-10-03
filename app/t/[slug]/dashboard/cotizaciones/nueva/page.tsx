import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/tenant-dash/PageHeader';
import { QuoteForm } from '../QuoteForm';

export const dynamic = 'force-dynamic';

export default async function NuevaCotizacionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Consulta separada de todo lo demás: las columnas de impuesto son de
  // db/027, y si falta correrla el formulario arranca con 16% en vez de
  // romperse.
  const { data: tenant } = await supabase
    .from('tenants')
    .select('tax_rate, tax_label')
    .eq('slug', slug)
    .maybeSingle();

  return (
    <div>
      <Link
        href="/dashboard/cotizaciones"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Cotizaciones
      </Link>

      <div className="mt-2">
        <PageHeader
          title="Nueva cotización"
          description="El nombre del cliente y los conceptos. Lo demás es opcional."
        />
      </div>

      <QuoteForm
        slug={slug}
        taxRateDefault={Number(tenant?.tax_rate ?? 16)}
        taxLabel={tenant?.tax_label ?? 'IVA'}
      />
    </div>
  );
}
