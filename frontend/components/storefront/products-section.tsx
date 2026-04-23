"use client";

import Image from "next/image";
import Link from "next/link";
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

  if (isLoading) {
    return (
      <section className="px-8 py-24 bg-background">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col items-center mb-16 text-center">
            <div className="h-4 w-32 bg-border/20 rounded mb-4 animate-pulse" />
            <div className="h-10 w-64 bg-border/20 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-[3/4] bg-border/20 rounded-xl animate-pulse" />
                <div className="h-4 w-3/4 bg-border/20 rounded animate-pulse" />
                <div className="h-4 w-1/4 bg-border/20 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const products = data?.data || [];
  if (products.length === 0) return null;

  // Limit products if needed
  const displayProducts = params?.limit ? products.slice(0, params.limit) : products;

  return (
    <section className="px-8 py-24 bg-background border-t border-border/10">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col items-center mb-16 text-center">
          <span className="text-secondary-foreground font-semibold uppercase tracking-widest text-xs mb-4 block">
            {subtitle}
          </span>
          <h2 className="text-4xl md:text-5xl font-headline italic text-foreground leading-tight">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <Link href="/shop" className="inline-flex items-center gap-2 text-primary font-medium hover:underline underline-offset-8 transition-all">
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
    ? (mainImage.url.startsWith('http') ? mainImage.url : `http://localhost:3001/uploads/${mainImage.url}`)
    : null;
  const isFlashSale = product.pricing && product.pricing.discountPercent > 0;

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-accent mb-6 shadow-sm border border-border/20">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">
            Không có hình ảnh
          </div>
        )}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="bg-background/80 backdrop-blur-md text-foreground px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest border border-border/40 w-fit">
            {product.category?.name || "Thủ công"}
          </span>
          {isFlashSale && (
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest shadow-lg w-fit">
              -{product.pricing?.discountPercent}% OFF
            </span>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-headline italic text-foreground group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-sm font-body line-clamp-1">
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
              <p className="text-lg font-bold text-primary">
                {formatCurrency(Number(product.price))}
              </p>
            )}
          </div>
          <button className="text-xs font-bold tracking-widest uppercase text-muted-foreground hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-1">
            Xem chi tiết
          </button>
        </div>
      </div>
    </Link>
  );
}
