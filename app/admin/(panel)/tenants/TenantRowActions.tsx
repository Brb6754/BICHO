'use client';

import { useState } from 'react';
import { Eye, Link2, Check } from 'lucide-react';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

export function TenantRowActions({ tenantId, slug }: { tenantId: string; slug: string }) {
  const [copied, setCopied] = useState(false);

  async function copyBookingLink() {
    const url = `${window.location.protocol}//${slug}.${ROOT_DOMAIN}/reservar`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dropdown>
      <DropdownItem icon={Eye} href={`/tenants/${tenantId}`}>
        Ver detalle
      </DropdownItem>
      <DropdownItem icon={copied ? Check : Link2} onClick={copyBookingLink}>
        {copied ? 'Enlace copiado' : 'Copiar enlace de reserva'}
      </DropdownItem>
    </Dropdown>
  );
}
