'use client';

import { useEffect, useState } from 'react';

// Un número que cuenta desde cero al entrar (estilo Póster). El HTML del
// servidor ya trae el valor final: sin JavaScript, o con movimiento
// reducido, se ve el número quieto y correcto desde el primer cuadro.
export function CuentaArriba({ valor, pesos = false }: { valor: number; pesos?: boolean }) {
  const [n, setN] = useState(valor);
  useEffect(() => {
    if (!valor || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    let raf = 0;
    const paso = (t: number) => {
      const k = Math.min(1, (t - t0) / 1100);
      setN(Math.round(valor * (1 - Math.pow(1 - k, 4))));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [valor]);
  const texto = pesos
    ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n / 100)
    : String(n);
  return <span className="tabular-nums">{texto}</span>;
}
