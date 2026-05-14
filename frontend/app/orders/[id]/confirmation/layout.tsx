import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata(
  "Xác nhận đơn hàng | The Artisanal Curator",
);

export default function OrderConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
