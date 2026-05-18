"use client";

import { useCategory } from "@/lib/api/hooks";
import { productsApi } from "@/lib/api/products";
import { mediaApi } from "@/lib/api/media";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { formatCurrency } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Suspense, useCallback, useMemo } from "react";

const PRODUCTS_PER_PAGE = 9;

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-20 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className={`animate-pulse ${item % 3 === 1 ? "md:mt-12" : ""}`}
        >
          <div className="mb-6 aspect-[4/5] rounded-lg bg-border/10" />
          <div className="mb-2 h-6 w-48 rounded bg-border/10" />
          <div className="h-4 w-24 rounded bg-border/10" />
        </div>
      ))}
    </div>
  );
}

function CategoryPageContent() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const minPrice = searchParams.get("minPrice")
    ? Number(searchParams.get("minPrice"))
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? Number(searchParams.get("maxPrice"))
    : undefined;
  const readyToShip = searchParams.get("readyToShip") === "true";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";

  const { data: category, isLoading: categoryLoading } = useCategory(
    slug as string,
  );

  const productParams = useMemo(
    () => ({
      categoryId: category?.id,
      minPrice,
      maxPrice,
      readyToShip,
      sortBy,
      order,
      status: "APPROVED",
    }),
    [category?.id, maxPrice, minPrice, order, readyToShip, sortBy],
  );

  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: productsLoading,
  } = useInfiniteQuery({
    queryKey: ["products", "category-page", productParams],
    queryFn: ({ pageParam }) =>
      productsApi.getAll({
        ...productParams,
        page: pageParam,
        limit: PRODUCTS_PER_PAGE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
    enabled: Boolean(category?.id),
  });
  const visibleProducts =
    productsData?.pages.flatMap((pageData) => pageData.data) ?? [];
  const hasMore = Boolean(hasNextPage);

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const query = params.toString();
      router.push(query ? `?${query}` : `/categories/${slug}`, {
        scroll: false,
      });
    },
    [router, searchParams, slug],
  );

  const clearFilters = () => {
    router.push(`/categories/${slug}`, { scroll: false });
  };

  const isPriceSelected = (min?: number, max?: number) => {
    return minPrice === min && maxPrice === max;
  };

  if (categoryLoading) {
    return (
      <div className="min-h-screen bg-background">
        <CustomerNavBar />
        <main className="mx-auto min-h-screen max-w-[1600px] animate-pulse px-8 pt-32">
          <div className="mb-4 h-12 w-64 rounded bg-border/20" />
          <div className="mb-16 h-4 w-96 rounded bg-border/20" />
          <div className="flex gap-12">
            <div className="hidden h-96 w-64 rounded bg-border/20 lg:block" />
            <div className="grow">
              <ProductGridSkeleton />
            </div>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />

      <main className="mx-auto min-h-screen max-w-[1600px] px-8 pt-32">
        <header className="mb-16 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <h1 className="mb-4 text-5xl italic tracking-tight text-primary md:text-6xl">
              {category?.name || "Danh mục"}
            </h1>
            <p className="max-w-xl leading-relaxed text-muted-foreground">
              {category?.description ||
                "Các sản phẩm được tuyển chọn kỹ lưỡng từ những người bán uy tín."}
            </p>
          </div>

          <div className="flex items-center gap-4 border-b border-primary/10 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Sắp xếp:
            </span>
            <select
              className="cursor-pointer bg-transparent pr-4 text-sm font-bold text-primary focus:outline-none"
              value={`${sortBy}-${order}`}
              onChange={(event) => {
                const [newSort, newOrder] = event.target.value.split("-");
                updateFilters({ sortBy: newSort, order: newOrder });
              }}
            >
              <option value="createdAt-desc">Mới nhất</option>
              <option value="price-asc">Giá: Thấp đến cao</option>
              <option value="price-desc">Giá: Cao đến thấp</option>
              <option value="viewCount-desc">Xem nhiều nhất</option>
            </select>
          </div>
        </header>

        <div className="flex flex-col gap-12 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <div className="sticky top-32 space-y-12">
              <section>
                <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Khoảng giá
                </h3>
                <div className="space-y-4">
                  {[
                    { label: "Dưới 500.000đ", min: 0, max: 500000 },
                    {
                      label: "500.000đ - 2.000.000đ",
                      min: 500000,
                      max: 2000000,
                    },
                    {
                      label: "2.000.000đ - 5.000.000đ",
                      min: 2000000,
                      max: 5000000,
                    },
                    { label: "Trên 5.000.000đ", min: 5000000 },
                  ].map((range) => (
                    <label
                      key={range.label}
                      className="group flex cursor-pointer items-center"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary/20"
                        checked={isPriceSelected(range.min, range.max)}
                        onChange={() => {
                          if (isPriceSelected(range.min, range.max)) {
                            updateFilters({ minPrice: null, maxPrice: null });
                          } else {
                            updateFilters({
                              minPrice: range.min.toString(),
                              maxPrice: range.max
                                ? range.max.toString()
                                : null,
                            });
                          }
                        }}
                      />
                      <span className="ml-3 text-sm text-foreground transition-colors group-hover:text-primary">
                        {range.label}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Trạng thái
                </h3>
                <label className="group flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary/20"
                    checked={readyToShip}
                    onChange={(event) =>
                      updateFilters({
                        readyToShip: event.target.checked ? "true" : null,
                      })
                    }
                  />
                  <span className="ml-3 text-sm text-foreground">
                    Sẵn sàng giao ngay
                  </span>
                </label>
              </section>

              <div className="border-t border-border/10 pt-4">
                <button
                  onClick={clearFilters}
                  className="group flex items-center text-[10px] font-bold uppercase tracking-widest text-primary transition-opacity hover:opacity-70"
                >
                  Xóa tất cả bộ lọc
                  <X className="ml-2 h-3 w-3 transition-transform group-hover:rotate-90" />
                </button>
              </div>
            </div>
          </aside>

          <div className="grow">
            {productsLoading && visibleProducts.length === 0 ? (
              <ProductGridSkeleton />
            ) : visibleProducts.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border/40 bg-muted/10 py-24 text-center">
                <p className="text-lg italic text-muted-foreground">
                  Không tìm thấy tác phẩm nào phù hợp.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm font-bold uppercase tracking-widest text-primary hover:underline"
                >
                  Xóa bộ lọc và thử lại
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-12 gap-y-20 md:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className={`group ${index % 3 === 1 ? "md:mt-12" : ""}`}
                  >
                    <Link href={`/products/${product.id}`}>
                      <div className="relative mb-6 aspect-[4/5] overflow-hidden rounded-lg border border-border/10 bg-border/10 shadow-sm">
                        {product.images?.[0] ? (
                          <Image
                            src={mediaApi.getImageUrl(product.images[0].url)}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            Chưa có ảnh
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="translate-y-4 bg-background px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary shadow-xl transition-transform duration-300 group-hover:translate-y-0">
                            Chi tiết
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/products/${product.id}`}>
                          <h3 className="mb-1 text-xl italic text-foreground transition-colors group-hover:text-primary">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-sm font-medium italic text-muted-foreground">
                          bởi {product.seller?.shopName || "Người bán"}
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-lg font-bold text-primary">
                        {formatCurrency(Number(product.price))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-24 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={!hasMore || productsLoading || isFetchingNextPage}
                className="group flex items-center rounded-md bg-primary px-12 py-4 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-lg shadow-primary/10 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isFetchingNextPage
                  ? "Đang tải..."
                  : hasMore
                    ? "Xem thêm tác phẩm"
                    : "Đã hiển thị tất cả"}
                <ChevronDown className="ml-3 h-4 w-4 transition-transform group-hover:translate-y-1" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <CustomerNavBar />
          <main className="flex min-h-[60vh] items-center justify-center pt-32">
            <p className="text-sm text-muted-foreground">Loading category...</p>
          </main>
          <CustomerFooter />
        </div>
      }
    >
      <CategoryPageContent />
    </Suspense>
  );
}
