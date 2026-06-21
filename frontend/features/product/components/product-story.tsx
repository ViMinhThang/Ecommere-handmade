import Link from "next/link";
import { Store } from "lucide-react";
import { FollowShopButton } from "@/components/sellers/follow-shop-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Product } from "@/lib/api/products";
import { mediaApi } from "@/lib/api/media";
import { stripProductSource } from "@/lib/utils";
import { richTextToPlainText } from "@/lib/sanitize-html";
import type { User } from "@/types";

interface ProductStoryProps {
  product: Product;
  artisanImage: string | null;
  seller?: User | null;
}

function formatCompactNumber(value?: number | null) {
  const safeValue = Number(value ?? 0);

  if (!Number.isFinite(safeValue)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN", {
    notation: safeValue >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(safeValue);
}

function formatJoinedAgo(date?: Date | string | null) {
  if (!date) {
    return "Chưa cập nhật";
  }

  const joinedAt = new Date(date);
  const diffMs = Date.now() - joinedAt.getTime();

  if (!Number.isFinite(joinedAt.getTime()) || diffMs < 0) {
    return "Chưa cập nhật";
  }

  const days = Math.max(1, Math.floor(diffMs / 86_400_000));
  const years = Math.floor(days / 365);
  const months = Math.floor(days / 30);

  if (years > 0) {
    return `${years} năm trước`;
  }

  if (months > 0) {
    return `${months} tháng trước`;
  }

  return `${days} ngày trước`;
}

export function ProductStory({
  product,
  artisanImage,
  seller,
}: ProductStoryProps) {
  const description = richTextToPlainText(
    stripProductSource(product.description || ""),
  );
  const displaySeller = seller || product.seller;
  const shopName =
    displaySeller?.shopName || displaySeller?.name || "Gian hàng handmade";
  const sellerName = displaySeller?.name || "Người bán uy tín";
  const avatarUrl = displaySeller?.avatar
    ? mediaApi.getImageUrl(displaySeller.avatar)
    : artisanImage || "";
  const sellerInitial = shopName.trim().charAt(0).toUpperCase() || "S";
  const rating = displaySeller?.shopAverageRating ?? displaySeller?.rating ?? null;
  const reviewCount = displaySeller?.shopReviewCount ?? 0;
  const productCount =
    displaySeller?.productCount ?? displaySeller?.products ?? undefined;
  const responseTime =
    displaySeller?.shopProcessingTime?.trim() ||
    product.processingTime ||
    "trong vài giờ";

  const sellerStats = [
    {
      label: "Đánh giá",
      value:
        rating != null && reviewCount > 0
          ? `${rating.toFixed(1)}/5`
          : "Chưa có",
    },
    {
      label: "Sản phẩm",
      value:
        productCount != null
          ? formatCompactNumber(productCount)
          : product.soldQuantity != null
            ? formatCompactNumber(product.soldQuantity)
            : "Chưa cập nhật",
    },
    { label: "Tỉ lệ phản hồi", value: "Chưa cập nhật" },
    { label: "Thời gian phản hồi", value: responseTime },
    { label: "Tham gia", value: formatJoinedAgo(displaySeller?.createdAt) },
    {
      label: "Người theo dõi",
      value: formatCompactNumber(displaySeller?.followerCount),
    },
  ];

  return (
    <section className="mt-40 overflow-hidden border-y border-border/10 bg-sidebar py-24 md:py-32">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12">
        <div className="grid gap-16 lg:grid-cols-[0.92fr_1fr] lg:items-center xl:gap-20">
          <div className="relative">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#d4e8d1]/30 blur-[100px]" />
            <div className="relative z-10">
              {product.descriptionImages &&
              product.descriptionImages.length > 0 ? (
                <div className="columns-1 gap-6 space-y-6 sm:columns-2">
                  {product.descriptionImages.map((imgUrl, idx) => (
                    <div
                      key={imgUrl}
                      className="group break-inside-avoid overflow-hidden rounded-xl border border-border/10 bg-background shadow-xl"
                    >
                      <img
                        src={mediaApi.getImageUrl(imgUrl)}
                        alt={`Chi tiết mô tả ${idx + 1}`}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center border border-border/20 bg-background/70 p-10 text-center shadow-2xl md:min-h-[500px]">
                  <h3 className="mb-4 font-headline text-3xl italic text-primary">
                    Hoàn thiện tỉ mỉ
                  </h3>
                  <p className="max-w-xl text-muted-foreground">
                    Mỗi chi tiết đều được chăm chút để tạo nên một sản phẩm
                    hoàn hảo.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-10">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Câu chuyện sản phẩm
              </span>
              <h2 className="font-headline text-4xl italic leading-tight text-foreground md:text-6xl">
                Chất lượng hàng đầu
              </h2>
            </div>

            <div className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground md:text-xl">
              {description ||
                "Sản phẩm được chế tác thủ công với chất liệu chọn lọc và hoàn thiện kỹ lưỡng."}
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-border/30 pt-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.95fr)_1px_minmax(0,1.8fr)] lg:items-center">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href={`/sellers/${product.sellerId}`}
                className="group inline-flex items-center gap-4"
              >
                <Avatar
                  className="size-16 border border-border/60 bg-background"
                  size="lg"
                >
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={shopName} />
                  ) : null}
                  <AvatarFallback className="text-lg font-bold text-primary">
                    {sellerInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="line-clamp-2 font-headline text-xl italic text-foreground transition-colors group-hover:text-primary">
                    {sellerName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs font-bold uppercase tracking-widest text-primary">
                    {shopName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Online 4 phút trước
                  </p>
                </div>
              </Link>

              <div className="flex flex-wrap gap-2 sm:ml-auto lg:ml-0">
                <FollowShopButton
                  sellerId={product.sellerId}
                  initialFollowerCount={displaySeller?.followerCount ?? 0}
                  redirectPath={`/products/${product.id}`}
                  className="min-h-9 rounded-md border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary shadow-none hover:bg-primary hover:text-primary-foreground"
                  followLabel="Theo dõi ngay"
                  showCount={false}
                />
                <Link
                  href={`/sellers/${product.sellerId}`}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  <Store className="h-4 w-4" />
                  Xem Shop
                </Link>
              </div>
            </div>

            <div className="hidden h-full w-px bg-border/50 lg:block" />

            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {sellerStats.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[minmax(112px,1fr)_auto] items-baseline gap-4"
                >
                  <dt className="text-sm text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="text-right text-sm font-semibold text-primary">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
