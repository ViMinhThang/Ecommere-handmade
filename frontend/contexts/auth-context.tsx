"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { authApi, AuthResponse, AuthUser, LoginData, RegisterData } from "@/lib/api/auth";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "auth_user";
const ACCESS_TOKEN_KEY = "auth_access_token_client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    await fetch("/api/auth/cookies", { method: "DELETE" });
    router.push("/login");
  }, [router]);

  const scheduleTokenRefresh = useCallback(function scheduleNextRefresh() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const response = await authApi.refresh();
        await fetch("/api/auth/cookies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: response.accessToken, refreshToken: response.refreshToken }),
        });
        localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
        scheduleNextRefresh();
      } catch {
        logout();
      }
    }, 20 * 24 * 60 * 60 * 1000); // Refresh after 20 days (safely within 32-bit limit)
  }, [logout]);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        scheduleTokenRefresh();
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, [scheduleTokenRefresh]);

  const applyAuthSession = useCallback(async (response: AuthResponse) => {
    await fetch("/api/auth/cookies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: response.accessToken, refreshToken: response.refreshToken }),
    });
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    setUser(response.user);
    scheduleTokenRefresh();
  }, [scheduleTokenRefresh]);

  const login = useCallback(async (data: LoginData) => {
    const response = await authApi.login(data);
    await applyAuthSession(response);
  }, [applyAuthSession]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const response = await authApi.googleLogin({ idToken });
    await applyAuthSession(response);
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
