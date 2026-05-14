import type { Metadata } from "next";
import {
  cleanTitlePart,
  fetchMetadataPayload,
  tabMetadata,
  truncateTitlePart,
  withSiteName,
} from "@/lib/page-titles";

interface CategoryMetadataPayload {
  name?: string;
  description?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await fetchMetadataPayload<CategoryMetadataPayload>(
    `/categories/${encodeURIComponent(slug)}`,
  );
  const title = truncateTitlePart(
    cleanTitlePart(category?.name ?? "", "Danh mục sản phẩm"),
  );
  const description = cleanTitlePart(category?.description ?? "");

  return tabMetadata(withSiteName(title), description || undefined);
}

export default function CategoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
