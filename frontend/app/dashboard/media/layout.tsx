import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Thư viện ảnh | Bảng điều khiển");

export default function MediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
