import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, Gift, Tag } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { HeroSection } from '@/components/blocks/Sections';
import { PublicShell } from '@/components/tenant-public/PublicShell';
import {
  PLATFORM_PRIMARY,
  PLATFORM_SECONDARY,
  PLATFORM_ACCENT,
  tenantCtaStyle,
  tenantGlassBackground,
  tenantDarkBase,
  withAlpha,
} from '@/lib/branding/colors';
import { isFontKey, type FontKey } from '@/lib/branding/fonts';
import { normalizeDesign } from '@/lib/templates/blocks';
import { dayKey } from '@/lib/dates/tenantTime';
import { isDemoSlug } from '@/lib/domains';
import { estadoTarjeta, promoVigente, textoRegla, tokenValido, type EstadoTarjeta } from '@/lib/lealtad/tarjeta';
import { REGLA_DEFAULT, type Promo } from '@/lib/lealtad/datos';
import { promoDemo, TOKEN_DEMO } from '@/lib/lealtad/demo';
import { tenantBookingPageUrl } from '@/lib/urls';

export const dynamic = 'force-dynamic';

// La tarjeta de lealtad de UNA clienta, sin login.
//
// El token (128 bits, no el id) es la llave: mismo modelo que
// /reservar/cita/[bookingId]. Lee con service_role porque anon no tiene
// policy sobre las tablas de lealtad, y SIEMPRE filtra por token + tenant:
// un token de otro negocio no abre nada aquí.

export const metadata: Metadata = { title: 'Tu tarjeta de lealtad', robots: { index: false, follow: false } };

function fuente(v: unknown): FontKey {
  return typeof v === 'string' && isFontKey(v) ? v : 'inter';
}

type Tarjeta = { nombre: string; estado: EstadoTarjeta; premio: string };

