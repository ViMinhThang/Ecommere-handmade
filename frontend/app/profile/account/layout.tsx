import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Cài đặt tài khoản | Tài khoản");

export default function ProfileAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
