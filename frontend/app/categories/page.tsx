"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { SafeImage } from "@/components/ui/safe-image";
import { useCategories } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";

export default function CategoriesPage() {
  const { data, isLoading, isError } = useCategories({ status: "ACTIVE" });
  const categories = data?.data || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CustomerNavBar />

      <main className="pt-24">
        <section className="border-b border-border/30 bg-accent/40 px-6 py-16 md:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
              Danh mục
            </p>
            <h1 className="mt-4 max-w-4xl font-headline text-4xl italic text-primary md:text-6xl">
              Khám phá đầy đủ các chất liệu và sản phẩm thủ công
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Tất cả danh mục đang hoạt động được lấy trực tiếp từ hệ thống để
              không bỏ sót nhóm sản phẩm mới.
            </p>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10 lg:px-14">
          <div className="mx-auto max-w-7xl">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-80 animate-pulse rounded-xl bg-accent"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
                <p className="font-headline text-2xl italic text-primary">
                  Không thể tải danh mục.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Vui lòng thử lại sau ít phút.
                </p>
              </div>
            ) : categories.length === 0 ? (
              <div className="border border-dashed border-border bg-accent/20 px-6 py-12 text-center">
                <p className="font-headline text-2xl italic text-primary">
                  Chưa có danh mục hoạt động.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug || category.id}`}
                    className="group overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-accent">
                      {category.image ? (
                        <SafeImage
                          src={mediaApi.getImageUrl(category.image)}
                          alt={category.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-primary/10">
                          <span className="font-headline text-4xl italic text-primary">
                            {category.name.slice(0, 2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h2 className="font-headline text-2xl italic text-primary">
                        {category.name}
                      </h2>
                      {category.description ? (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {category.description}
                        </p>
                      ) : null}
                      <div className="mt-5 flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          {category.productsCount || 0} sản phẩm
                        </span>
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                          Xem
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}
