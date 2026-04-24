"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useCategories } from "@/lib/api/hooks";

export function CategoriesSection() {
  const { data, isLoading, error } = useCategories({ status: "ACTIVE" });
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted || isLoading) {
    return (
      <section className="bg-sidebar px-8 py-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-16 h-8 w-48 animate-pulse rounded bg-border/20" />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
            <div className="h-[500px] animate-pulse rounded-xl bg-border/20 md:col-span-8" />
            <div className="h-[500px] animate-pulse rounded-xl bg-border/20 md:col-span-4" />
            <div className="h-[400px] animate-pulse rounded-xl bg-border/20 md:col-span-12" />
          </div>
        </div>
      </section>
    );
  }

  const categories = data?.data || [];

  if (error || categories.length === 0) {
    return (
      <section className="bg-sidebar px-8 py-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-16 flex items-end justify-between">
            <div>
              <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
                Tuyển chọn nổi bật
              </span>
              <h2 className="text-4xl font-headline italic text-foreground">
                Chất liệu thịnh hành
              </h2>
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/60 px-8 py-12 text-center">
            <p className="text-lg text-muted-foreground">
              Hiện chưa có danh mục đang hoạt động.
            </p>
            <Link
              href="/discovery"
              className="mt-6 inline-block text-sm font-bold uppercase tracking-widest text-primary underline-offset-8 hover:underline"
            >
              Khám phá sản phẩm
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-sidebar px-8 py-24">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-16 flex items-end justify-between">
          <div>
            <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
              Tuyển chọn nổi bật
            </span>
            <h2 className="text-4xl font-headline italic text-foreground">Chất liệu thịnh hành</h2>
          </div>
          <Link
            href="/discovery"
            className="hidden text-primary transition-all hover:underline underline-offset-8 sm:block font-medium"
          >
            Xem bộ sưu tập
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {categories.map((category, index) => {
            const span = index === 0 ? "md:col-span-8" : index === 1 ? "md:col-span-4" : "md:col-span-12";
            const height = index === 2 ? "h-[400px]" : "h-[500px]";

            return (
              <div key={category.id} className={`${span} ${height} group relative overflow-hidden rounded-xl`}>
                {category.image ? (
                  <Image
                    src={category.image.startsWith("http") ? category.image : `http://localhost:3001/uploads/${category.image}`}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-accent" />
                )}
                <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/40" />
                <div className="absolute bottom-10 left-10 text-white">
                  <h3 className="mb-2 text-3xl font-headline italic">{category.name}</h3>
                  {category.description && <p className="mb-6 font-body text-white/80">{category.description}</p>}
                  <Link
                    href={`/categories/${category.slug || category.id}`}
                    className="border-b border-white pb-1 text-sm font-bold uppercase tracking-widest"
                  >
                    Mua sắm {category.name}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <Link
          href="/discovery"
          className="mt-8 inline-block text-primary transition-all hover:underline underline-offset-8 sm:hidden font-medium"
        >
          Xem bộ sưu tập
        </Link>
      </div>
    </section>
  );
}
