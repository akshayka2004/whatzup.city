import { useEffect, useState } from 'react';
import { authService, User } from '../services/auth-service';

/**
 * Hook to manage authentication state
 * Usage: const { user, isLoading } = useAuth()
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load your account details. Refresh the page and try again.");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return {
    user,
    isLoading,
    error,
    signOut: () => authService.signOut(),
  };
}
