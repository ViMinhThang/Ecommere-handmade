import Link from "next/link";
import { ProductCardActions } from "@/components/storefront/product-card-actions";
import { SafeImage } from "@/components/ui/safe-image";
import { useProducts } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";
import { formatCurrency } from "@/lib/utils";

interface RelatedProductsProps {
  categoryId: string;
  categorySlug?: string;
  currentProductId: string;
}

export function RelatedProducts({
  categoryId,
  categorySlug,
  currentProductId,
}: RelatedProductsProps) {
  const { data, isLoading } = useProducts({ categoryId, limit: 8 });

  if (isLoading || !data) {
    return (
      <section className="border-t border-border/10 bg-background px-6 py-24 md:px-12">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-12 flex flex-col gap-3">
            <div className="h-4 w-36 animate-pulse rounded bg-border/20" />
            <div className="h-10 w-72 max-w-full animate-pulse rounded bg-border/20" />
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div className="aspect-[3/4] animate-pulse rounded-xl bg-border/20" />
            <div className="hidden aspect-[3/4] animate-pulse rounded-xl bg-border/20 sm:block" />
            <div className="hidden aspect-[3/4] animate-pulse rounded-xl bg-border/20 lg:block" />
          </div>
        </div>
      </section>
    );
  }

  const relatedProducts = data.data
    .filter((product) => product.id !== currentProductId)
    .slice(0, 3);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-border/10 bg-background px-6 py-24 md:px-12">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-16 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
              Cùng chất liệu
            </span>
            <h2 className="text-4xl font-headline italic leading-tight text-foreground md:text-5xl">
              Sản phẩm liên quan
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Những món handmade cùng danh mục, dễ phối thành một bộ quà tặng
              hoặc góc decor riêng.
            </p>
          </div>
          <Link
            href={`/categories/${categorySlug || categoryId}`}
            className="w-fit border-b border-transparent pb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Xem tất cả
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {relatedProducts.map((product) => {
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
                  <Link href={`/products/${product.id}`} aria-label={product.name}>
                    {imageUrl ? (
                      <SafeImage
                        src={imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm italic text-muted-foreground">
                        Chưa có hình ảnh
                      </div>
                    )}
                    <div className="absolute inset-0 bg-foreground/0 transition-colors duration-300 group-hover:bg-foreground/10" />
                  </Link>

                  <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-col gap-2">
                    <span className="w-fit rounded-full border border-border/40 bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground backdrop-blur-md">
                      {product.category?.name || "Thủ công"}
                    </span>
                    {isFlashSale ? (
                      <span className="w-fit rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-lg">
                        -{product.pricing?.discountPercent}% OFF
                      </span>
                    ) : null}
                  </div>

                  <ProductCardActions
                    productId={product.id}
                    stock={product.stock}
                  />
                </div>

                <div className="space-y-2">
                  <Link href={`/products/${product.id}`}>
                    <h3 className="line-clamp-2 text-xl font-headline italic text-foreground transition-colors group-hover:text-primary">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="line-clamp-1 text-sm font-body text-muted-foreground">
                    Bởi {product.seller?.shopName || "Người bán uy tín"}
                  </p>
                  <div className="flex items-center justify-between gap-4 pt-2">
                    <div className="flex min-w-0 shrink-0 flex-col">
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
                      className="shrink-0 border-b border-transparent pb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
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
