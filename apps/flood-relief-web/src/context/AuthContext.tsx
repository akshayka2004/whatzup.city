import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchCurrentUser, login as loginRequest, type LoginInput } from "@/api/auth";
import type { AdminUser } from "@/types";

interface AuthContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "kfr_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const { token, user: loggedInUser } = await loginRequest(input);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
