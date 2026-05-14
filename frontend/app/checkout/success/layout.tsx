import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata(
  "Thanh toán thành công | The Artisanal Curator",
);

export default function CheckoutSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
