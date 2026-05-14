import type { Metadata } from "next";
import { API_BASE_URL } from "@/lib/api/client";

export const SITE_NAME = "The Artisanal Curator";
export const DEFAULT_TAB_TITLE = `${SITE_NAME} | Chợ đồ handmade`;
export const DEFAULT_DESCRIPTION =
  "Marketplace tuyển chọn sản phẩm handmade, gian hàng thủ công và đơn thiết kế riêng.";

export function cleanTitlePart(value: string, fallback = "") {
  const title = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title || fallback;
}

export function truncateTitlePart(value: string, maxLength = 58) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trim()}...`;
}

export function tabMetadata(
  title: string,
  description: string = DEFAULT_DESCRIPTION,
): Metadata {
  return {
    title: { absolute: title },
    description,
  };
}

export function withSiteName(title: string) {
  return `${title} | ${SITE_NAME}`;
}

export function withSellerContext(title: string) {
  return `${title} | Gian hàng handmade`;
}

export async function fetchMetadataPayload<T>(
  endpoint: string,
): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
