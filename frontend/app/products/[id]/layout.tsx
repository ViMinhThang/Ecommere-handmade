import type { Metadata } from "next";
import {
  cleanTitlePart,
  fetchMetadataPayload,
  tabMetadata,
  truncateTitlePart,
  withSiteName,
} from "@/lib/page-titles";

interface ProductMetadataPayload {
  name?: string;
  description?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchMetadataPayload<ProductMetadataPayload>(
    `/products/${encodeURIComponent(id)}`,
  );
  const title = truncateTitlePart(
    cleanTitlePart(product?.name ?? "", "Chi tiết sản phẩm"),
  );
  const description = cleanTitlePart(product?.description ?? "");

  return tabMetadata(withSiteName(title), description || undefined);
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
