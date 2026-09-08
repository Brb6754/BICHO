import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/marketing/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Aviso de Privacidad — bicho',
  description: 'Cómo bicho recaba, usa y protege los datos personales de negocios y sus clientes.',
};

// DRAFT — written to be genuinely useful and specific to what this app
// actually collects (verified against the real schema: db/001_schema.sql
// customers/bookings, db/009 tenant branding, business_users), not
// boilerplate filler. Still needs a real legal review (LFPDPPP
// compliance specifics) before this is the final text — same "flag it,
// don't silently ship it as fact" rule already applied to the
// placeholder pricing in PricingSection.tsx.
export default function PrivacidadPage() {
  return (
    <LegalPageLayout title="Aviso de Privacidad" updated="7 de septiembre de 2026">
      <p>
        Este aviso explica qué datos personales recaba bicho, para qué los usa, y qué
        derechos tienes sobre ellos — ya seas dueño de un negocio que usa bicho, o
        cliente final de uno de esos negocios.
      </p>

      <section>
        <h2 className="text-lg font-semibold text-[#0B1A10]">Quién es responsable de tus datos</h2>
        <p className="mt-2">
          bicho (&quot;nosotros&quot;) es responsable del tratamiento de los datos personales
          que recabamos a través de esta plataforma. Para cualquier duda sobre este
          aviso o tus datos, escríbenos a{' '}
          <a href="mailto:nonameynk@gmail.com" className="underline">
            nonameynk@gmail.com
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#0B1A10]">Qué datos recabamos</h2>
        <p className="mt-2">Depende de cómo uses bicho:</p>
        <ul className="mt-2 list-disc pl-5">
          <li>
            <strong>Si reservas una cita</strong> en la página de un negocio: tu nombre,
            correo (opcional) y cualquier nota que agregues sobre la cita.
          </li>
          <li>
            <strong>Si administrás un negocio</strong> en bicho: tu nombre, correo y
            contraseña de acceso, además de los datos de tu negocio (colores de marca,
            logo, servicios, horarios) y los de tus propios clientes que reservan
            contigo.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#0B1A10]">Para qué los usamos</h2>
        <ul className="mt-2 list-disc pl-5">
          <li>Crear y administrar tu cita (o las citas de tu negocio).</li>
          <li>Mandarte confirmaciones y avisos de cambios por correo.</li>
          <li>Darte acceso a tu cuenta si administras un negocio.</li>
          <li>Mantener el servicio funcionando y corregir problemas.</li>
        </ul>
        <p className="mt-2">
          No usamos tus datos para publicidad, y no los vendemos a nadie.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#0B1A10]">Con quién los compartimos</h2>
        <p className="mt-2">
          Con los proveedores que necesitamos para operar bicho — hosting (Vercel),
          base de datos (Supabase) y envío de correos (Resend) — solo en la medida
          necesaria para prestar el servicio. Ninguno de ellos puede usar tus datos
          para otro fin.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#0B1A10]">Tus derechos</h2>
        <p className="mt-2">
          Puedes pedirnos acceder a tus datos, corregirlos, o que los borremos, escribiendo
          a{' '}
          <a href="mailto:nonameynk@gmail.com" className="underline">
            nonameynk@gmail.com
          </a>
          . Si eres cliente final de un negocio (no administras la cuenta), también puedes
          pedirle directamente a ese negocio que borre tus datos.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#0B1A10]">Cambios a este aviso</h2>
        <p className="mt-2">
          Si cambiamos este aviso de forma importante, lo vamos a anunciar en esta misma
          página con una nueva fecha de actualización arriba.
        </p>
      </section>
    </LegalPageLayout>
  );
}
