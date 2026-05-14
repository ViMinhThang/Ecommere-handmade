import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Đơn hàng của tôi | Tài khoản");

export default function ProfileOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
