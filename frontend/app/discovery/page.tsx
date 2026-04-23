"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { useProducts, useCategories } from "@/lib/api/hooks";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";

export default function DiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: categoriesData } = useCategories({ status: "ACTIVE" });
  const { data: productsData, isLoading } = useProducts({ status: "APPROVED" });
  
  const categories = categoriesData?.data || [];
  const products = productsData?.data || [];

  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />

      <main className="pt-24">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
          <h1 className="text-5xl md:text-7xl font-headline font-bold mb-8 leading-tight">
            Bộ sưu tập Mẫu <span className="italic font-normal text-primary underline decoration-primary/20 underline-offset-8">Thủ công</span> Tuyển chọn
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed text-lg">
            Khám phá các sản phẩm tinh xảo được cung cấp bởi các Người bán uy tín. Mỗi chi tiết đều được thiết kế sống động phục vụ nhu cầu của quý khách.
          </p>

          {/* Main Search */}
          <div className="max-w-2xl mx-auto relative flex items-center bg-white p-1.5 rounded-none shadow-[0_10px_40px_-15px_rgba(84,67,60,0.15)] border border-border/40">
            <Search className="ml-4 w-5 h-5 text-muted-foreground/50" />
            <input 
              type="text" 
              placeholder="Tìm kiếm mẫu (v.d. In nổi, Cạnh răng cưa, Ép kim vàng)" 
              className="flex-grow px-4 py-3 text-foreground focus:outline-none bg-transparent font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="bg-primary text-primary-foreground px-8 py-3 rounded-none font-bold tracking-widest uppercase text-xs hover:bg-primary/90 transition-all">
              Khám phá
            </button>
          </div>
        </section>

        {/* Category Filters */}
        <div className="max-w-7xl mx-auto px-6 mb-16 flex flex-wrap justify-center gap-3">
          <button className="px-6 py-2.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-widest transition-all shadow-sm">
            Tất cả Bộ sưu tập
          </button>
          {categories.map((cat) => (
            <Link 
              key={cat.id} 
              href={`/categories/${cat.slug || cat.id}`}
              className="px-6 py-2.5 rounded-full bg-muted/40 text-muted-foreground text-xs font-bold uppercase tracking-widest hover:bg-muted transition-all border border-border/20"
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Gallery Grid (Asymmetric) */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-muted/30 animate-pulse rounded-sm aspect-[4/5]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
              {products.length > 0 ? (
                <>
                  {/* Large Item (Spans 2 columns on large screens) */}
                  <div className="group lg:col-span-2">
                    <Link href={`/products/${products[0].id}`} className="block">
                      <div className="aspect-[16/10] bg-muted rounded-none mb-6 shadow-sm group-hover:shadow-xl transition-all relative overflow-hidden ring-1 ring-border/10">
                        {products[0].images?.[0] && (
                          <Image
                            src={products[0].images?.[0].url.startsWith('http') ? products[0].images?.[0].url : `http://localhost:3001/uploads/${products[0].images?.[0].url}`}
                            alt={products[0].name}
                            fill
                            className="object-cover transition-transform duration-1000 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-all" />
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-headline italic font-bold text-foreground">{products[0].name}</h3>
                          <p className="text-sm text-muted-foreground mt-2 font-medium">
                            {products[0].category?.name} • {products[0].seller?.shopName}
                          </p>
                        </div>
                        <span className="text-primary font-headline italic font-bold text-xl">{formatCurrency(Number(products[0].price))}</span>
                      </div>
                    </Link>
                  </div>

                  {/* Other Items */}
                  {products.slice(1, 6).map((product, idx) => {
                    const aspectRatios = ["aspect-[4/5]", "aspect-[3/4]", "aspect-[1/1]", "aspect-[4/5]"];
                    const ratio = aspectRatios[idx % aspectRatios.length];
                    
                    return (
                      <div key={product.id} className="group">
                        <Link href={`/products/${product.id}`} className="block">
                          <div className={`${ratio} bg-muted rounded-none mb-6 shadow-sm group-hover:shadow-xl transition-all relative overflow-hidden ring-1 ring-border/10`}>
                            {product.images?.[0] && (
                              <Image
                                src={product.images?.[0].url.startsWith('http') ? product.images?.[0].url : `http://localhost:3001/uploads/${product.images?.[0].url}`}
                                alt={product.name}
                                fill
                                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-all" />
                          </div>
                          <div className="flex justify-between items-end">
                            <div>
                              <h3 className="text-xl font-headline italic font-bold text-foreground leading-tight">{product.name}</h3>
                              <p className="text-xs text-muted-foreground mt-1.5 font-bold uppercase tracking-widest">{product.category?.name}</p>
                            </div>
                            <span className="text-primary font-bold text-sm tracking-tighter">{formatCurrency(Number(product.price))}</span>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="col-span-full py-24 text-center">
                  <p className="text-muted-foreground italic font-serif text-lg">Đang cập nhật những mẫu thiết kế thủ công mới...</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Custom Commission Banner */}
        <section className="max-w-7xl mx-auto px-6 mb-32">
          <div className="bg-[#F2EEE6] rounded-none p-12 md:p-24 flex flex-col md:flex-row items-center justify-between gap-16 border border-border/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            
            <div className="max-w-lg z-10">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary mb-6 block">Dịch vụ Chế tác Riêng</span>
              <h2 className="text-4xl md:text-6xl font-headline font-bold mb-8 leading-tight">Quý khách chưa tìm thấy mẫu ưng ý?</h2>
              <p className="text-muted-foreground mb-10 leading-relaxed text-lg">
                Các Người bán của chúng tôi nhận sản xuất riêng theo yêu cầu. Hãy kết nối trực tiếp để hiện thực hóa ý tưởng của quý khách.
              </p>
              <button className="bg-primary text-primary-foreground px-10 py-4 rounded-none font-bold tracking-widest uppercase text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/10">
                Yêu cầu Chế tác Riêng
              </button>
            </div>
            
            <div className="w-full md:w-1/2 lg:w-2/5 aspect-[4/3] bg-muted rounded-none shadow-2xl relative transform md:rotate-2 ring-8 ring-white/10 group overflow-hidden">
               <Image 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-pM_RSR2sLwKsh9MBy0y46D9y8R36t1vLwT7J_7yLzVnXR2cT_Kz4_L9fH_JmX3V_f_GvOX_z"
                alt="Dịch vụ sản xuất riêng"
                fill
                className="object-cover opacity-90 transition-transform duration-1000 group-hover:scale-105"
               />
               <div className="absolute inset-0 border border-white/30 m-6" />
            </div>
          </div>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}
