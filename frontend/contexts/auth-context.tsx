"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { authApi, AuthResponse, AuthUser, LoginData, RegisterData } from "@/lib/api/auth";
import { usersApi } from "@/lib/api/users";
import { getJwtMaxAgeSeconds } from "@/lib/auth-token";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<AuthUser>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAuthSession = useCallback(async (revoke = false) => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    await fetch(revoke ? "/api/auth/logout" : "/api/auth/cookies", {
      method: revoke ? "POST" : "DELETE",
    });
  }, []);

  const logout = useCallback(async () => {
    await clearAuthSession(true);
    router.push("/login");
  }, [clearAuthSession, router]);

  const scheduleTokenRefresh = useCallback(function scheduleNextRefresh(
    accessToken?: string,
  ) {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    const maxAgeSeconds = getJwtMaxAgeSeconds(accessToken, 15 * 60);
    const refreshInMs = Math.max(30, maxAgeSeconds - 60) * 1000;

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        if (!response.ok) {
          throw new Error("Unable to refresh session");
        }
        const payload = (await response.json().catch(() => ({}))) as {
          accessToken?: string;
        };
        scheduleNextRefresh(payload.accessToken);
      } catch {
        await clearAuthSession();
      }
    }, refreshInMs);
  }, [clearAuthSession]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }

      try {
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
        });
        if (!refreshResponse.ok) {
          throw new Error("Session refresh failed");
        }

        const payload = (await refreshResponse.json().catch(() => ({}))) as {
          accessToken?: string;
        };
        const freshUser = await usersApi.getMe();

        if (!isMounted) {
          return;
        }

        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        setUser(freshUser);
        scheduleTokenRefresh(payload.accessToken);
      } catch {
        if (isMounted) {
          setUser(null);
          localStorage.removeItem(USER_KEY);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [scheduleTokenRefresh]);

  useEffect(() => {
    const handleUnauthorized = () => {
      void clearAuthSession();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [clearAuthSession]);

  const applyAuthSession = useCallback(async (response: AuthResponse) => {
    await fetch("/api/auth/cookies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: response.accessToken, refreshToken: response.refreshToken }),
    });
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setUser(response.user);
    scheduleTokenRefresh(response.accessToken);
    return response.user;
  }, [scheduleTokenRefresh]);

  const login = useCallback(async (data: LoginData) => {
    const response = await authApi.login(data);
    return applyAuthSession(response);
  }, [applyAuthSession]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const response = await authApi.googleLogin({ idToken });
    return applyAuthSession(response);
  }, [applyAuthSession]);

  const register = useCallback(async (data: RegisterData) => {
    await authApi.register(data);
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
