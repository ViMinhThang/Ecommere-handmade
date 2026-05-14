import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Quản lý người dùng | Bảng điều khiển");

export default function DashboardUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
