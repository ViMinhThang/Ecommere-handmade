"use client";

import Link from "next/link";
import { Product } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { mediaApi } from "@/lib/api/media";
import { SafeImage } from "@/components/ui/safe-image";
import { ProductCardActions } from "@/components/storefront/product-card-actions";

export function HomepageFeaturedProducts({
  products,
}: {
  products: Product[];
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-border/10 bg-background px-8 py-24">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-16 flex flex-col items-center text-center">
          <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
            Được admin chọn cho trang chủ
          </span>
          <h2 className="text-4xl font-headline italic leading-tight text-foreground md:text-5xl">
            Sản phẩm nổi bật
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Những món handmade đang được ưu tiên giới thiệu trong mùa này.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 8).map((product) => {
            const mainImage =
              product.images?.find((image) => image.isMain) ||
              product.images?.[0];
            const imageUrl = mainImage?.url
              ? mediaApi.getImageUrl(mainImage.url)
              : null;
            const isFlashSale =
              product.pricing && product.pricing.discountPercent > 0;

            return (
              <article key={product.id} className="group">
                <div className="relative mb-6 aspect-[3/4] overflow-hidden rounded-xl border border-border/20 bg-accent shadow-sm">
                  {imageUrl ? (
                    <SafeImage
                      src={imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center italic text-muted-foreground">
                      Chưa có hình ảnh
                    </div>
                  )}
                  <div className="absolute left-4 top-4 flex flex-col gap-2">
                    <span className="w-fit rounded-full border border-border/40 bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground backdrop-blur-md">
                      {product.category?.name || "Thủ công"}
                    </span>
                    {isFlashSale ? (
                      <span className="w-fit rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-lg">
                        -{product.pricing?.discountPercent}% OFF
                      </span>
                    ) : null}
                  </div>
                  <div className="absolute inset-0 bg-foreground/0 transition-colors duration-300 group-hover:bg-foreground/10" />
                  <ProductCardActions
                    productId={product.id}
                    stock={product.stock}
                  />
                </div>

                <div className="space-y-2">
                  <Link href={`/products/${product.id}`}>
                    <h3 className="text-xl font-headline italic text-foreground transition-colors group-hover:text-primary">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="line-clamp-1 text-sm font-body text-muted-foreground">
                    Bởi {product.seller?.shopName || "Người bán uy tín"}
                  </p>
                  <div className="flex items-center justify-between gap-4 pt-2">
                    <div className="flex shrink-0 flex-col">
                      {isFlashSale ? (
                        <>
                          <p className="whitespace-nowrap text-lg font-bold text-primary">
                            {formatCurrency(product.pricing!.discountedPrice)}
                          </p>
                          <p className="whitespace-nowrap text-xs text-muted-foreground line-through">
                            {formatCurrency(product.pricing!.originalPrice)}
                          </p>
                        </>
                      ) : (
                        <p className="whitespace-nowrap text-lg font-bold text-primary">
                          {formatCurrency(Number(product.price))}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/products/${product.id}`}
                      className="border-b border-transparent pb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
