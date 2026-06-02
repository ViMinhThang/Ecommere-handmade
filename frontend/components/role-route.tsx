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
  deniedRoles?: UserRole[];
  fallbackPath?: string;
}

export function RoleRoute({
  children,
  allowedRoles,
  deniedRoles = [],
  fallbackPath = "/profile/settings",
}: RoleRouteProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const allowedRoleSet = new Set<string>(allowedRoles);
  const deniedRoleSet = new Set<string>(deniedRoles);
  const hasRole = user?.roles?.some((role) => allowedRoleSet.has(role));
  const hasDeniedRole = user?.roles?.some((role) => deniedRoleSet.has(role));

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !hasRole || hasDeniedRole)) {
      router.replace(!isAuthenticated ? "/login" : fallbackPath);
    }
  }, [
    fallbackPath,
    hasDeniedRole,
    hasRole,
    isAuthenticated,
    isLoading,
    router,
  ]);

  if (isLoading || !isAuthenticated || !hasRole || hasDeniedRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
