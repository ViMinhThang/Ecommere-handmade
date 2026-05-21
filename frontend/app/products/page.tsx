"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, SlidersHorizontal, X } from "lucide-react";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { ProductCardActions } from "@/components/storefront/product-card-actions";
import { SafeImage } from "@/components/ui/safe-image";
import { useCategories, useProducts } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

const PAGE_SIZE = 12;

const PRICE_RANGES = [
  { label: "Dưới 500.000đ", min: 0, max: 500000 },
  { label: "500.000đ - 2.000.000đ", min: 500000, max: 2000000 },
  { label: "2.000.000đ - 5.000.000đ", min: 2000000, max: 5000000 },
  { label: "Trên 5.000.000đ", min: 5000000 },
];

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: categoriesData } = useCategories({ status: "ACTIVE" });

  const page = Math.max(Number(searchParams.get("page") || "1"), 1);
  const categoryId = searchParams.get("categoryId") || undefined;
  const minPrice = searchParams.get("minPrice")
    ? Number(searchParams.get("minPrice"))
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? Number(searchParams.get("maxPrice"))
    : undefined;
  const readyToShip = searchParams.get("readyToShip") === "true";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";

  const productParams = useMemo(
    () => ({
      status: "APPROVED",
      categoryId,
      page,
      limit: PAGE_SIZE,
      minPrice,
      maxPrice,
      readyToShip: readyToShip || undefined,
      sortBy,
      order,
    }),
    [categoryId, maxPrice, minPrice, order, page, readyToShip, sortBy],
  );

  const { data, isLoading, isError } = useProducts(productParams);
  const categories = categoriesData?.data || [];
  const products = data?.data || [];
  const meta = data?.meta;

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const query = params.toString();
    router.push(`/products${query ? `?${query}` : ""}`, { scroll: false });
  };

  const resetFilters = () => {
    router.push("/products", { scroll: false });
  };

  const selectedCategory = categories.find((category) => category.id === categoryId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomerNavBar />

      <main className="pt-24">
        <section className="border-b border-border/30 bg-accent/40 px-6 py-16 md:px-10 lg:px-14">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                Sản phẩm
              </p>
              <h1 className="mt-4 max-w-4xl font-headline text-4xl italic text-primary md:text-6xl">
                Tất cả sản phẩm thủ công
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                Lọc theo danh mục, mức giá và trạng thái còn hàng để tìm nhanh
                món đồ phù hợp.
              </p>
            </div>

            <div className="flex items-center gap-3 border border-border/50 bg-background px-4 py-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                {meta?.total
                  ? `${meta.total} sản phẩm${selectedCategory ? ` trong ${selectedCategory.name}` : ""}`
                  : "Đang cập nhật sản phẩm"}
              </span>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10 lg:px-14">
          <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row">
            <aside className="w-full shrink-0 lg:w-72">
              <div className="sticky top-28 space-y-8 border border-border/40 bg-card p-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                    Bộ lọc
                  </h2>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                    Xóa
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="product-category"
                    className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Danh mục
                  </label>
                  <select
                    id="product-category"
                    value={categoryId || "all"}
                    onChange={(event) =>
                      updateFilters({
                        categoryId:
                          event.target.value === "all" ? null : event.target.value,
                        page: "1",
                      })
                    }
                    className="h-11 w-full border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="all">Tất cả danh mục</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Khoảng giá
                  </h3>
                  <div className="space-y-3">
                    {PRICE_RANGES.map((range) => {
                      const checked = minPrice === range.min && maxPrice === range.max;
                      return (
                        <label
                          key={range.label}
                          className="flex cursor-pointer items-center gap-3 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              updateFilters({
                                minPrice: checked ? null : String(range.min),
                                maxPrice:
                                  checked || range.max === undefined
                                    ? null
                                    : String(range.max),
                                page: "1",
                              })
                            }
                            className="h-4 w-4 border-border text-primary focus:ring-primary/20"
                          />
                          <span>{range.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Trạng thái
                  </h3>
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={readyToShip}
                      onChange={(event) =>
                        updateFilters({
                          readyToShip: event.target.checked ? "true" : null,
                          page: "1",
                        })
                      }
                      className="h-4 w-4 border-border text-primary focus:ring-primary/20"
                    />
                    <span>Còn hàng</span>
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="product-sort"
                    className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    Sắp xếp
                  </label>
                  <select
                    id="product-sort"
                    value={`${sortBy}-${order}`}
                    onChange={(event) => {
                      const [nextSortBy, nextOrder] = event.target.value.split("-");
                      updateFilters({
                        sortBy: nextSortBy,
                        order: nextOrder,
                        page: "1",
                      });
                    }}
                    className="h-11 w-full border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="createdAt-desc">Mới nhất</option>
                    <option value="price-asc">Giá thấp đến cao</option>
                    <option value="price-desc">Giá cao đến thấp</option>
                    <option value="name-asc">Tên A-Z</option>
                    <option value="viewCount-desc">Xem nhiều</option>
                    <option value="soldQuantity-desc">Bán chạy</option>
                  </select>
                </div>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              {isLoading ? (
                <ProductGridSkeleton />
              ) : isError ? (
                <div className="border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
                  <p className="font-headline text-2xl italic text-primary">
                    Không thể tải sản phẩm.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Vui lòng thử lại sau ít phút.
                  </p>
                </div>
              ) : products.length === 0 ? (
                <div className="border border-dashed border-border bg-accent/20 px-6 py-16 text-center">
                  <p className="font-headline text-2xl italic text-primary">
                    Không tìm thấy sản phẩm phù hợp.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Xóa bộ lọc và thử lại
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {meta && meta.totalPages > 1 ? (
                    <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border border-border/40 bg-card px-5 py-4">
                      <p className="text-sm text-muted-foreground">
                        Trang {meta.page} / {meta.totalPages}
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={meta.page <= 1}
                          onClick={() =>
                            updateFilters({ page: String(meta.page - 1) })
                          }
                          className="inline-flex h-11 items-center gap-2 border border-border px-4 text-sm font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Trước
                        </button>
                        <button
                          type="button"
                          disabled={meta.page >= meta.totalPages}
                          onClick={() =>
                            updateFilters({ page: String(meta.page + 1) })
                          }
                          className="inline-flex h-11 items-center gap-2 border border-border px-4 text-sm font-medium transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Sau
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="mb-5 aspect-[4/5] bg-accent" />
          <div className="mb-3 h-5 w-3/4 bg-accent" />
          <div className="h-4 w-1/2 bg-accent" />
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0]?.url;
  const price = product.pricing?.discountedPrice ?? product.price;
  const hasDiscount =
    product.pricing?.discountedPrice &&
    product.pricing.discountedPrice < product.pricing.originalPrice;

  return (
    <article className="group">
      <div className="relative mb-5 aspect-[4/5] overflow-hidden border border-border/20 bg-accent">
          {image ? (
            <SafeImage
              src={mediaApi.getImageUrl(image)}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Chưa có ảnh
            </div>
          )}
          {product.stock <= 0 ? (
            <span className="absolute left-3 top-3 z-20 bg-background px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Hết hàng
            </span>
          ) : null}
          <div className="absolute inset-0 bg-foreground/0 transition-colors duration-300 group-hover:bg-foreground/10" />
          <ProductCardActions productId={product.id} stock={product.stock} />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/products/${product.id}`}>
            <h3 className="line-clamp-2 font-headline text-xl italic text-foreground transition group-hover:text-primary">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {product.category?.name || "Danh mục"} ·{" "}
            {product.seller?.shopName || product.seller?.name || "Người bán"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-primary">
            {formatCurrency(Number(price))}
          </p>
          {hasDiscount ? (
            <p className="text-xs text-muted-foreground line-through">
              {formatCurrency(Number(product.pricing?.originalPrice))}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <CustomerNavBar />
          <main className="flex min-h-[60vh] items-center justify-center pt-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </main>
          <CustomerFooter />
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
