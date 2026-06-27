"use client";

import Link from "next/link";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { HomepageFeaturedProducts } from "@/components/storefront/homepage-featured-products";
import { ProductsSection } from "@/components/storefront/products-section";
import { PublicFlashSaleSection } from "@/components/storefront/public-promotions-section";
import { useHomepage } from "@/lib/api/hooks";

export default function Home() {
  const { data: homepageData, isError } = useHomepage();
  const primaryBanner = !isError ? homepageData?.banners?.[0] : undefined;
  const featuredProducts = !isError ? homepageData?.featuredProducts ?? [] : [];

  return (
    <div className="min-h-screen bg-background font-body text-foreground selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />

      <main className="pt-24">
        {primaryBanner ? (
          <section
            className="relative overflow-hidden bg-cover bg-center px-8 py-20 lg:py-32"
            style={{
              backgroundImage: primaryBanner.imageUrl
                ? `url(${primaryBanner.imageUrl})`
                : undefined,
            }}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-10 mx-auto flex max-w-[960px] flex-col items-center text-center">
              <div className="w-full">
                <h1 className="mb-8 text-5xl font-headline italic leading-tight tracking-tight text-white lg:text-7xl">
                  {primaryBanner.title}
                </h1>
                {primaryBanner.subtitle ? (
                  <p className="mb-10 mx-auto max-w-2xl text-lg leading-relaxed text-white/90 lg:text-xl">
                    {primaryBanner.subtitle}
                  </p>
                ) : null}
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href={primaryBanner.linkUrl || "/discovery"}
                    className="rounded-md bg-gradient-to-br from-[#853724] to-[#a44e39] px-8 py-4 font-medium tracking-wide text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
                  >
                    Khám phá ngay
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md bg-white/20 px-8 py-4 font-medium tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  >
                    Trở thành người bán
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden bg-background px-8 py-20 lg:py-32">
            <div className="mx-auto flex max-w-[960px] flex-col items-center text-center">
              <div className="z-10 w-full">
                <h1 className="mb-8 text-5xl font-headline italic leading-tight tracking-tight text-primary lg:text-7xl">
                  Tâm hồn của <br />
                  Tác phẩm thủ công.
                </h1>
                <p className="mb-10 mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground lg:text-xl">
                  Một bộ sưu tập được chọn lọc cho những ai tìm kiếm giá trị
                  thật. Mỗi tác phẩm kể một câu chuyện về sự kiên nhẫn, vật
                  liệu và kỹ năng.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    href="/discovery"
                    className="rounded-md bg-gradient-to-br from-[#853724] to-[#a44e39] px-8 py-4 font-medium tracking-wide text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
                  >
                    Khám phá bộ sưu tập
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md bg-accent px-8 py-4 font-medium tracking-wide text-primary transition-colors hover:bg-border"
                  >
                    Trở thành người bán
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {featuredProducts.length > 0 ? (
          <HomepageFeaturedProducts products={featuredProducts} />
        ) : null}

        <PublicFlashSaleSection />

        <ProductsSection
          title="Gợi ý cho bạn"
          subtitle="Được chọn theo hành vi mua sắm"
          mode="recommendations"
          limit={4}
        />

        <ProductsSection
          title="Sản phẩm mới"
          subtitle="Vừa ra mắt"
          mode="latest"
          params={{ limit: 4 }}
        />

        <ProductsSection
          title="Sản phẩm bán chạy"
          subtitle="Được yêu thích nhất"
          mode="best-selling"
          limit={4}
        />

        <ProductsSection
          title="Sản phẩm được xem nhiều nhất"
          subtitle="Được quan tâm nhất"
          mode="most-viewed"
          limit={4}
        />
      </main>

      <CustomerFooter />
    </div>
  );
}
