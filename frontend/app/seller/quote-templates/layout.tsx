import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Mẫu báo giá | Bảng điều khiển");

export default function SellerQuoteTemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
