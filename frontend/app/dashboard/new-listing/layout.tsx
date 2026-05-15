import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Đăng sản phẩm | Bảng điều khiển");

export default function NewListingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
