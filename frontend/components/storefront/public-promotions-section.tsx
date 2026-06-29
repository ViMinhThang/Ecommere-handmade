"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Copy, Gift, Ticket, Zap } from "lucide-react";
import { toast } from "sonner";
import { ProductCardActions } from "@/components/storefront/product-card-actions";
import { SafeImage } from "@/components/ui/safe-image";
import { useActiveFlashSales, useVouchers } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";
import { productsApi } from "@/lib/api/products";
import { formatCurrency } from "@/lib/utils";
import type { FlashSale, Product, Voucher } from "@/types";

type VoucherPublicFilter = "all" | "platform" | "shop";

function isCurrentFlashSale(flashSale: FlashSale) {
  const now = Date.now();
  return (
    flashSale.isActive &&
    (flashSale.saleState ?? "ACTIVE") === "ACTIVE" &&
    new Date(flashSale.startAt).getTime() <= now &&
    new Date(flashSale.endAt).getTime() >= now
  );
}

function isCurrentVoucher(voucher: Voucher) {
  return voucher.isActive && new Date(voucher.endDate).getTime() > Date.now();
}

function formatCountdown(target: Date | string, now: number) {
  const remaining = Math.max(0, new Date(target).getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days} ngày ${hours} giờ`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(2, "0")}`;
}

function useCountdown(target?: Date | string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [target]);

  return target ? formatCountdown(target, now) : "";
}

function getFlashSaleDiscountLabel(flashSale: FlashSale) {
  const discounts = flashSale.ranges
    .map((range) => Number(range.discountPercent))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (discounts.length === 0) {
    return "Ưu đãi đặc biệt";
  }

  return `Giảm đến ${Math.max(...discounts)}%`;
}

function getVoucherCondition(voucher: Voucher) {
  const range = voucher.ranges?.[0];
  const parts = [
    voucher.sellerId
      ? `Shop: ${voucher.seller?.shopName || voucher.seller?.name || "Gian hàng"}`
      : "Toàn sàn",
    voucher.category?.name ? `Danh mục: ${voucher.category.name}` : null,
  ];

  if (range) {
    parts.push(
      `Đơn từ ${formatCurrency(Number(range.minPrice))} đến ${formatCurrency(
        Number(range.maxPrice),
      )}`,
    );
    parts.push(`Giảm ${Number(range.discountPercent)}%`);
  }

  return parts.filter(Boolean).join(" · ");
}

function PromotionSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="space-y-4">
          <div className="aspect-[3/4] animate-pulse rounded-md bg-border/20" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-border/20" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-border/20" />
        </div>
      ))}
    </div>
  );
}

