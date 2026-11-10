import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTenantStaff } from '@/lib/auth/tenantStaff';
import { isDemoSlug } from '@/lib/domains';
import { tenantShareUrl } from '@/lib/urls';
import { PLATFORM_ACCENT, PLATFORM_PRIMARY, PLATFORM_SECONDARY, contrastRatio, darkenHex, readableFgRgb, withAlpha } from '@/lib/branding/colors';
import { PLANTILLAS, TOPE, sinEmoji, type Plantilla } from '@/lib/posts/contexto';

// La imagen del post: un diseño armado con los datos reales del negocio
// (logo, colores, texto), NO generado por IA. PNG vía next/og.
//
// Bajo /api y no bajo /t/[slug]/...: proxy.ts no reescribe /api, así que
// la misma URL sirve en el subdominio del negocio y en la demo por path.
// Quién puede pedirla: el equipo del negocio (sesión + membership) con
// el módulo prendido, o cualquiera si es un negocio de demostración.
// Sin esto, cualquiera podría poner texto arbitrario con la marca de otro.

export const dynamic = 'force-dynamic';

const rgb = (triplet: string) => `rgb(${triplet.split(' ').join(',')})`;
const campo = (q: URLSearchParams, k: string, max: number) => sinEmoji(q.get(k) ?? '').slice(0, max);

