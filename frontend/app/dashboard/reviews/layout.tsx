import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Đánh giá khách hàng | Bảng điều khiển");

export default function DashboardReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
