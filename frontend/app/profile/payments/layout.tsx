import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Lịch sử thanh toán | Tài khoản");

export default function ProfilePaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
