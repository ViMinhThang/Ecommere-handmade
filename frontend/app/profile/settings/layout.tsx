import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Hồ sơ cá nhân | Tài khoản");

export default function ProfileSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
