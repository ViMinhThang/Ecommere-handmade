import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata(
  "Đăng ký tài khoản | The Artisanal Curator",
);

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
