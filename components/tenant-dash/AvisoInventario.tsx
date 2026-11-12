import Link from 'next/link';
import { Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { aProducto } from '@/lib/inventario/datos';
import { seAcaba } from '@/lib/inventario/logica';

// Aviso pequeño en el Resumen: "se están acabando N productos".
// Lee con el JWT de la dueña (RLS de db/049). Cualquier error —sin la
// migración, por ejemplo— no pinta nada: el Resumen nunca se cae por esto.
export async function AvisoInventario({ tenantId }: { tenantId: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inventario_productos')
    .select('id, nombre, unidad, stock, stock_minimo, costo_cents, precio_cents')
    .eq('tenant_id', tenantId);
  if (error || !data) return null;

  const bajos = data.map(aProducto).filter(seAcaba);
  if (!bajos.length) return null;

  return (
    <Link
      href="/dashboard/inventario"
      className="mt-6 flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-5 py-3.5 text-sm text-ink transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <Package className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="font-semibold">
          {bajos.length === 1 ? 'Se está acabando 1 producto' : `Se están acabando ${bajos.length} productos`}
        </span>
        <span className="text-muted"> · {bajos.slice(0, 3).map((p) => p.nombre).join(', ')}{bajos.length > 3 ? '…' : ''}</span>
      </span>
    </Link>
  );
}
