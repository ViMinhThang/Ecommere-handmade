"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Heart,
  PackageSearch,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  useAddToCart,
  useRemoveFromWishlist,
  useWishlist,
} from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";
import { formatCurrency } from "@/lib/utils";
import type { Product, ProductImage, WishlistItem } from "@/types";
import { SafeImage } from "@/components/ui/safe-image";

function getProductImageUrl(product: Product) {
  const mainImage = product.images?.find((image: ProductImage) => image.isMain);
  const firstImage = product.images?.[0];
  const imageUrl = mainImage?.url || firstImage?.url || "";

  return imageUrl ? mediaApi.getImageUrl(imageUrl) : "";
}

function getWishlistPrice(product: Product) {
  return product.pricing?.discountedPrice ?? Number(product.price);
}

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-xl border border-border/30 bg-white shadow-sm"
        >
          <div className="aspect-[4/3] animate-pulse bg-border/20" />
          <div className="space-y-4 p-5">
            <div className="h-3 w-28 animate-pulse rounded bg-border/30" />
            <div className="h-6 w-4/5 animate-pulse rounded bg-border/30" />
            <div className="h-4 w-2/5 animate-pulse rounded bg-border/30" />
          </div>
        </div>
      ))}
    </div>
  );
}

function WishlistCard({
  item,
  isRemoving,
  isAddingToCart,
  onRemove,
  onAddToCart,
}: {
  item: WishlistItem;
  isRemoving: boolean;
  isAddingToCart: boolean;
  onRemove: (productId: string) => void;
  onAddToCart: (productId: string) => void;
}) {
  const { product } = item;
  const imageUrl = getProductImageUrl(product);
  const isFlashSale = Boolean(product.pricing?.discountPercent);

  return (
    <article className="group overflow-hidden rounded-xl border border-border/30 bg-white shadow-[0_15px_30px_-18px_rgba(84,67,60,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_22px_42px_-24px_rgba(84,67,60,0.24)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-accent">
        {imageUrl ? (
          <SafeImage
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm italic text-muted-foreground">
            Chưa có hình ảnh
          </div>
        )}

        <button
          type="button"
          onClick={() => onRemove(product.id)}
          disabled={isRemoving}
          aria-label="Bỏ khỏi danh sách yêu thích"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-primary shadow-sm backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        >
          {isRemoving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Heart className="h-4 w-4" fill="currentColor" />
          )}
        </button>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="line-clamp-1 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">
            {product.category?.name || "Thủ công"}
          </span>
          {isFlashSale && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
              -{product.pricing?.discountPercent}%
            </span>
          )}
        </div>

        <div>
          <Link
            href={`/products/${product.id}`}
            className="font-serif text-xl font-bold leading-snug text-foreground transition-colors hover:text-primary"
          >
            {product.name}
          </Link>
          <p className="mt-1 line-clamp-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Bởi {product.seller?.shopName || product.seller?.name || "Nghệ nhân"}
          </p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="whitespace-nowrap text-lg font-bold text-primary">
              {formatCurrency(getWishlistPrice(product))}
            </p>
            {isFlashSale && (
              <p className="whitespace-nowrap text-xs text-muted-foreground line-through">
                {formatCurrency(product.pricing!.originalPrice)}
              </p>
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {product.stock > 0 ? `Còn ${product.stock}` : "Hết hàng"}
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-3 border-t border-border/20 pt-4">
          <button
            type="button"
            onClick={() => onAddToCart(product.id)}
            disabled={product.stock <= 0 || isAddingToCart}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-[10px] font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            <ShoppingBag className="h-4 w-4" />
            {product.stock > 0 ? "Thêm vào giỏ" : "Hết hàng"}
          </button>
          <Link
            href={`/products/${product.id}`}
            aria-label="Xem chi tiết sản phẩm"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border/50 bg-background text-primary transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function ProfileWishlistPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: items = [], isLoading } = useWishlist(isAuthenticated);
  const removeFromWishlist = useRemoveFromWishlist();
  const addToCart = useAddToCart();

  const favoriteCategories = Array.from(
    new Set(
      items
        .map((item) => item.product.category?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  ).slice(0, 4);

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist.mutateAsync(productId);
      toast.success("Đã bỏ sản phẩm khỏi danh sách yêu thích.");
    } catch {
      // Global query handler shows the API error.
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      await addToCart.mutateAsync({ productId, quantity: 1 });
      toast.success("Đã thêm sản phẩm vào giỏ hàng.");
    } catch {
      // Global query handler shows the API error.
    }
  };

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-sm">
        <Heart className="mx-auto mb-5 h-14 w-14 text-primary/30" />
        <h1 className="font-serif text-3xl font-bold text-primary">
          Đăng nhập để lưu sản phẩm yêu thích
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Danh sách yêu thích giúp quý khách giữ lại những món thủ công muốn xem
          lại hoặc mua sau.
        </p>
        <Link
          href="/login?redirect=/profile/wishlist"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.28em] text-secondary-foreground">
          Bộ sưu tập cá nhân
        </span>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-serif text-4xl font-bold text-primary">
              Danh sách yêu thích
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Lưu lại những món đồ thủ công quý khách đang cân nhắc và quay lại
              mua khi đã sẵn sàng.
            </p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-full border border-primary/15 bg-primary/5 px-5 py-3 text-primary">
            <Heart className="h-5 w-5" fill="currentColor" />
            <span className="font-serif text-2xl font-bold leading-none">
              {items.length}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              sản phẩm
            </span>
          </div>
        </div>
      </div>

      {isAuthLoading || isLoading ? (
        <WishlistSkeleton />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-sm">
          <PackageSearch className="mx-auto mb-5 h-16 w-16 text-muted-foreground/25" />
          <h2 className="font-serif text-3xl font-bold text-primary">
            Chưa có sản phẩm yêu thích
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Hãy bấm nút trái tim ở trang chi tiết sản phẩm để tạo bộ sưu tập thủ
            công của riêng quý khách.
          </p>
          <Link
            href="/discovery"
            className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-105 active:scale-[0.98]"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {items.map((item) => (
              <WishlistCard
                key={item.id}
                item={item}
                isRemoving={
                  removeFromWishlist.isPending &&
                  removeFromWishlist.variables === item.productId
                }
                isAddingToCart={addToCart.isPending}
                onRemove={handleRemove}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>

          <aside className="h-max rounded-xl border border-primary/10 bg-primary/5 p-7 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-secondary-foreground">
              Gợi ý mua sắm
            </p>
            <h2 className="mt-3 font-serif text-2xl font-bold text-primary">
              Những món đang giữ lại
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Khi một món đồ thủ công hợp gu, hãy giữ nó ở đây trước khi quyết
              định đặt mua hoặc nhắn người bán để tùy chỉnh thêm.
            </p>

            {favoriteCategories.length > 0 && (
              <div className="mt-7">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Chất liệu / danh mục yêu thích
                </p>
                <div className="flex flex-wrap gap-2">
                  {favoriteCategories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary shadow-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/discovery"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-[0.98]"
            >
              Tiếp tục khám phá
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
