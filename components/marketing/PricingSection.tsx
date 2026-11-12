import { Check } from 'lucide-react';
import { SectionOpener } from './Primitives';
import { Reveal } from './Reveal';
import { DotField } from './DotField';

import { PLANES, PLAN_IDS, PRECIO_FUNDADOR_MXN, CUPO_FUNDADOR, type PlanId } from '@/lib/billing/planes';

// Tres planes (decisión de Bruno, 2026-11-11): Esencial $299, Negocio $499
// (destacado), Pro $799. Precios y contenido salen de lib/billing/planes.ts;
// aquí solo las líneas de venta. WhatsApp no aparece: es un extra aparte.
const INCLUDED: Record<PlanId, string[]> = {
  esencial: [
    'Tu página de reservas con tu logo, colores y servicios',
    'Agenda, clientes y servicios sin límite',
    'Confirmación y recordatorios por correo',
    'Tus clientes reagendan o cancelan solos',
  ],
  negocio: [
    'Todo lo de Esencial',
    'Caja: ventas, gastos y corte del día',
    'Tarjeta de lealtad y clientes que regresan',
    'Inventario y comisiones por persona',
  ],
  pro: [
    'Todo lo de Negocio',
    'Cotizaciones y reuniones',
    'Facturación con 100 timbres al mes',
    'Copiloto con IA (500 preguntas al mes)',
  ],
};

export function PricingSection() {
  return (
    <section id="precios" className="relative overflow-hidden bg-[#F5F3FC] px-6 py-14 sm:py-24 lg:py-28">
      <DotField />
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <SectionOpener
            eyebrow="Precios"
            title="Tres planes, sin letras chiquitas."
            intro={`Guía RESICO y referidos van gratis en todos. Los 15 días de prueba no piden tarjeta, y los primeros ${CUPO_FUNDADOR} negocios que paguen Negocio se quedan en $${PRECIO_FUNDADOR_MXN} para siempre.`}
          />
        </Reveal>

        <Reveal delay={90}>
          <div className="mt-10 grid gap-6 sm:mt-16 lg:grid-cols-3">
            {PLAN_IDS.map((id) => {
              const plan = PLANES[id];
              const destacado = id === 'negocio';
              return (
                <div
                  key={id}
                  className={`flex flex-col rounded-[28px] bg-white p-6 sm:p-8 ${
                    destacado ? 'ring-2 ring-inset ring-[#5B34E8]' : 'ring-1 ring-inset ring-[#140F2E]/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-[#140F2E]">{plan.nombre}</p>
                    {/* El lima nunca es texto sobre blanco (1.4:1): relleno con tinta encima. */}
                    {destacado && (
                      <span className="rounded-full bg-[#D4F23A] px-3 py-1 text-xs font-semibold text-[#140F2E]">
                        El más elegido
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,7vw,3.5rem)] font-bold leading-none text-[#140F2E]">
                      ${plan.precio}
                    </span>
                    <span className="text-base font-semibold text-[#6A6488]">MXN</span>
                  </div>
                  <p className="mt-2 text-sm text-[#6A6488]">al mes, por negocio</p>

                  <ul className="mt-6 flex-1 space-y-3 border-t border-[#140F2E]/[0.08] pt-6">
                    {INCLUDED[id].map((item) => (
                      <li key={item} className="flex gap-3 text-[15px] leading-snug text-[#3A3170]">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5B34E8]" strokeWidth={2.5} aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={`/registro?plan=${id}`}
                    className={`mt-8 inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#140F2E] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                      destacado ? 'bg-[#140F2E] text-[#D4F23A] hover:bg-[#2A1B5E]' : 'bg-[#140F2E]/[0.06] text-[#140F2E] hover:bg-[#140F2E]/[0.1]'
                    }`}
                  >
                    Empezar prueba de 15 días
                  </a>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-[13px] leading-snug text-[#6A6488]">
            Cambias de plan o cancelas cuando quieras. Si cancelas, tu página deja de recibir citas nuevas y tus datos siguen
            siendo tuyos.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
