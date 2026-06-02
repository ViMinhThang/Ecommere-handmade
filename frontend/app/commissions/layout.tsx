import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata(
  "Commission board | The Artisanal Curator",
  "Theo dõi các yêu cầu thiết kế riêng và đề xuất từ studio thủ công.",
);

export default function CommissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
