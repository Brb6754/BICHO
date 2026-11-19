import { HelpTip } from '@/components/tenant-dash/ui/HelpTip';

// Lo que le falta a un negocio para poder hacer facturas, paso a paso.
// Vive aparte porque lo enseñan dos pantallas: la lista de facturas y
// "Hacer una factura" (si alguien entra directo por el enlace).
export function PasosConectar() {
  return (
    <section className="mt-8 rounded-3xl bg-surface p-5 ring-1 ring-border sm:p-7" aria-labelledby="conectar-titulo">
      <h2 id="conectar-titulo" className="text-[17px] font-semibold tracking-tight text-ink">
        Para hacer facturas te faltan 3 cosas (se hace una sola vez)
      </h2>
      <ol className="mt-4 flex flex-col gap-4">
        <Paso n={1} titulo="Tu RFC">
          Viene en tu constancia de situación fiscal.
        </Paso>
        <Paso
          n={2}
          titulo="Tu sello digital"
          ayuda={
            <HelpTip title="¿Qué es el sello digital?">
              Es como tu firma para facturas (el SAT le dice CSD). Son dos archivos que bajas gratis del portal del SAT con tu
              e.firma. Si tu contador te lleva las cuentas, casi seguro ya los tiene.
            </HelpTip>
          }
        >
          Se pide gratis en el SAT con tu e.firma. El paso a paso está en Impuestos (RESICO).
        </Paso>
        <Paso n={3} titulo="Firmar la carta manifiesto">
          Un permiso en línea para que bicho mande tus facturas al SAT.
        </Paso>
      </ol>
      <p className="mt-5 rounded-2xl bg-paper px-4 py-3 text-sm leading-relaxed text-ink ring-1 ring-border">
        Tú no configuras nada: cuando tengas tu sello digital, mándanoslo y nosotros conectamos tu negocio.
      </p>
    </section>
  );
}

function Paso({ n, titulo, ayuda, children }: { n: number; titulo: string; ayuda?: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.07] text-[13px] font-semibold tabular-nums text-ink"
      >
        {n}
      </span>
      <div>
        {/* div y no p: el popover de HelpTip es un div. El -my compensa
            los 44 px del botón para no desalinear el número del paso. */}
        <div className="flex items-center text-[15px] font-medium text-ink">
          {titulo}
          {ayuda && <span className="-my-3">{ayuda}</span>}
        </div>
        <p className="mt-0.5 text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}
