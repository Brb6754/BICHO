import { Download } from 'lucide-react';

// La landing promete que sus datos son suyos: aquí se los lleva.
// href público, sin /t/{slug} (lo reescribe proxy.ts); lo sirve
// dashboard/exportar/route.ts, que vuelve a revisar que sea la dueña.
export function DescargarDatos({ esDueno }: { esDueno: boolean }) {
  return (
    <section className="mt-12" aria-labelledby="tus-datos">
      <h2 id="tus-datos" className="mb-1 text-[17px] font-semibold tracking-tight text-ink">
        Descargar mis datos
      </h2>
      <p className="mb-4 text-[15px] leading-relaxed text-muted">
        Tus clientes y tus citas son tuyos, aunque dejes bicho. Se descargan como archivo para Excel.
      </p>
      {esDueno ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          {[
            { tipo: 'clientes', label: 'Descargar mis clientes' },
            { tipo: 'citas', label: 'Descargar mis citas' },
          ].map(({ tipo, label }) => (
            <a
              key={tipo}
              href={`/dashboard/exportar?tipo=${tipo}`}
              download
              className="inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-2xl border border-border px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 max-sm:w-full"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {label}
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Solo el dueño del negocio puede descargar los datos.</p>
      )}
    </section>
  );
}
