import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata(
  "Tạo đơn thiết kế riêng | Bảng điều khiển",
);

export default function NewCustomOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
