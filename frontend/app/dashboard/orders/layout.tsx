import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Quản lý đơn hàng | Bảng điều khiển");

export default function DashboardOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
