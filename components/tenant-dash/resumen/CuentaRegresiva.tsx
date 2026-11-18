'use client';

import { useEffect, useState } from 'react';
import { enCuanto } from './comun';

// "Empieza en 25 min", al día: se recalcula cada 30 s. El servidor ya
// manda el texto correcto, así que sin JavaScript se lee igual.
export function CuentaRegresiva({ inicio, fin, terminaA, ahora }: { inicio: string; fin: string; terminaA: string; ahora: string }) {
  const [now, setNow] = useState(() => new Date(ahora).getTime());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const a = new Date(inicio).getTime();
  if (now >= new Date(fin).getTime()) return <>Ya terminó</>;
  if (now >= a) return <>En curso, termina {terminaA}</>;
  return <>Empieza {enCuanto(a - now).toLowerCase()}</>;
}
