'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { startPlanCheckout } from './actions';

export function ActivatePlanButton({ slug, label }: { slug: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    const res = await startPlanCheckout(slug);
    if (res.ok) {
      window.location.href = res.url;
      return;
    }
    setError(res.error);
    setLoading(false);
  }

  return (
    <div>
      <Button onClick={go} isLoading={loading}>
        {label}
      </Button>
      {error && (
        <p className="mt-3 text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
