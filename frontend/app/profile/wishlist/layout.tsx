import { tabMetadata } from "@/lib/page-titles";

export const metadata = tabMetadata("Sản phẩm yêu thích | Tài khoản");

export default function ProfileWishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
