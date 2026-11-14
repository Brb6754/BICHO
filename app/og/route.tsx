import { ImageResponse } from 'next/og';

// Edge: el runtime de Node carga sharp, que no siempre trae binario (en
// Windows local tumbó el dev server). En edge usa WASM y no lo necesita.
export const runtime = 'edge';

// Imagen Open Graph de las páginas de marketing: /og?t=<título>. Una sola
// ruta y no un opengraph-image por carpeta, porque un archivo en app/
// también lo heredarían las páginas de los negocios, que no son de bicho.
export async function GET(request: Request) {
  const titulo = (new URL(request.url).searchParams.get('t') ?? 'Agenda de citas en línea').slice(0, 90);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#5B34E8', padding: 72, color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 40, fontWeight: 800 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: '#D4F23A' }} />
          bicho
        </div>
        <div style={{ display: 'flex', fontSize: titulo.length > 50 ? 64 : 80, fontWeight: 800, lineHeight: 1, letterSpacing: -2, textTransform: 'uppercase' }}>{titulo}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, color: '#E3DEFA' }}>
          <span>15 días gratis · sin tarjeta</span>
          <span style={{ color: '#D4F23A' }}>bichomx.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } }
  );
}
