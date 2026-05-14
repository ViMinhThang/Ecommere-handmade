import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata(
  "Khám phá sản phẩm | The Artisanal Curator",
);

export default function DiscoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
