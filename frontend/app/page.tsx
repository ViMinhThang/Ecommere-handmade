"use client";

import Image from "next/image";
import Link from "next/link";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { HomepageFeaturedProducts } from "@/components/storefront/homepage-featured-products";
import { ProductsSection } from "@/components/storefront/products-section";
import { PublicFlashSaleSection } from "@/components/storefront/public-promotions-section";
import { SafeImage } from "@/components/ui/safe-image";
import { useHomepage } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";

export default function Home() {
  const { data: homepageData, isError } = useHomepage();
  const primaryBanner = !isError ? homepageData?.banners?.[0] : undefined;
  const featuredProducts = !isError ? homepageData?.featuredProducts ?? [] : [];

  return (
    <div className="min-h-screen bg-background font-body text-foreground selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />

      <main className="pt-24">
        {primaryBanner ? (
          <section className="relative overflow-hidden bg-background px-8 py-20 lg:py-32">
            <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-16 lg:flex-row">
              <div className="z-10 w-full lg:w-1/2">
                <h1 className="mb-8 text-5xl font-headline italic leading-tight tracking-tight text-primary lg:text-7xl">
                  {primaryBanner.title}
                </h1>
                {primaryBanner.subtitle ? (
                  <p className="mb-10 max-w-md text-lg leading-relaxed text-muted-foreground lg:text-xl">
                    {primaryBanner.subtitle}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-4">
                  <Link
                    href={primaryBanner.linkUrl || "/discovery"}
                    className="rounded-md bg-gradient-to-br from-[#853724] to-[#a44e39] px-8 py-4 font-medium tracking-wide text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
                  >
                    Khám phá ngay
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md bg-accent px-8 py-4 font-medium tracking-wide text-primary transition-colors hover:bg-border"
                  >
                    Trở thành người bán
                  </Link>
                </div>
              </div>

              <div className="relative flex w-full justify-end lg:w-1/2">
                <div className="relative aspect-[4/5] w-full max-w-lg">
                  <SafeImage
                    src={mediaApi.getImageUrl(primaryBanner.imageUrl)}
                    alt={primaryBanner.title}
                    fill
                    className="rounded-xl object-cover shadow-2xl"
                    priority
                  />
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden bg-background px-8 py-20 lg:py-32">
            <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-16 lg:flex-row">
              <div className="z-10 w-full lg:w-1/2">
                <h1 className="mb-8 text-5xl font-headline italic leading-tight tracking-tight text-primary lg:text-7xl">
                  Tâm hồn của <br />
                  Tác phẩm thủ công.
                </h1>
                <p className="mb-10 max-w-md text-lg leading-relaxed text-muted-foreground lg:text-xl">
                  Một bộ sưu tập được chọn lọc cho những ai tìm kiếm giá trị
                  thật. Mỗi tác phẩm kể một câu chuyện về sự kiên nhẫn, vật
                  liệu và kỹ năng.
                </p>
                <div className="flex flex-wrap gap-4">
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

              <div className="relative flex w-full justify-end lg:w-1/2">
                <div className="relative aspect-[4/5] w-full max-w-lg">
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG9zrU_iJRSBqRm4OovEaGqSiPy46tb2Ne_00RNO4N6Y7-SgegDJ86opXZ_cV4HcXidVuOZviG6-IPzTcObI0FA6itVjN2HCJUgnPzhYyc2upciRtcnyAW02F-QI5Rq53N1ZNaedW2gvWNTBUkrkRVXn7Ry2Mxyr2Ihwmzmy5AyvP4islhOf_W7E7YpjmX8Nvmdp3mMXGg4QaSDXW9p6WceigbI5I1bupYsNXRMMvoSw19yC0H46AXOIh0VyV905R8wejEEFAVvjE"
                    alt="Handmade ceramic vase"
                    fill
                    className="rounded-xl object-cover shadow-2xl"
                    priority
                  />
                  <div className="absolute -bottom-12 -left-12 hidden h-80 w-64 md:block">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuChBTJRCtPleYgFyMFCinlK7nX8ESwK4iL4-9T3wU3mvtbM7VInewwTsKwZYP-DNpyPYvOUNm2V4i4YKb-Hpg1N4sKQnrz6yuL1nTOIR-rHyvxSLRVRW2CV9G2hDySPS3UCcBrPXhm94ejrlLcEXIwLh7MyCxwbKSWDBTi-4L1_NDWVGZ3VfpqWLyTkUuyEnqONT0OhxBxNLMHVvXM7mhxNgcsyEAKmK72HFdvPI4tU9PFz8x_y5OzIGGlJ7TJgNFg0wPLIQ3vrUTA"
                      alt="Handwoven textile"
                      fill
                      className="rounded-xl object-cover shadow-xl"
                    />
                  </div>
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
