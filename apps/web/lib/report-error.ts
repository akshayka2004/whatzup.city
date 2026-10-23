// Sends a browser error to the API, which forwards it to Sentry when configured.
// A beacon instead of an SDK keeps the client bundle small; one report per
// distinct message per page load so a render loop can't flood the endpoint.
const sent = new Set<string>();

export function reportClientError(error: Error & { digest?: string }) {
  if (typeof window === 'undefined' || !error) return;
  const message = String(error.message || error.name || 'Unknown error').slice(0, 500);
  if (sent.has(message) || sent.size >= 5) return;
  sent.add(message);
  const body = JSON.stringify({
    message,
    stack: error.stack?.slice(0, 4000),
    digest: error.digest?.slice(0, 100),
    path: window.location.pathname.slice(0, 200),
  });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon?.('/api/v1/client-errors', blob)) return;
    void fetch('/api/v1/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never throw from an error boundary.
  }
}
