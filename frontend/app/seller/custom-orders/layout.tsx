import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Đơn thiết kế của khách | Bảng điều khiển");

export default function SellerCustomOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
