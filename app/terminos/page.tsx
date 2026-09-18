import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/marketing/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — bicho',
  description: 'Las condiciones de uso del servicio de reservas bicho para negocios.',
};

// DRAFT — same flag as privacidad/page.tsx: written to be specific and
// useful (matches what's actually built — 15-day trial, manual/mailto
// billing today, no automated payment processor yet per CLAUDE.md), but
// still needs a real legal review before this is the final text.
export default function TerminosPage() {
  return (
    <LegalPageLayout title="Términos y Condiciones" updated="7 de septiembre de 2026">
      <p>
        Al crear una cuenta de negocio en bicho, aceptas estas condiciones. Si eres
        cliente final reservando una cita con un negocio que usa bicho, lo que aplica
        para ti es el{' '}
        <a href="/privacidad" className="underline">
          Aviso de Privacidad
        </a>
        , no este documento.
      </p>

      <section>
        <h2 className="text-lg font-semibold text-[#140F2E]">Qué es bicho</h2>
        <p className="mt-2">
          bicho es una plataforma que le da a tu negocio una página de reservas con tu
          propia marca, un panel para administrar citas, recursos y servicios, y
          confirmaciones automáticas por correo.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#140F2E]">Tu cuenta</h2>
        <p className="mt-2">
          Eres responsable de la información que cargas sobre tu negocio y de mantener
          segura tu contraseña. Tienes que ser mayor de edad y tener autoridad real para
          representar al negocio que estás registrando.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#140F2E]">Prueba y suscripción</h2>
        <p className="mt-2">
          Empiezas con 15 días de prueba sin tarjeta. Después de la prueba, seguir
          usando bicho requiere un plan pago — hoy coordinamos el cobro directamente
          por correo, sin un procesador de pagos automático todavía. Puedes cancelar
          cuando quieras escribiéndonos.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#140F2E]">Los datos de tus clientes</h2>
        <p className="mt-2">
          Cuando alguien reserva una cita con tu negocio a través de bicho, tú eres
          responsable de usar esos datos correctamente — para lo que la persona
          esperaría (gestionar su cita), no para otra cosa.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#140F2E]">Disponibilidad del servicio</h2>
        <p className="mt-2">
          Hacemos lo posible por mantener bicho funcionando sin interrupciones, pero no
          garantizamos que el servicio esté disponible el 100% del tiempo. Si algo se
          rompe, priorizamos arreglarlo.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#140F2E]">Límite de responsabilidad</h2>
        <p className="mt-2">
          Usas bicho bajo tu propio riesgo comercial. No respondemos por pérdidas de
          negocio indirectas (por ejemplo, una cita perdida por una falla puntual del
          servicio) más allá de lo que hayas pagado por tu suscripción ese mes.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#140F2E]">Cambios a estos términos</h2>
        <p className="mt-2">
          Si cambiamos algo importante, lo vamos a anunciar en esta misma página con una
          nueva fecha de actualización arriba.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#140F2E]">Contacto</h2>
        <p className="mt-2">
          Cualquier duda sobre estos términos, escríbenos a{' '}
          <a href="mailto:nonameynk@gmail.com" className="underline">
            nonameynk@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
