"use client";

import { useCategory, useProducts } from "@/lib/api/hooks";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { formatCurrency } from "@/lib/utils";
import { mediaApi } from "@/lib/api/media";
import { X, ChevronDown } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse filters from URL
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const readyToShip = searchParams.get("readyToShip") === "true";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const order = (searchParams.get("order") as "asc" | "desc") || "desc";
  const sellerId = searchParams.get("sellerId") || undefined;

  // Category data
  const { data: category, isLoading: categoryLoading } = useCategory(slug as string);

  // Products data
  const { data: productsData, isLoading: productsLoading } = useProducts({
    categoryId: category?.id,
    minPrice,
    maxPrice,
    readyToShip,
    sortBy,
    order,
    sellerId,
    status: "APPROVED",
  });

  const products = productsData?.data || [];

  const updateFilters = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

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
        <main className="pt-32 px-8 max-w-[1600px] mx-auto min-h-screen animate-pulse">
          <div className="h-12 w-64 bg-border/20 rounded mb-4" />
          <div className="h-4 w-96 bg-border/20 rounded mb-16" />
          <div className="flex gap-12">
            <div className="w-64 h-96 bg-border/20 rounded hidden lg:block" />
            <div className="grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-4/5 bg-border/20 rounded-lg" />)}
            </div>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />

      <main className="pt-32 px-8 max-w-[1600px] mx-auto min-h-screen">
        {/* Header Section */}
        <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-headline italic text-primary mb-4 tracking-tight">
              {category?.name || "Danh mục"}
            </h1>
            <p className="text-muted-foreground max-w-xl font-body leading-relaxed">
              {category?.description || "Các sản phẩm được tuyển chọn kỹ lưỡng từ những Người bán uy tín nhất."}
            </p>
          </div>
          
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-4 border-b border-primary/10 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sắp xếp:</span>
            <select 
              className="bg-transparent text-sm font-bold text-primary focus:outline-none cursor-pointer pr-4"
              value={`${sortBy}-${order}`}
              onChange={(e) => {
                const [newSort, newOrder] = e.target.value.split("-");
                updateFilters({ sortBy: newSort, order: newOrder });
              }}
            >
              <option value="createdAt-desc">Mới nhất</option>
              <option value="price-asc">Giá: Thấp đến Cao</option>
              <option value="price-desc">Giá: Cao đến Thấp</option>
              <option value="soldQuantity-desc">Bán chạy nhất</option>
            </select>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-32 space-y-12">
              {/* Price Filter */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-6">Khoảng giá</h3>
                <div className="space-y-4">
                  {[
                    { label: "Dưới 500.000đ", min: 0, max: 500000 },
                    { label: "500.000đ — 2.000.000đ", min: 500000, max: 2000000 },
                    { label: "2.000.000đ — 5.000.000đ", min: 2000000, max: 5000000 },
                    { label: "Trên 5.000.000đ", min: 5000000, max: undefined }
                  ].map((range) => (
                    <label key={range.label} className="flex items-center group cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded-sm border-border text-primary focus:ring-primary/20"
                        checked={isPriceSelected(range.min, range.max)}
                        onChange={() => {
                          if (isPriceSelected(range.min, range.max)) {
                            updateFilters({ minPrice: null, maxPrice: null });
                          } else {
                            updateFilters({ 
                              minPrice: range.min.toString(), 
                              maxPrice: range.max ? range.max.toString() : null 
                            });
                          }
                        }}
                      />
                      <span className="ml-3 text-sm text-foreground group-hover:text-primary transition-colors font-body">
                        {range.label}
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              {/* Availability */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-6">Trạng thái</h3>
                <div className="space-y-4">
                  <label className="flex items-center group cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded-sm border-border text-primary focus:ring-primary/20"
                      checked={readyToShip}
                      onChange={(e) => updateFilters({ readyToShip: e.target.checked ? "true" : null })}
                    />
                    <span className="ml-3 text-sm text-foreground font-body">Sẵn sàng giao ngay</span>
                  </label>
                </div>
              </section>

              {/* Brand Filter Filter (Seller) */}
              <section>
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-6">Người bán</h3>
                <div className="space-y-3">
                   {/* Simplified brand list for now, ideally fetched based on category */}
                   {["all", "premium", "independent"].map((brand) => (
                     <button
                       key={brand}
                       onClick={() => updateFilters({ sellerId: brand === "all" ? null : brand })}
                       className={`block text-sm transition-colors ${sellerId === brand ? 'text-primary font-bold' : brand === undefined && brand === "all" ? 'text-primary font-bold' : 'text-muted-foreground hover:text-primary'}`}
                     >
                       {brand === "all" ? "Tất cả Người bán" : `Studio ${brand.charAt(0).toUpperCase() + brand.slice(1)}`}
                     </button>
                   ))}
                </div>
              </section>

              <div className="pt-4 border-t border-border/10">
                <button 
                  onClick={clearFilters}
                  className="text-[10px] uppercase tracking-widest font-bold text-primary hover:opacity-70 transition-opacity flex items-center group"
                >
                  Xóa tất cả bộ lọc
                  <X className="ml-2 w-3 h-3 transition-transform group-hover:rotate-90" />
                </button>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="grow">
            {productsLoading ? (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-20 gap-x-12">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className={`animate-pulse ${i % 3 === 1 ? 'md:mt-12' : ''}`}>
                      <div className="aspect-[4/5] bg-border/10 rounded-lg mb-6" />
                      <div className="h-6 w-48 bg-border/10 rounded mb-2" />
                      <div className="h-4 w-24 bg-border/10 rounded" />
                    </div>
                  ))}
               </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 border-2 border-dashed border-border/40 rounded-2xl bg-muted/10">
                <p className="text-muted-foreground italic font-headline text-lg">Không tìm thấy tác phẩm nào phù hợp.</p>
                <button 
                  onClick={clearFilters}
                  className="mt-4 text-primary font-bold text-sm tracking-widest uppercase hover:underline"
                >
                  Xóa bộ lọc và thử lại
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-20 gap-x-12">
                {products.map((product, index) => (
                  <div key={product.id} className={`group ${index % 3 === 1 ? 'md:mt-12' : ''}`}>
                    <Link href={`/products/${product.id}`}>
                      <div className="relative overflow-hidden aspect-4/5 bg-border/10 rounded-lg shadow-sm mb-6 border border-border/10">
                        {product.images?.[0] ? (
                          <Image 
                            src={mediaApi.getImageUrl(product.images[0].url)}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">No image</div>
                        )}
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button className="px-8 py-3 bg-background text-primary font-bold text-xs tracking-widest uppercase shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            Chi tiết
                          </button>
                        </div>
                      </div>
                    </Link>
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/products/${product.id}`}>
                          <h3 className="font-headline text-xl text-foreground mb-1 group-hover:text-primary transition-colors italic">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-muted-foreground text-sm font-medium italic font-body">
                          bởi {product.seller?.shopName || "Người bán"}
                        </p>
                      </div>
                      <span className="text-primary font-bold text-lg font-body">
                        {formatCurrency(Number(product.price))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-24 flex justify-center">
              <button className="px-12 py-4 bg-primary text-primary-foreground rounded-md font-bold text-xs tracking-[0.2em] flex items-center group hover:bg-primary/90 transition-colors shadow-lg shadow-primary/10">
                XEM THÊM TÁC PHẨM
                <ChevronDown className="ml-3 w-4 h-4 transition-transform group-hover:translate-y-1" />
              </button>
            </div>
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
