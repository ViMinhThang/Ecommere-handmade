"use client";

import Image from "next/image";
import Link from "next/link";
import { useCategories } from "@/lib/api/hooks";

export function CategoriesSection() {
  const { data, isLoading, error } = useCategories({ status: "ACTIVE" });

  if (isLoading) {
    return (
      <section className="px-8 py-24 bg-sidebar">
        <div className="max-w-[1600px] mx-auto">
          <div className="h-8 w-48 bg-border/20 rounded mb-16 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 h-[500px] bg-border/20 rounded-xl animate-pulse" />
            <div className="md:col-span-4 h-[500px] bg-border/20 rounded-xl animate-pulse" />
            <div className="md:col-span-12 h-[400px] bg-border/20 rounded-xl animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  if (error || !data?.data || data.data.length === 0) {
    // Fallback or empty state if needed, or just return null
    return null;
  }

  const categories = data.data;

  return (
    <section className="px-8 py-24 bg-sidebar">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex justify-between items-end mb-16">
          <div>
            <span className="text-secondary-foreground font-semibold uppercase tracking-widest text-xs mb-4 block">
              Tiêu điểm Giám tuyển
            </span>
            <h2 className="text-4xl font-headline italic text-foreground">Chất liệu Thịnh hành</h2>
          </div>
          <Link href="/categories" className="text-primary font-medium hover:underline underline-offset-8 transition-all hidden sm:block">
            Xem tất cả Bộ sưu tập
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {categories.map((category, index) => {
            // Determine the span based on index to maintain the asymmetric bento look
            // Index 0: 8 columns, Index 1: 4 columns, others: variable or wrap
            const span = index === 0 ? "md:col-span-8" : index === 1 ? "md:col-span-4" : "md:col-span-12";
            const height = index === 2 ? "h-[400px]" : "h-[500px]";

            return (
              <div key={category.id} className={`${span} group relative overflow-hidden rounded-xl ${height}`}>
                {category.image ? (
                  <Image
                    src={category.image.startsWith('http') ? category.image : `http://localhost:3001/uploads/${category.image}`}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-accent" />
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                <div className="absolute bottom-10 left-10 text-white">
                  <h3 className="text-3xl font-headline italic mb-2">{category.name}</h3>
                  {category.description && (
                    <p className="text-white/80 font-body mb-6">{category.description}</p>
                  )}
                  <Link href={`/categories/${category.slug || category.id}`} className="text-sm font-bold tracking-widest uppercase border-b border-white pb-1">
                    Mua sắm {category.name}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <Link href="/categories" className="text-primary font-medium mt-8 inline-block hover:underline underline-offset-8 transition-all block sm:hidden">
          Xem tất cả Bộ sưu tập
        </Link>
      </div>
    </section>
  );
}
