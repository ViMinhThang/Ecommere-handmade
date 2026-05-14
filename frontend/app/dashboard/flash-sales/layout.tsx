import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Quản lý flash sale | Bảng điều khiển");

export default function FlashSalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