export default async function TarjetaPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const esDemo = isDemoSlug(slug) && token === TOKEN_DEMO;
  if (!esDemo && !tokenValido(token)) notFound();

  const db = createAdminClient();
  const { data: tenant } = await db.from('tenants').select('*').eq('slug', slug).maybeSingle();
  if (!tenant) notFound();
  if (!esDemo && tenant.lealtad_enabled !== true) notFound();

  const timezone: string | null = tenant.timezone ?? null;
  const hoy = dayKey(new Date(), timezone);
  let tarjeta: Tarjeta;
  let promos: Promo[];

  if (esDemo) {
    tarjeta = { nombre: 'María Fernanda', estado: estadoTarjeta(4, 0, REGLA_DEFAULT.requeridos), premio: REGLA_DEFAULT.premio };
    promos = [promoDemo(new Date(), timezone ?? 'America/Mexico_City')];
  } else {
    const { data: card } = await db
      .from('loyalty_cards')
      .select('id, contacts(name)')
      .eq('token', token)
      .eq('tenant_id', tenant.id)
      .maybeSingle();
    if (!card) notFound();

    const [{ data: programa }, { count: sellos }, { data: canjes }, { data: promosRaw }] = await Promise.all([
      db.from('loyalty_programs').select('stamps_required, reward').eq('tenant_id', tenant.id).maybeSingle(),
      db.from('loyalty_stamps').select('id', { count: 'exact', head: true }).eq('card_id', card.id).eq('tenant_id', tenant.id),
      db.from('loyalty_redemptions').select('stamps_used').eq('card_id', card.id).eq('tenant_id', tenant.id),
      db
        .from('promotions')
        .select('id, title, details, code, starts_on, ends_on, active')
        .eq('tenant_id', tenant.id)
        .eq('active', true)
        .limit(10),
    ]);
    const contacto = (Array.isArray(card.contacts) ? card.contacts[0] : card.contacts) as { name: string } | null;
    const requeridos = programa?.stamps_required ?? REGLA_DEFAULT.requeridos;
    tarjeta = {
      // Solo el nombre de pila: el link puede reenviarse.
      nombre: (contacto?.name ?? '').split(' ')[0],
      estado: estadoTarjeta(
        sellos ?? 0,
        (canjes ?? []).reduce((s, c) => s + c.stamps_used, 0),
        requeridos
      ),
      premio: programa?.reward ?? REGLA_DEFAULT.premio,
    };
    promos = (promosRaw ?? []) as Promo[];
  }

  const vigentes = promos.filter((p) => promoVigente(p, hoy));
  const primaryColor: string = tenant.primary_color ?? PLATFORM_PRIMARY;
  const secondaryColor: string = tenant.secondary_color ?? PLATFORM_SECONDARY;
  const accentColor: string = tenant.accent_color ?? PLATFORM_ACCENT;
  const isDark = tenant.theme_mode === 'dark';
  const darkBase = isDark ? tenantDarkBase(primaryColor, secondaryColor, accentColor) : undefined;
  const headingStyle: React.CSSProperties = {
    fontFamily: 'var(--tpl-heading-font, var(--font-heading))',
    letterSpacing: 'var(--tpl-heading-tracking)',
  };
  const { sellos, requeridos, completa } = tarjeta.estado;

  return (
    <PublicShell
      headingKey={fuente(tenant.font_heading)}
      bodyKey={fuente(tenant.font_body)}
      design={normalizeDesign(tenant.page_design ?? null)}
      isDark={isDark}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      accentColor={accentColor}
      backgroundColor={tenant.background_color ?? '#F7F6F3'}
      textColor={tenant.text_color ?? '#1A1A1A'}
    >
      <HeroSection
        variant="header"
        props={{ title: tenant.name, subtitle: '', eyebrow: '', backgroundImageUrl: '', align: 'left', ctaText: '', ctaLink: '' }}
        branding={{ primaryColor, accentColor, logoUrl: tenant.logo_url ?? null, isDark, darkBase }}
      />

      <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-8 sm:py-12">
        <section
          className="rounded-3xl border border-ink/[0.08] p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-12px_rgba(16,24,40,0.14)]"
          style={{ background: tenantGlassBackground(primaryColor, accentColor, 3, darkBase) }}
        >
          <p className="text-sm font-medium text-muted">Tarjeta de lealtad{tarjeta.nombre && ` de ${tarjeta.nombre}`}</p>
          <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight text-ink" style={headingStyle}>
            {completa ? '¡Tarjeta completa!' : `${sellos} de ${requeridos} sellos`}
          </h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
            {completa
              ? `Ganaste: ${tarjeta.premio.toLowerCase()}. Díselo a ${tenant.name} en tu próxima visita.`
              : textoRegla(requeridos, tarjeta.premio)}
          </p>

          <ol className="mt-6 grid grid-cols-5 gap-3" aria-label={`${sellos} de ${requeridos} sellos`}>
            {Array.from({ length: requeridos }, (_, i) => {
              const lleno = i < sellos;
              const ultimo = i === requeridos - 1;
              return (
                <li
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-full border-2 border-dashed"
                  style={
                    lleno
                      ? { ...tenantCtaStyle(primaryColor, accentColor), borderStyle: 'solid', borderColor: 'transparent' }
                      : { borderColor: withAlpha(accentColor, 0.45), color: withAlpha(accentColor, 0.8) }
                  }
                >
                  {lleno ? (
                    <Check className="h-1/2 w-1/2" strokeWidth={3} aria-hidden="true" />
                  ) : ultimo ? (
                    <Gift className="h-2/5 w-2/5" aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-semibold tabular-nums">{i + 1}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {vigentes.map((p) => (
          <section
            key={p.id}
            className="flex gap-3 rounded-3xl border border-ink/[0.08] p-5"
            style={{ background: tenantGlassBackground(primaryColor, accentColor, 2, darkBase) }}
          >
            <Tag className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accentColor }} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">{p.title}</p>
              {p.details && <p className="mt-0.5 text-sm text-muted">{p.details}</p>}
              {p.code && (
                <p className="mt-2 text-sm text-muted">
                  Código: <span className="font-mono font-semibold text-ink">{p.code}</span>
                </p>
              )}
            </div>
          </section>
        ))}

        {tenant.reservas_enabled !== false && (
          <a
            href={tenantBookingPageUrl(slug)}
            className="inline-flex items-center justify-center rounded-2xl px-5 py-3.5 text-[15px] font-semibold transition active:scale-[0.98]"
            style={tenantCtaStyle(primaryColor, accentColor)}
          >
            Agendar mi próxima cita
          </a>
        )}
      </div>
    </PublicShell>
  );
}
