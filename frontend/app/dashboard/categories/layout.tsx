import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Quản lý danh mục | Bảng điều khiển");

export default function DashboardCategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
