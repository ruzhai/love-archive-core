"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { SessionUser } from "./auth-types";

// ==================== Types ====================

interface AuthState {
  user: SessionUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  csrfToken: string | null;
}

interface LoginResult {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isAdmin: false,
  isLoading: true,
  login: async () => ({ success: false, error: "AuthProvider not mounted" }),
  logout: async () => {},
  csrfToken: null,
});

// ==================== Helpers ====================

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? match[1] : null;
}

async function fetchSession(): Promise<{
  authenticated: boolean;
  user: SessionUser | null;
}> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (!res.ok) return { authenticated: false, user: null };
    return await res.json();
  } catch {
    return { authenticated: false, user: null };
  }
}

// ==================== Provider ====================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Hydrate session on mount
  useEffect(() => {
    fetchSession().then((data) => {
      if (data.authenticated && data.user) {
        setUser(data.user);
      }
      setIsLoading(false);
      // CSRF token is set by the session API response cookie
      setCsrfToken(getCsrfTokenFromCookie());
    });
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      try {
        // Refresh CSRF token before login
        const csrfTok = getCsrfTokenFromCookie();

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfTok || "",
          },
          credentials: "include",
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (data.success) {
          setUser(data.user);
          setCsrfToken(getCsrfTokenFromCookie());
          return { success: true };
        }

        return {
          success: false,
          error: data.error || "登录失败",
          retryAfter: data.retryAfter,
        };
      } catch {
        return { success: false, error: "网络错误，请稍后再试" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const csrfTok = getCsrfTokenFromCookie();
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": csrfTok || "" },
        credentials: "include",
      });
    } catch {
      // Logout should always succeed locally
    }
    setUser(null);
    setCsrfToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
        isLoading,
        login,
        logout,
        csrfToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ==================== Hook ====================

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
