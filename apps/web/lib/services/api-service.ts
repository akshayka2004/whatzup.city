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
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          errorMsg = errBody.message || errBody.error || errorMsg;
        } catch {}
        return {
          data: null as unknown as T,
          error: errorMsg,
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
        error: error instanceof Error ? error.message : 'Unknown error',
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
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          errorMsg = errBody.message || errBody.error || errorMsg;
        } catch {}
        return { data: null as unknown as T, error: errorMsg, status: response.status };
      }

      if (response.status === 204) {
        return { data: null as unknown as T, error: null, status: 204 };
      }

      const data = await response.json();
      return { data, error: null, status: response.status };
    } catch (error) {
      return {
        data: null as unknown as T,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
      };
    }
  }
}

export const apiService = new ApiService();
