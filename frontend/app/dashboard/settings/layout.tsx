import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Cài đặt nền tảng | Bảng điều khiển");

export default function DashboardSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
