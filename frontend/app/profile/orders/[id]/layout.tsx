import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Chi tiết đơn hàng | Tài khoản");

export default function ProfileOrderDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
