import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { getMe } from "@/lib/auth.functions";
import { TOKEN_KEY } from "@/lib/auth.constants";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  roles: string[];
  is_admin: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setToken: (token: string) => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
  setToken: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await getMe();
      setUser(profile);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setToken = useCallback(
    (token: string) => {
      localStorage.setItem(TOKEN_KEY, token);
      refresh();
    },
    [refresh],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refresh,
        setToken,
        signOut: async () => {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
