/**
 * Talks to the gate-scanner API (/api/v1/scan). Crew are not signed in as users: they hold a crew
 * token from a pass code, kept on the phone and sent in the x-crew-token header. This deliberately
 * does not use apiService, which sends the user's cookies and refreshes user sessions.
 */

const SESSION_KEY = 'crew_session_v1';
const DEVICE_KEY = 'crew_device_id';

export interface CrewSession {
  token: string;
  pass: { id: string; label: string; level: 'SCAN' | 'DESK'; validUntil: string };
  event: { id: string; title: string; venue: string | null; startDate: string; endDate: string };
}

export class CrewError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
  /** The pass was revoked, expired or the event ended: sign in again. */
  get sessionLost() {
    return this.status === 401 && this.code === 'CREW_SESSION_INVALID';
  }
}

/** Random id kept on this phone so a pass can be limited to a few devices. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function loadSession(): CrewSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as CrewSession;
    return new Date(s.pass.validUntil).getTime() > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(s: CrewSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* the scanner still works until the page is closed */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

async function call<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1/scan${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(opts.token ? { 'x-crew-token': opts.token } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: 'no-store',
    });
  } catch {
    // Offline or the server is unreachable. Callers must not admit anyone on a guess.
    throw new CrewError('No connection. Do not let people in until it is back.', 0, 'NETWORK');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CrewError(
      body?.message || `Something went wrong (${res.status}).`,
      res.status,
      body?.code,
    );
  }
  return body as T;
}

export const crewLogin = (code: string) =>
  call<CrewSession>('/login', { method: 'POST', body: { code, deviceId: deviceId() } });

export interface ScanResponse {
  result: 'VALID' | 'DUPLICATE' | 'INVALID' | 'WRONG_EVENT' | 'CANCELLED' | 'OUTSIDE_WINDOW';
  message: string;
  manual?: boolean;
  ticket?: {
    id: string;
    holderName: string;
    code: string;
    isGuest: boolean;
    registrant?: string;
    checkedInAt?: string | null;
    checkedInBy?: string | null;
  };
}

export interface CrewStats {
  expected: number;
  checkedIn: number;
  remaining: number;
  venueCapacity: number | null;
  overVenueCapacity: boolean;
  perMinute: number;
  mine: number;
  recent: { id: string; holderName: string; checkedInAt: string }[];
}

export interface CrewSearchHit {
  id: string;
  holderName: string;
  code: string;
  isGuest: boolean;
  registrant: string;
  status: 'ISSUED' | 'CHECKED_IN';
  checkedInAt: string | null;
}

export const crewApi = (token: string) => ({
  scan: (qr: string) => call<ScanResponse>('/check-in', { method: 'POST', body: { qr }, token }),
  byCode: (code: string) => call<ScanResponse>('/code', { method: 'POST', body: { code }, token }),
  manual: (ticketId: string) =>
    call<ScanResponse>('/manual', { method: 'POST', body: { ticketId }, token }),
  undo: (ticketId: string) =>
    call<{ undone: boolean; message: string }>('/undo', {
      method: 'POST',
      body: { ticketId },
      token,
    }),
  search: (q: string) =>
    call<{ data: CrewSearchHit[] }>(`/search?q=${encodeURIComponent(q)}`, { token }),
  stats: () => call<CrewStats>('/stats', { token }),
  logout: () => call<{ signedOut: boolean }>('/logout', { method: 'POST', token }),
});
