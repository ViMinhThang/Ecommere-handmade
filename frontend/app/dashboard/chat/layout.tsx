import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Tin nhắn | Bảng điều khiển");

export default function DashboardChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
