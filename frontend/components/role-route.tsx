"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/types";

interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

export function RoleRoute({
  children,
  allowedRoles,
  fallbackPath = "/profile/settings",
}: RoleRouteProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const allowedRoleSet = new Set<string>(allowedRoles);
  const hasRole = user?.roles?.some((role) => allowedRoleSet.has(role));

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !hasRole)) {
      router.replace(!isAuthenticated ? "/login" : fallbackPath);
    }
  }, [fallbackPath, hasRole, isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !hasRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