function FlashSaleProductCard({ product }: { product: Product }) {
  const mainImage =
    product.images?.find((image) => image.isMain) || product.images?.[0];
  const imageUrl = mainImage?.url ? mediaApi.getImageUrl(mainImage.url) : null;
  const hasFlashSalePrice =
    product.pricing && product.pricing.discountPercent > 0;

  return (
    <article className="group">
      <div className="relative mb-5 aspect-[3/4] overflow-hidden rounded-md border border-border/20 bg-accent shadow-sm">
        {imageUrl ? (
          <SafeImage
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-foreground">
            Chưa có hình ảnh
          </div>
        )}
        {hasFlashSalePrice ? (
          <span className="absolute left-4 top-4 rounded-full bg-[#8B4513] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow">
            -{product.pricing?.discountPercent}%
          </span>
        ) : null}
        <ProductCardActions productId={product.id} stock={product.stock} />
      </div>

      <div className="space-y-2">
        <Link href={`/products/${product.id}`}>
          <h3 className="line-clamp-2 text-lg font-headline italic text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>
        </Link>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {product.seller?.shopName || "Gian hàng handmade"}
        </p>
        <div className="flex items-end justify-between gap-3 pt-1">
          <div>
            {hasFlashSalePrice ? (
              <>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(product.pricing!.discountedPrice)}
                </p>
                <p className="text-xs text-muted-foreground line-through">
                  {formatCurrency(product.pricing!.originalPrice)}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-primary">
                {formatCurrency(Number(product.price))}
              </p>
            )}
          </div>
          <Link
            href={`/products/${product.id}`}
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Xem
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PublicFlashSaleSection() {
  const flashSalesQuery = useActiveFlashSales();
  const activeFlashSales = useMemo(
    () => (flashSalesQuery.data ?? []).filter(isCurrentFlashSale),
    [flashSalesQuery.data],
  );
  const primaryFlashSale = activeFlashSales[0];
  const categoryIds = useMemo(
    () =>
      Array.from(
        new Set(
          primaryFlashSale?.categories
            ?.map((item) => item.categoryId)
            .filter(Boolean) ?? [],
        ),
      ),
    [primaryFlashSale],
  );
  const countdown = useCountdown(primaryFlashSale?.endAt);
  const productsQuery = useQuery({
    queryKey: ["public-flash-sale-products", primaryFlashSale?.id, categoryIds],
    queryFn: async () => {
      const responses = await Promise.all(
        categoryIds.map((categoryId) =>
          productsApi.getAll({
            status: "APPROVED",
            categoryId,
            limit: 8,
            readyToShip: true,
          }),
        ),
      );
      const products = responses.flatMap((response) => response.data);
      const uniqueProducts = Array.from(
        new Map(products.map((product) => [product.id, product])).values(),
      );

      return uniqueProducts
        .filter((product) => (product.pricing?.discountPercent ?? 0) > 0)
        .slice(0, 4);
    },
    enabled: Boolean(primaryFlashSale && categoryIds.length > 0),
  });

  return (
    <section className="border-t border-border/10 bg-[#FBF8F2] px-8 py-20 dark:bg-[#241d19]">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#8B4513]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#8B4513] dark:bg-primary/15 dark:text-primary">
              <Zap className="h-4 w-4" />
              Đang Flash Sale
            </span>
            <h2 className="text-4xl font-headline italic leading-tight text-foreground md:text-5xl">
              Ưu đãi handmade trong thời gian ngắn
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Các chiến dịch đang hoạt động được lấy trực tiếp từ hệ thống,
              chỉ hiển thị khi còn hiệu lực.
            </p>
          </div>

          {primaryFlashSale ? (
            <div className="rounded-md border border-[#8B4513]/20 bg-white px-5 py-4 shadow-sm dark:border-primary/25 dark:bg-card">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-muted-foreground">
                <Clock className="h-4 w-4 text-[#8B4513] dark:text-primary" />
                Kết thúc sau
              </div>
              <p className="mt-2 font-headline text-3xl italic text-[#8B4513] dark:text-primary">
                {countdown}
              </p>
            </div>
          ) : null}
        </div>

        {flashSalesQuery.isLoading ? (
          <PromotionSkeleton />
        ) : flashSalesQuery.isError ? (
          <div className="rounded-md border border-red-200 bg-white px-6 py-8 text-center text-sm text-red-700 dark:border-destructive/30 dark:bg-card dark:text-destructive">
            Không thể tải Flash Sale. Vui lòng thử lại sau.
          </div>
        ) : !primaryFlashSale ? (
          <div className="rounded-md border border-dashed border-border/60 bg-white px-6 py-10 text-center dark:bg-card">
            <Zap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">
              Hiện chưa có chiến dịch Flash Sale đang chạy.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Các ưu đãi mới sẽ xuất hiện tại đây khi admin kích hoạt.
            </p>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="rounded-md border border-[#8B4513]/20 bg-white p-6 shadow-sm dark:border-primary/25 dark:bg-card">
              <p className="text-xs font-bold uppercase tracking-widest text-[#8B4513] dark:text-primary">
                {getFlashSaleDiscountLabel(primaryFlashSale)}
              </p>
              <h3 className="mt-4 text-3xl font-headline italic text-foreground">
                {primaryFlashSale.name}
              </h3>
              {primaryFlashSale.description ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {primaryFlashSale.description}
                </p>
              ) : null}
              <div className="mt-6 space-y-2 text-sm text-stone-600 dark:text-muted-foreground">
                <p>
                  Danh mục:{" "}
                  {primaryFlashSale.categories
                    .map((item) => item.category?.name)
                    .filter(Boolean)
                    .join(", ") || "Sản phẩm thủ công"}
                </p>
                <p>
                  Hiệu lực đến{" "}
                  {new Date(primaryFlashSale.endAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <Link
                href="/products"
                className="mt-8 inline-flex min-h-11 items-center rounded-sm bg-[#8B4513] px-5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#6F3610] dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
              >
                Xem thêm sản phẩm
              </Link>
            </div>

            {productsQuery.isLoading ? (
              <PromotionSkeleton />
            ) : productsQuery.isError ? (
              <div className="rounded-md border border-red-200 bg-white px-6 py-8 text-center text-sm text-red-700 dark:border-destructive/30 dark:bg-card dark:text-destructive">
                Không thể tải sản phẩm Flash Sale.
              </div>
            ) : productsQuery.data && productsQuery.data.length > 0 ? (
              <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
                {productsQuery.data.map((product) => (
                  <FlashSaleProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/60 bg-white px-6 py-10 text-center dark:bg-card">
                <p className="font-semibold text-foreground">
                  Chưa có sản phẩm phù hợp với chiến dịch này.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sản phẩm sẽ tự xuất hiện khi thuộc danh mục và range giá hợp
                  lệ.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function PublicVoucherSection() {
  const [filter, setFilter] = useState<VoucherPublicFilter>("all");
  const vouchersQuery = useVouchers({ limit: 8 });
  const vouchers = useMemo(
    () =>
      (vouchersQuery.data?.data ?? [])
        .filter(isCurrentVoucher)
        .filter((voucher) => {
          if (filter === "platform") return !voucher.sellerId;
          if (filter === "shop") return Boolean(voucher.sellerId);
          return true;
        })
        .slice(0, 6),
    [filter, vouchersQuery.data],
  );
  const filters: Array<{ value: VoucherPublicFilter; label: string }> = [
    { value: "all", label: "Tất cả" },
    { value: "platform", label: "Voucher sàn" },
    { value: "shop", label: "Voucher shop" },
  ];

  const copyVoucherCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Đã sao chép mã ${code}.`);
    } catch {
      toast.error("Không thể sao chép mã. Vui lòng thử lại.");
    }
  };

  return (
    <section className="border-t border-border/10 bg-background px-8 py-20">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-12 flex flex-col gap-4 text-center">
          <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-secondary/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-secondary-foreground">
            <Ticket className="h-4 w-4" />
            Mã giảm giá đang có
          </span>
          <h2 className="text-4xl font-headline italic leading-tight text-foreground md:text-5xl">
            Lưu mã trước khi thanh toán
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Mã hợp lệ có thể nhập tại giỏ hàng hoặc trang thanh toán. Hệ thống
            sẽ kiểm tra lại điều kiện khi đặt hàng.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center rounded-md border border-border/60 bg-muted/30 p-1">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-sm px-4 py-2 text-xs font-semibold transition ${
                filter === option.value
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {vouchersQuery.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-44 animate-pulse rounded-md bg-border/20"
              />
            ))}
          </div>
        ) : vouchersQuery.isError ? (
          <div className="rounded-md border border-red-200 bg-white px-6 py-8 text-center text-sm text-red-700">
            Không thể tải mã giảm giá. Vui lòng thử lại sau.
          </div>
        ) : vouchers.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-card px-6 py-10 text-center">
            <Gift className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">
              Hiện chưa có mã giảm giá công khai.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Mã mới sẽ xuất hiện khi admin kích hoạt và còn hiệu lực.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {vouchers.map((voucher) => (
              <article
                key={voucher.id}
                className="rounded-md border border-border/30 bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="mb-2 inline-flex rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                      {voucher.sellerId ? "Voucher shop" : "Voucher sàn"}
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {voucher.name}
                    </p>
                    <p className="mt-2 font-mono text-2xl font-black tracking-wide text-primary">
                      {voucher.code}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyVoucherCode(voucher.code)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-primary/20 px-3 text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>

                {voucher.description ? (
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {voucher.description}
                  </p>
                ) : null}
                <p className="mt-4 text-xs leading-5 text-stone-500">
                  {getVoucherCondition(voucher)}
                </p>
                <div className="mt-5 flex items-center justify-between gap-4 border-t border-border/20 pt-4 text-xs">
                  <span className="text-muted-foreground">
                    HSD: {new Date(voucher.endDate).toLocaleDateString("vi-VN")}
                  </span>
                  <Link
                    href="/checkout"
                    className="font-bold uppercase tracking-widest text-primary underline-offset-4 hover:underline"
                  >
                    Dùng ở checkout
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
