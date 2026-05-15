import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Quản lý voucher | Bảng điều khiển");

export default function DashboardVouchersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
