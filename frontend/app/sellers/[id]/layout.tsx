import type { Metadata } from "next";
import {
  cleanTitlePart,
  fetchMetadataPayload,
  tabMetadata,
  truncateTitlePart,
  withSellerContext,
} from "@/lib/page-titles";

interface SellerMetadataPayload {
  name?: string;
  shopName?: string;
  sellerBio?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const seller = await fetchMetadataPayload<SellerMetadataPayload>(
    `/sellers/${encodeURIComponent(id)}`,
  );
  const title = truncateTitlePart(
    cleanTitlePart(seller?.shopName || seller?.name || "", "Gian hàng"),
  );
  const description = cleanTitlePart(seller?.sellerBio ?? "");

  return tabMetadata(withSellerContext(title), description || undefined);
}

export default function SellerProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
