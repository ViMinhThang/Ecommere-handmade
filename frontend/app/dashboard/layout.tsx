import { DashboardShell } from "./dashboard-shell";
import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Tổng quan | Bảng điều khiển");

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
