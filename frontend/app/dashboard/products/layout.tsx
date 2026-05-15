import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Quản lý sản phẩm | Bảng điều khiển");

export default function DashboardProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
