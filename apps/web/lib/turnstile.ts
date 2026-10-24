// Cloudflare Turnstile, loaded only when a protected request is about to be sent
// (sign-up, login, password reset) and only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is
// set. The widget runs invisibly; Cloudflare shows a checkbox in the corner only
// for visitors it can't clear silently. Each token is single-use.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TOKEN_TIMEOUT_MS = 30_000;

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  execute(id: string): void;
  reset(id: string): void;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Endpoints the API guards with TurnstileGuard. */
const PROTECTED =
  /^\/v1\/(auth\/(signup|business\/signup|civic\/signup|login|forgot-password)|customer-onboarding\/signup)$/;

export function needsTurnstile(method: string, endpoint: string): boolean {
  return !!SITE_KEY && method === 'POST' && PROTECTED.test(endpoint.split('?')[0]);
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing'));
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Resolves a fresh token, or null if Turnstile can't run (script blocked, timeout).
 * With null the request goes out without a token and the API explains the refusal.
 */
export async function getTurnstileToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !SITE_KEY) return null;
  let api: TurnstileApi;
  try {
    api = await loadScript();
  } catch {
    return null;
  }

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:60';
  document.body.appendChild(host);

  return new Promise<string | null>((resolve) => {
    let id = '';
    const done = (token: string | null) => {
      clearTimeout(timer);
      try {
        if (id) api.remove(id);
      } catch {
        // widget already gone
      }
      host.remove();
      resolve(token);
    };
    const timer = setTimeout(() => done(null), TOKEN_TIMEOUT_MS);
    try {
      id = api.render(host, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',
        execution: 'execute',
        callback: (token: string) => done(token),
        'error-callback': () => done(null),
        'timeout-callback': () => done(null),
      });
      api.execute(id);
    } catch {
      done(null);
    }
  });
}