async function logoDataUrl(url: string | null, origen: string): Promise<string | null> {
  // Demo: ruta relativa en public/. Subidos: Storage de Supabase (https).
  if (!url || !((url.startsWith('/') && !url.startsWith('//')) || url.startsWith('https://'))) return null;
  try {
    // satori no dibuja webp (y los logos suelen ser webp): se pide por el
    // optimizador de Next aceptando solo png/jpeg, que lo convierte.
    // Los remotos necesitan images.remotePatterns (next.config.mjs).
    const r = await fetch(`${origen}/_next/image?url=${encodeURIComponent(url)}&w=256&q=75`, {
      headers: { Accept: 'image/png,image/jpeg' },
      signal: AbortSignal.timeout(4000),
    });
    const tipo = r.headers.get('content-type') ?? '';
    if (!r.ok || !/^image\/(png|jpeg)/.test(tipo)) return null;
    return `data:${tipo};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const slug = (q.get('slug') ?? '').trim().toLowerCase();
  if (!/^[a-z0-9-]{1,63}$/.test(slug)) return new Response('Negocio inválido', { status: 400 });

  const { data: tenant, error } = await createAdminClient()
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) return new Response('No se pudo leer el negocio', { status: 500 });
  if (!tenant) return new Response('Negocio no encontrado', { status: 404 });

  const demo = isDemoSlug(slug);
  if (!demo) {
    try {
      await requireTenantStaff(slug);
    } catch {
      return new Response('Sin acceso', { status: 403 });
    }
    if (tenant.posts_enabled !== true) return new Response('Módulo apagado', { status: 403 });
  }

  const historia = q.get('f') === 'historia';
  const W = 1080;
  const H = historia ? 1920 : 1080;
  const p = q.get('p') ?? '';
  const plantilla: Plantilla = (PLANTILLAS as readonly string[]).includes(p) ? (p as Plantilla) : 'servicio';
  const titular = campo(q, 't', TOPE.titular) || tenant.name;
  const detalle = campo(q, 'd', TOPE.detalle);
  const precio = campo(q, 'pr', TOPE.precio);
  const lineas = (q.get('l') ?? '')
    .split('|')
    .map((l) => sinEmoji(l).slice(0, TOPE.linea))
    .filter(Boolean)
    .slice(0, TOPE.lineas);
  const sellos = Math.min(12, Math.max(2, Math.floor(Number(q.get('s')) || 6)));

  const P: string = tenant.primary_color ?? PLATFORM_PRIMARY;
  const S: string = tenant.secondary_color ?? PLATFORM_SECONDARY;
  const A: string = tenant.accent_color ?? PLATFORM_ACCENT;
  const fgP = rgb(readableFgRgb(P));
  const fgS = rgb(readableFgRgb(S));
  const fgA = rgb(readableFgRgb(A));
  const link = tenantShareUrl(slug).replace(/^https?:\/\//, '');
  const logo = await logoDataUrl(tenant.logo_url, new URL(req.url).origin);
  const pad = historia ? 96 : 80;
  // Fondo oscuro de la marca para la plantilla de horarios (texto blanco encima).
  const oscuro = fgP === 'rgb(255,255,255)' ? P : darkenHex(P, 90);
  // Color de los sellos sobre la tarjeta blanca: la marca si se lee, si no tinta.
  const tinta = contrastRatio(P, '#FFFFFF') >= 3 ? P : '#1a1a1a';

  const marca = (fg: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} width={104} height={104} style={{ borderRadius: 26, objectFit: 'cover', background: '#fff' }} alt="" />
      ) : (
        <div style={{ display: 'flex', width: 104, height: 104, borderRadius: 52, background: A, color: fgA, alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 700 }}>
          {tenant.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: fg, maxWidth: 760 }}>{tenant.name}</div>
    </div>
  );

  const pie = (fg: string, boton: string, fgBoton: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20 }}>
      <div style={{ display: 'flex', background: boton, color: fgBoton, fontSize: 38, fontWeight: 700, padding: '22px 44px', borderRadius: 999 }}>
        Reserva tu cita
      </div>
      <div style={{ display: 'flex', fontSize: 32, color: fg, opacity: 0.85 }}>{link}</div>
    </div>
  );

  const titulo = (fg: string, size = historia ? 112 : 96) => (
    <div style={{ display: 'flex', fontSize: titular.length > 40 ? size * 0.72 : size, fontWeight: 800, lineHeight: 1.05, color: fg, letterSpacing: -2 }}>
      {titular}
    </div>
  );

  const texto = (fg: string) =>
    detalle ? <div style={{ display: 'flex', fontSize: 40, lineHeight: 1.3, color: fg, opacity: 0.9 }}>{detalle}</div> : null;

  const marco = { display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', width: W, height: H, padding: pad };

  let cuerpo: React.ReactElement;
  switch (plantilla) {
    case 'precio':
      cuerpo = (
        <div style={{ ...marco, background: P }}>
          {marca(fgP)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {titulo(fgP)}
            {precio ? (
              <div style={{ display: 'flex' }}>
                <div style={{ display: 'flex', background: A, color: fgA, fontSize: historia ? 150 : 132, fontWeight: 800, padding: '12px 48px', borderRadius: 36 }}>
                  {precio}
                </div>
              </div>
            ) : null}
            {texto(fgP)}
          </div>
          {pie(fgP, A, fgA)}
        </div>
      );
      break;
    case 'horarios':
      cuerpo = (
        <div style={{ ...marco, background: oscuro }}>
          {marca('#fff')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {titulo('#fff', historia ? 96 : 80)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(lineas.length ? lineas : ['Todavía hay lugar esta semana']).map((l, i) => (
                <div key={i} style={{ display: 'flex', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: lineas.length > 4 ? 36 : 42, padding: '18px 32px', borderRadius: 24, borderLeft: `10px solid ${A}` }}>
                  {l}
                </div>
              ))}
            </div>
          </div>
          {pie('#fff', A, fgA)}
        </div>
      );
      break;
    case 'temporada':
      cuerpo = (
        <div style={{ ...marco, position: 'relative', backgroundImage: `linear-gradient(140deg, ${P}, ${S})` }}>
          <div style={{ display: 'flex', position: 'absolute', top: -160, right: -160, width: 520, height: 520, borderRadius: 260, background: withAlpha(A, 0.55) }} />
          <div style={{ display: 'flex', position: 'absolute', bottom: historia ? 360 : 180, left: -120, width: 300, height: 300, borderRadius: 150, background: withAlpha(A, 0.3) }} />
          {marca(fgP)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {detalle ? (
              <div style={{ display: 'flex' }}>
                <div style={{ display: 'flex', background: A, color: fgA, fontSize: 36, fontWeight: 700, padding: '12px 28px', borderRadius: 999 }}>{detalle}</div>
              </div>
            ) : null}
            {titulo(fgP, historia ? 124 : 108)}
          </div>
          {pie(fgP, '#fff', '#111')}
        </div>
      );
      break;
    case 'lealtad':
      cuerpo = (
        <div style={{ ...marco, background: S }}>
          {marca(fgS)}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {titulo(fgS, historia ? 100 : 84)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, background: '#fff', borderRadius: 40, padding: 40 }}>
              {Array.from({ length: sellos }, (_, i) => {
                const ultimo = i === sellos - 1;
                return (
                  <div key={i} style={{ display: 'flex', width: 118, height: 118, borderRadius: 59, alignItems: 'center', justifyContent: 'center', background: ultimo ? A : withAlpha(P, 0.12), border: `5px solid ${ultimo ? A : tinta}`, color: ultimo ? fgA : tinta, fontSize: ultimo ? 30 : 44, fontWeight: 800 }}>
                    {ultimo ? 'GRATIS' : String(i + 1)}
                  </div>
                );
              })}
            </div>
            {texto(fgS)}
          </div>
          {pie(fgS, P, fgP)}
        </div>
      );
      break;
    default:
      cuerpo = (
        <div style={{ ...marco, background: '#FBF8F4' }}>
          {marca('#1a1a1a')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32, borderLeft: `16px solid ${P}`, paddingLeft: 48 }}>
            {titulo('#1a1a1a')}
            {texto('#3a3a3a')}
            {precio ? <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, color: contrastRatio(P, '#FBF8F4') >= 4.5 ? P : '#1a1a1a' }}>{precio}</div> : null}
          </div>
          {pie('#1a1a1a', P, fgP)}
        </div>
      );
  }

  return new ImageResponse(cuerpo, {
    width: W,
    height: H,
    headers: { 'Cache-Control': demo ? 'public, max-age=300' : 'private, max-age=300' },
  });
}
