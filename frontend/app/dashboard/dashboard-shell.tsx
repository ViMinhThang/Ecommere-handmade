"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { RoleRoute } from "@/components/role-route";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types";

type DashboardRouteAccess = {
  prefix: string;
  allowedRoles: UserRole[];
  deniedRoles?: UserRole[];
  fallbackPath?: string;
};

const sellerOnlyAccess: Omit<DashboardRouteAccess, "prefix"> = {
  allowedRoles: ["ROLE_SELLER"],
  deniedRoles: ["ROLE_ADMIN"],
  fallbackPath: "/dashboard",
};

const adminOnlyAccess: Omit<DashboardRouteAccess, "prefix"> = {
  allowedRoles: ["ROLE_ADMIN"],
  fallbackPath: "/dashboard",
};

const routeAccessRules: DashboardRouteAccess[] = [
  { prefix: "/dashboard/users", ...adminOnlyAccess },
  { prefix: "/dashboard/reports", ...adminOnlyAccess },
  { prefix: "/dashboard/homepage", ...adminOnlyAccess },
  { prefix: "/dashboard/categories", ...adminOnlyAccess },
  { prefix: "/dashboard/vouchers", ...adminOnlyAccess },
  { prefix: "/dashboard/flash-sales", ...adminOnlyAccess },
  { prefix: "/dashboard/gift-wrap-tiers", ...adminOnlyAccess },
  { prefix: "/dashboard/payments", ...adminOnlyAccess },
  { prefix: "/dashboard/settings", ...adminOnlyAccess },
  { prefix: "/dashboard/new-listing", ...sellerOnlyAccess },
  { prefix: "/dashboard/chat", ...sellerOnlyAccess },
  { prefix: "/dashboard/reviews", ...sellerOnlyAccess },
  { prefix: "/dashboard/shipping-profiles", ...sellerOnlyAccess },
  { prefix: "/dashboard/inventory", ...sellerOnlyAccess },
];

function getDashboardRouteAccess(pathname: string): DashboardRouteAccess {
  return (
    routeAccessRules.find(
      (rule) =>
        pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`),
    ) ?? {
      prefix: "/dashboard",
      allowedRoles: ["ROLE_SELLER", "ROLE_ADMIN"],
      fallbackPath: "/profile/settings",
    }
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const access = getDashboardRouteAccess(pathname);

  return (
    <RoleRoute
      allowedRoles={access.allowedRoles}
      deniedRoles={access.deniedRoles}
      fallbackPath={access.fallbackPath}
    >
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 px-6 py-7 lg:px-8">
            <div className="mx-auto w-full max-w-[1300px]">{children}</div>
          </main>
        </div>
      </div>
    </RoleRoute>
  );
}
