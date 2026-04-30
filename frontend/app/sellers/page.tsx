"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Search, Star, Store } from "lucide-react";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { useSearchSellers } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";
import type {
  SellerSearchResult,
  SellerSearchSortBy,
} from "@/types";

const PAGE_SIZE = 9;

function SellersSearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [draftQuery, setDraftQuery] = useState(searchParams.get("q") || "");
  const page = Math.max(Number(searchParams.get("page") || "1"), 1);
  const sortBy =
    (searchParams.get("sortBy") as SellerSearchSortBy | null) || "relevance";

  useEffect(() => {
    setDraftQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const queryParams = useMemo(
    () => ({
      q: searchParams.get("q")?.trim() || undefined,
      page,
      limit: PAGE_SIZE,
      sortBy,
      sortOrder: "desc" as const,
    }),
    [page, searchParams, sortBy],
  );

  const { data, isLoading, isError, error } = useSearchSellers(queryParams);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    const queryString = nextParams.toString();
    router.push(`/sellers${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateSearchParams({
      q: draftQuery.trim() || null,
      page: "1",
    });
  };

  const handleSortChange = (value: SellerSearchSortBy) => {
    updateSearchParams({
      sortBy: value === "relevance" ? null : value,
      page: "1",
    });
  };

  const pagination = data?.pagination;
  const sellers = data?.data || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomerNavBar />

      <main className="pt-24">
        <section className="border-b border-border/30 bg-accent/40 px-6 py-16 md:px-10 lg:px-14">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                Khám phá gian hàng
              </p>
              <h1 className="font-headline text-4xl italic text-primary md:text-6xl">
                Tìm những studio thủ công phù hợp với gu của bạn
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                Tìm kiếm theo tên gian hàng, người bán hoặc câu chuyện sáng tạo.
                Mỗi studio đều dẫn bạn đến một bộ sưu tập thủ công riêng biệt.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-background/85 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <form
                onSubmit={handleSubmit}
                className="flex flex-1 flex-col gap-3 md:flex-row"
              >
                <label className="sr-only" htmlFor="seller-search">
                  Tìm kiếm gian hàng
                </label>
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="seller-search"
                    value={draftQuery}
                    onChange={(event) => setDraftQuery(event.target.value)}
                    placeholder="Tìm kiếm gian hàng..."
                    className="h-12 w-full rounded-2xl border border-border bg-background pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Tìm kiếm
                </button>
              </form>

              <div className="flex items-center gap-3">
                <label
                  htmlFor="seller-sort"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                >
                  Sắp xếp
                </label>
                <select
                  id="seller-sort"
                  value={sortBy}
                  onChange={(event) =>
                    handleSortChange(event.target.value as SellerSearchSortBy)
                  }
                  className="h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="relevance">Phù hợp nhất</option>
                  <option value="newest">Mới nhất</option>
                  <option value="productCount">Nhiều sản phẩm nhất</option>
                  <option value="rating">Đánh giá cao nhất</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10 lg:px-14">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
            <div>
              <h2 className="font-headline text-3xl italic text-primary">
                Gian hàng nổi bật
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {pagination?.total
                  ? `Tìm thấy ${pagination.total} gian hàng phù hợp.`
                  : "Khám phá các gian hàng thủ công đang hoạt động."}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-3xl border border-border/40 bg-card p-6"
                  >
                    <div className="mb-5 h-52 animate-pulse rounded-2xl bg-accent" />
                    <div className="mb-3 h-6 w-2/3 animate-pulse rounded bg-accent" />
                    <div className="mb-2 h-4 w-1/3 animate-pulse rounded bg-accent" />
                    <div className="h-4 w-full animate-pulse rounded bg-accent" />
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-3xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
                <p className="font-headline text-xl italic text-primary">
                  Không thể tải danh sách gian hàng.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : "Vui lòng thử lại sau ít phút."}
                </p>
              </div>
            ) : sellers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-accent/20 px-6 py-16 text-center">
                <p className="font-headline text-2xl italic text-primary">
                  Không tìm thấy gian hàng phù hợp.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Thử từ khóa khác hoặc bỏ bộ lọc hiện tại để xem thêm studio.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {sellers.map((seller) => (
                  <SellerCard key={seller.id} seller={seller} />
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/40 bg-card px-5 py-4">
                <p className="text-sm text-muted-foreground">
                  Trang {pagination.page} / {pagination.totalPages}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      updateSearchParams({
                        page: String(pagination.page - 1),
                      })
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() =>
                      updateSearchParams({
                        page: String(pagination.page + 1),
                      })
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sau
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}

function SellerCard({ seller }: { seller: SellerSearchResult }) {
  const studioName = seller.shopName || seller.name;
  const joinedLabel = new Intl.DateTimeFormat("vi-VN", {
    month: "2-digit",
    year: "numeric",
  }).format(new Date(seller.createdAt));
  const initials = studioName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/40 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-accent">
        {seller.avatar ? (
          <Image
            src={mediaApi.getImageUrl(seller.avatar)}
            alt={studioName}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/10">
            <span className="font-headline text-4xl italic text-primary">
              {initials || "GH"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="font-headline text-2xl italic text-primary">
              {studioName}
            </h3>
            {seller.shopName ? (
              <p className="text-sm text-muted-foreground">Bởi {seller.name}</p>
            ) : null}
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Tham gia {joinedLabel}
          </span>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {seller.sellerBio ||
            seller.sellerTitle ||
            "Gian hàng đang cập nhật thêm câu chuyện và bộ sưu tập của mình."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-accent/35 p-4 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Sản phẩm
            </p>
            <p className="mt-2 flex items-center gap-2 font-medium text-foreground">
              <Store className="h-4 w-4 text-primary" />
              {seller.productCount}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Đánh giá
            </p>
            <p className="mt-2 flex items-center gap-2 font-medium text-foreground">
              <Star className="h-4 w-4 fill-primary text-primary" />
              {seller.averageRating !== null
                ? `${seller.averageRating.toFixed(1)} · ${seller.totalReviews}`
                : "Chưa có"}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Link
            href={seller.linkTarget}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Xem gian hàng
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function SellersSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <CustomerNavBar />
          <div className="flex min-h-[60vh] items-center justify-center pt-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <CustomerFooter />
        </div>
      }
    >
      <SellersSearchPageContent />
    </Suspense>
  );
}
