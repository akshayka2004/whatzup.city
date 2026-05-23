// API service - Placeholder for API calls
// Replace with your actual API endpoints and logic

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

class ApiService {
  // IMPORTANT: Always route through Next.js proxy (/api → server-side rewrite to API host).
  // Using a direct API URL from the browser causes (1) CORS preflight failure,
  // (2) missing /api global prefix → 404, and (3) cookie issues across origins.
  // Bare-metal HTTP deployment REQUIRES same-origin requests.
  private baseURL = '/api';

  /**
   * Generic GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

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

      const data = await response.json();
      return { data, error: null, status: 200 };
    } catch (error) {
      return {
        data: null as unknown as T,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  /**
   * Generic POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

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

      const data = await response.json();
      return { data, error: null, status: 200 };
    } catch (error) {
      return {
        data: null as unknown as T,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  /**
   * Generic PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

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

      const data = await response.json();
      return { data, error: null, status: 200 };
    } catch (error) {
      return {
        data: null as unknown as T,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }

  /**
   * Generic DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

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

      const data = await response.json();
      return { data, error: null, status: 200 };
    } catch (error) {
      return {
        data: null as unknown as T,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500,
      };
    }
  }
}

export const apiService = new ApiService();
