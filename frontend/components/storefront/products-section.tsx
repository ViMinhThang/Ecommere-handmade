"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useProducts } from "@/lib/api/hooks";
import { productsApi } from "@/lib/api/products";
import { Product } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ProductsSectionProps {
  title: string;
  subtitle: string;
  params?: Parameters<typeof productsApi.getAll>[0];
}

export function ProductsSection({ title, subtitle, params }: ProductsSectionProps) {
  const { data, isLoading } = useProducts({
    status: params?.status || "APPROVED",
    categoryId: params?.categoryId,
    sortBy: params?.sortBy,
    order: params?.order,
    limit: params?.limit,
  });
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted || isLoading) {
    return (
      <section className="bg-background px-8 py-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-16 flex flex-col items-center text-center">
            <div className="mb-4 h-4 w-32 animate-pulse rounded bg-border/20" />
            <div className="h-10 w-64 animate-pulse rounded bg-border/20" />
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-[3/4] animate-pulse rounded-xl bg-border/20" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-border/20" />
                <div className="h-4 w-1/4 animate-pulse rounded bg-border/20" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const products = data?.data || [];
  if (products.length === 0) {
    return (
      <section className="border-t border-border/10 bg-background px-8 py-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-16 flex flex-col items-center text-center">
            <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
              {subtitle}
            </span>
            <h2 className="text-4xl font-headline italic text-foreground md:text-5xl">{title}</h2>
          </div>
          <div className="rounded-xl border border-border/40 bg-card px-8 py-12 text-center">
            <p className="text-lg text-muted-foreground">Hiện chưa có sản phẩm phù hợp.</p>
            <Link
              href="/discovery"
              className="mt-6 inline-block text-sm font-bold uppercase tracking-widest text-primary underline-offset-8 hover:underline"
            >
              Xem toàn bộ sản phẩm
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const displayProducts = params?.limit ? products.slice(0, params.limit) : products;

  return (
    <section className="border-t border-border/10 bg-background px-8 py-24">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-16 flex flex-col items-center text-center">
          <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
            {subtitle}
          </span>
          <h2 className="text-4xl md:text-5xl font-headline italic text-foreground leading-tight">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/discovery"
            className="inline-flex items-center gap-2 font-medium text-primary transition-all hover:underline underline-offset-8"
          >
            Khám phá tất cả sản phẩm
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const mainImage = product.images?.find((img) => img.isMain) || product.images?.[0];
  const imageUrl = mainImage?.url
    ? mainImage.url.startsWith("http")
      ? mainImage.url
      : `http://localhost:3001/uploads/${mainImage.url}`
    : null;
  const isFlashSale = product.pricing && product.pricing.discountPercent > 0;

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="relative mb-6 aspect-[3/4] overflow-hidden rounded-xl border border-border/20 bg-accent shadow-sm">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center italic text-muted-foreground">
            Không có hình ảnh
          </div>
        )}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="w-fit rounded-full border border-border/40 bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground backdrop-blur-md">
            {product.category?.name || "Thủ công"}
          </span>
          {isFlashSale && (
            <span className="w-fit rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-lg">
              -{product.pricing?.discountPercent}% OFF
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-headline italic text-foreground transition-colors group-hover:text-primary">
          {product.name}
        </h3>
        <p className="line-clamp-1 text-sm font-body text-muted-foreground">
          Bởi {product.seller?.shopName || "Người bán uy tín"}
        </p>
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            {isFlashSale ? (
              <>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(product.pricing!.discountedPrice)}
                </p>
                <p className="text-xs text-muted-foreground line-through">
                  {formatCurrency(product.pricing!.originalPrice)}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-primary">{formatCurrency(Number(product.price))}</p>
            )}
          </div>
          <button className="border-b border-transparent pb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            Xem chi tiết
          </button>
        </div>
      </div>
    </Link>
  );
}