'use client';

// The last-resort boundary: only fires when the ROOT layout itself
// (app/layout.tsx) throws, which means it has to render its own
// <html>/<body> — it replaces the root layout entirely instead of
// nesting inside it, so globals.css / Tailwind classes can't be
// trusted to be loaded. Inline styles only, on purpose.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
          padding: '0 1.5rem',
          background: '#F7F6F3',
          color: '#1A1A1A',
        }}
      >
        <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>La aplicación tuvo un error inesperado.</p>
        <p style={{ maxWidth: '24rem', fontSize: '0.875rem', color: '#6B6B6B' }}>
          Intenta recargar la página. Si el problema sigue, contacta al equipo.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: '9999px',
            padding: '0.625rem 1.5rem',
            background: '#4F46E5',
            color: 'white',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
