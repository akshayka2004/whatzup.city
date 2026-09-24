// ============================================================
// API service — same-origin fetch via Next.js /api proxy.
// Auto-refreshes the access token on 401 then retries once.
// ============================================================

export interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Plain-language fallback for when the server gave no usable message. */
function statusMessage(status: number): string {
  switch (status) {
    case 0:
      return "Can't reach the server. Check your internet connection and try again.";
    case 400:
      return 'The request was not accepted. Check the details you entered and try again.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find what you asked for. It may have been moved or removed.";
    case 408:
    case 504:
      return 'The server took too long to respond. Please try again.';
    case 409:
      return 'That conflicts with something that already exists.';
    case 413:
      return 'The file or data you sent is too large.';
    case 415:
      return 'That file type is not supported.';
    case 422:
      return 'Some of the details you entered are not valid. Check the form and try again.';
    case 429:
      return 'Too many attempts in a short time. Wait a minute and try again.';
    case 502:
    case 503:
      return 'The service is temporarily unavailable. Please try again in a moment.';
    default:
      return status >= 500
        ? 'The server ran into a problem. Please try again, and contact support if it continues.'
        : `The request failed (error ${status}). Please try again.`;
  }
}

// Bare framework defaults ("Forbidden resource") say nothing useful — replace them.
const GENERIC_MESSAGE =
  /^(unauthorized|forbidden( resource)?|not found|bad request|internal server error|too many requests|conflict|service unavailable|bad gateway|gateway timeout|throttlerexception.*|http \d+)$/i;

/** Turns an error response body into one readable sentence. */
async function readError(response: Response): Promise<string> {
  let raw: unknown;
  try {
    const body = await response.json();
    raw = body?.message ?? body?.error;
  } catch {
    // Non-JSON body (e.g. a proxy's HTML error page) — fall through to the status text.
  }
  if (Array.isArray(raw)) {
    // class-validator returns one entry per failed field.
    raw = raw
      .map((m) => String(m).trim())
      .filter(Boolean)
      .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
      .join('. ');
  }
  if (typeof raw !== 'string' || !raw.trim() || GENERIC_MESSAGE.test(raw.trim())) {
    return statusMessage(response.status);
  }
  return raw;
}

function networkError(error: unknown): string {
  const msg = error instanceof Error ? error.message : '';
  // Browsers report a dead connection as a bare TypeError ("Failed to fetch" / "Load failed").
  if (!msg || /failed to fetch|load failed|networkerror|network request failed/i.test(msg)) {
    return statusMessage(0);
  }
  return msg;
}

class ApiService {
  // IMPORTANT: Always route through Next.js proxy (/api → server-side rewrite).
  // Bare-metal HTTP deployment requires same-origin requests for cookies + CORS.
  private baseURL = '/api';

  // Single in-flight refresh promise so concurrent 401s share one refresh call
  private refreshing: Promise<boolean> | null = null;

  /**
   * Attempt to refresh the access token. Uses the refresh_token cookie set
   * by the API on login/signup. Returns true on success, false otherwise.
   * Concurrent callers share one refresh roundtrip.
   */
  private async tryRefresh(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;

    this.refreshing = (async () => {
      try {
        const res = await fetch(`${this.baseURL}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: '{}',
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        // Release the lock on next tick so concurrent retries see resolved value
        setTimeout(() => {
          this.refreshing = null;
        }, 0);
      }
    })();

    return this.refreshing;
  }

  /**
   * Core fetch wrapper with 401 → refresh → retry loop.
   * `skipAuthRetry` prevents infinite loops on the refresh endpoint itself.
   */
  private async request<T>(
    method: Method,
    endpoint: string,
    body?: unknown,
    skipAuthRetry = false,
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    try {
      let response = await fetch(url, init);

      // Auto-refresh on 401 (skip for auth endpoints to avoid loops)
      if (
        response.status === 401 &&
        !skipAuthRetry &&
        !endpoint.includes('/auth/login') &&
        !endpoint.includes('/auth/refresh') &&
        !endpoint.includes('/auth/signup')
      ) {
        const refreshed = await this.tryRefresh();
        if (refreshed) {
          response = await fetch(url, init);
        }
      }

      if (!response.ok) {
        return {
          data: null as unknown as T,
          error: await readError(response),
          status: response.status,
        };
      }

      // 204 No Content has no body
      if (response.status === 204) {
        return { data: null as unknown as T, error: null, status: 204 };
      }

      const data = await response.json();
      return { data, error: null, status: response.status };
    } catch (error) {
      return {
        data: null as unknown as T,
        error: networkError(error),
        status: 0,
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body);
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, body);
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint);
  }

  /**
   * Multipart upload. Sends FormData WITHOUT a Content-Type header so the
   * browser sets the correct multipart boundary. Shares the 401→refresh→retry
   * behaviour of request().
   */
  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const init: RequestInit = {
      method: 'POST',
      credentials: 'include',
      body: formData,
    };

    try {
      let response = await fetch(url, init);

      if (response.status === 401) {
        const refreshed = await this.tryRefresh();
        if (refreshed) {
          response = await fetch(url, init);
        }
      }

      if (!response.ok) {
        return { data: null as unknown as T, error: await readError(response), status: response.status };
      }

      if (response.status === 204) {
        return { data: null as unknown as T, error: null, status: 204 };
      }

      const data = await response.json();
      return { data, error: null, status: response.status };
    } catch (error) {
      return {
        data: null as unknown as T,
        error: networkError(error),
        status: 0,
      };
    }
  }
}

export const apiService = new ApiService();
