import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata(
  "Duyệt thiết kế riêng | The Artisanal Curator",
);

export default function CustomOrderReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
