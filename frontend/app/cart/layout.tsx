import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Giỏ hàng | The Artisanal Curator");

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
