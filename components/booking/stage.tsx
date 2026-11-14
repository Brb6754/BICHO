'use client';

import { createContext, useContext, useState } from 'react';

// En qué parte del proceso va la persona, compartido entre el flujo de
// reserva y la página que lo rodea.
//
// La página pública tiene dos caras: la PORTADA (quién es el negocio,
// cuándo abre, dónde está, qué ofrece) mientras se elige el servicio, y
// el FLUJO a pantalla completa en cuanto se avanza a fecha, hora y
// datos. BookingFlow informa su paso; la portada y los bloques
// informativos se esconden solos cuando ese paso pasa del primero.
//
// Opcional a propósito: el demo de la plataforma y el editor de
// plantillas renderizan BookingFlow sin este proveedor y se quedan
// exactamente como estaban.

type Stage = { step: number; setStep: (n: number) => void };

const StageContext = createContext<Stage | null>(null);

export function BookingStageProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(0);
  return <StageContext.Provider value={{ step, setStep }}>{children}</StageContext.Provider>;
}

export function useBookingStage(): Stage | null {
  return useContext(StageContext);
}

/**
 * Visible solo en el inicio. Se pliega en altura (la fila de la rejilla
 * va de 1fr a 0fr) y se desvanece, en vez de desaparecer de golpe: el
 * flujo sube a ocupar su lugar y se entiende de dónde vino. `inert`
 * saca lo plegado del orden de tabulación y del lector de pantalla.
 */
export function StartOnly({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const stage = useBookingStage();
  const open = !stage || stage.step === 0;
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      } ${className}`}
      inert={!open}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * La rejilla de la página. En escritorio, mientras se elige servicio, la
 * información del negocio vive en una columna lateral junto al flujo;
 * al avanzar, la columna se va y el flujo se centra solo.
 */
export function StageLayout({
  cover,
  flow,
  aside,
}: {
  cover: React.ReactNode;
  flow: React.ReactNode;
  aside: React.ReactNode;
}) {
  const stage = useBookingStage();
  const home = !stage || stage.step === 0;
  return (
    <>
      <StartOnly>{cover}</StartOnly>
      <div
        className={`mx-auto w-full sm:px-6 ${
          home && aside
            ? 'max-w-2xl lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10'
            : 'max-w-2xl lg:max-w-4xl'
        } ${home ? 'sm:pb-16' : 'sm:py-8'}`}
      >
        <div id="reservar" className="min-w-0 scroll-mt-4">
          {flow}
        </div>
        {aside && (
          <StartOnly className="lg:sticky lg:top-6">
            {aside}
          </StartOnly>
        )}
      </div>
    </>
  );
}
