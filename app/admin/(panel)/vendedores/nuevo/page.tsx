import Link from 'next/link';
import { Text } from '@/components/ui/Text';
import { ResellerForm } from '../ResellerForm';

export default function NewResellerPage() {
  return (
    <div>
      <Link href="/vendedores" className="text-sm text-muted hover:underline">
        ← Vendedores
      </Link>
      <Text variant="h1" className="mt-2">
        Nuevo vendedor
      </Text>
      <Text variant="body" className="mt-1 max-w-xl text-muted">
        Regístralo aquí y después créale su acceso al panel. Su comisión se puede cambiar cuando quieras: se
        recalcula sola sobre sus negocios activos.
      </Text>

      <div className="mt-6">
        <ResellerForm />
      </div>
    </div>
  );
}
