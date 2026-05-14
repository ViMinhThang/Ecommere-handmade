"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { RoleRoute } from "@/components/role-route";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleRoute allowedRoles={["ROLE_SELLER", "ROLE_ADMIN"]}>
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
