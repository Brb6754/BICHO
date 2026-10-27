import { Sparkle } from '@/components/marketing/Flourishes';

// La cinta: una franja morada ladeada que cruza de una sección a otra,
// como cinta adhesiva sobre el collage, con los módulos corriendo en
// letra gorda. Es el gesto de campaña que le faltaba al cuerpo de la
// página (Bruno: "métele más punch").
//
// Reutiliza el mecanismo del ticker que ya existe en `globals.css`
// (`.ticker-shell` / `.ticker-track`): la lista va dos veces y la pista
// se mueve exactamente -50%, así el ciclo no salta. Con "reducir
// movimiento" no se congela —parada se leería como un error—: avanza más
// lento, que es la regla que ese mismo CSS ya documenta.
//
// Toda la cinta es `aria-hidden`: repite nombres que la página ya dice
// en su contenido, y un lector de pantalla no tiene por qué leerlos dos
// veces más.
const PALABRAS = ['Reservas', 'Reuniones', 'Cotizaciones', 'Facturación', 'Tus clientes', 'A la medida'];

export function Cinta() {
  return (
    // El contenedor recorta lo que la rotación saca de la pantalla (sin
    // él habría scroll horizontal) y deja aire arriba y abajo para que
    // las esquinas ladeadas no se corten. El margen negativo es lo que
    // monta la cinta sobre las DOS secciones que cruza.
    <div aria-hidden="true" className="relative z-20 -my-12 overflow-hidden py-10 sm:-my-14 sm:py-12">
      <div className="ticker-shell -ml-[5%] w-[110%] -rotate-2 bg-[#5B34E8] py-4 shadow-[0_8px_0_#14092E] sm:py-5">
        <div className="ticker-track flex w-max" style={{ ['--ticker-duration' as string]: '40s' }}>
          {[0, 1].map((copia) => (
            <ul key={copia} className="flex shrink-0 items-center">
              {PALABRAS.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-7 pr-7 font-[family-name:var(--font-display)] text-[clamp(1.7rem,4.2vw,3.2rem)] font-extrabold uppercase leading-none text-white"
                >
                  {p}
                  <Sparkle className="h-[0.6em] w-[0.6em] text-[#D4F23A]" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
