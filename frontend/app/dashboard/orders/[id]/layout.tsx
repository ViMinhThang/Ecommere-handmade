import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Chi tiết đơn hàng | Bảng điều khiển");

export default function DashboardOrderDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
