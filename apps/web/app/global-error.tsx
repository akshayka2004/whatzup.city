'use client';

/**
 * Last-resort boundary: replaces the whole document, so it can't rely on the
 * app's providers or Tailwind tokens being mounted — inline styles only.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F5F2',
          color: '#20242F',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 .5rem' }}>Whtzup.city is having a moment</h1>
          <p style={{ color: '#667085', margin: '0 0 1.25rem', fontSize: '.95rem' }}>
            Something went wrong on our side. Please reload — it usually fixes itself.
          </p>
          {error.digest && <p style={{ color: '#98A2B3', fontSize: '.75rem' }}>Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '.5rem',
              minHeight: 44,
              padding: '0 1.5rem',
              borderRadius: 14,
              border: 0,
              background: '#B86F50',
              color: '#fff',
              fontWeight: 600,
              fontSize: '.95rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
