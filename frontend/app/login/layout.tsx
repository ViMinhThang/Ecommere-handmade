import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Đăng nhập | The Artisanal Curator");

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
