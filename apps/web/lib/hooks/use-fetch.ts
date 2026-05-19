import { useEffect, useState } from 'react';

export interface UseFetchOptions {
  skip?: boolean;
  dependencies?: unknown[];
}

export interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching data from an API endpoint
 * Usage: const { data, isLoading, error } = useFetch<MyType>('/api/endpoint')
 */
export function useFetch<T = unknown>(
  url: string,
  options: UseFetchOptions = {},
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await window.fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(
    () => {
      if (options.skip) return;
      fetch();
    },
    options.dependencies || [url],
  );

  return {
    data,
    isLoading,
    error,
    refetch: fetch,
  };
}
