import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Quản lý kho hàng | Bảng điều khiển");

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
