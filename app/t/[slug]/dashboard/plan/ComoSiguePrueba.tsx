// Qué pasa con la prueba, en fechas y sin asustar: hasta cuándo es gratis,
// que al terminar no se cobra nada solo, y que pausar no borra nada.
// Las fechas llegan ya escritas en la zona del negocio (longDate).
export function ComoSiguePrueba({ finPrueba, finGracia }: { finPrueba: string; finGracia: string }) {
  const pasos = [
    { color: 'bg-success', titulo: `Hasta el ${finPrueba}:`, texto: 'todo funciona igual y no pagas nada. No te pedimos tarjeta.' },
    {
      color: 'bg-warning',
      titulo: 'Al terminar:',
      texto: `no se te cobra nada solo. Tu página sigue recibiendo citas hasta el ${finGracia} para que actives tu plan con calma.`,
    },
    {
      color: 'bg-ink/25',
      titulo: 'Si no lo activas:',
      texto: 'tu página se pausa y deja de recibir citas nuevas. Tus clientes, citas y servicios se quedan guardados; al activarlo vuelve al momento.',
    },
  ];
  return (
    <section aria-labelledby="como-prueba" className="mt-4 rounded-2xl bg-surface p-5 ring-1 ring-border">
      <h2 id="como-prueba" className="text-[15px] font-semibold text-ink">
        Cómo sigue tu prueba
      </h2>
      <ol className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-ink">
        {pasos.map((p) => (
          <li key={p.titulo} className="flex gap-3">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${p.color}`} aria-hidden="true" />
            <span>
              <strong className="font-semibold">{p.titulo}</strong> {p.texto}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
