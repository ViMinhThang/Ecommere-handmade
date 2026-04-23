import Image from "next/image";
import Link from "next/link";
import { Leaf } from "lucide-react";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CategoriesSection } from "@/components/storefront/categories-section";
import { ProductsSection } from "@/components/storefront/products-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />

      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative px-8 py-20 lg:py-32 overflow-hidden bg-background">
          <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center gap-16">
            <div className="w-full lg:w-1/2 z-10">
              <h1 className="text-5xl lg:text-7xl font-headline italic tracking-tight text-primary leading-tight mb-8">
                Tâm hồn của <br />Tác phẩm Thủ công.
              </h1>
              <p className="text-muted-foreground text-lg lg:text-xl max-w-md mb-10 leading-relaxed font-body">
                Một thánh đường được tuyển chọn cho những ai tìm kiếm nguồn gốc. Mỗi tác phẩm kể một câu chuyện về sự kiên nhẫn, vật liệu và sự điêu luyện.
              </p>
              <div className="flex gap-4">
                <button className="bg-gradient-to-br from-[#853724] to-[#a44e39] text-primary-foreground px-8 py-4 rounded-md font-medium tracking-wide shadow-lg hover:opacity-90 transition-opacity">
                  Khám phá Bộ sưu tập
                </button>
                <button className="bg-accent text-primary px-8 py-4 rounded-md font-medium tracking-wide hover:bg-border transition-colors">
                  Câu chuyện Người bán
                </button>
              </div>
            </div>
            
            <div className="w-full lg:w-1/2 relative flex justify-end">
              <div className="relative w-full aspect-[4/5] max-w-lg">
                <Image 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG9zrU_iJRSBqRm4OovEaGqSiPy46tb2Ne_00RNO4N6Y7-SgegDJ86opXZ_cV4HcXidVuOZviG6-IPzTcObI0FA6itVjN2HCJUgnPzhYyc2upciRtcnyAW02F-QI5Rq53N1ZNaedW2gvWNTBUkrkRVXn7Ry2Mxyr2Ihwmzmy5AyvP4islhOf_W7E7YpjmX8Nvmdp3mMXGg4QaSDXW9p6WceigbI5I1bupYsNXRMMvoSw19yC0H46AXOIh0VyV905R8wejEEFAVvjE" 
                  alt="Close-up of a handmade ceramic vase with visible fingerprints and earthy clay texture in warm natural studio lighting" 
                  fill
                  className="object-cover rounded-xl shadow-2xl"
                  priority
                />
                <div className="absolute -bottom-12 -left-12 w-64 h-80 hidden md:block">
                  <Image 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuChBTJRCtPleYgFyMFCinlK7nX8ESwK4iL4-9T3wU3mvtbM7VInewwTsKwZYP-DNpyPYvOUNm2V4i4YKb-Hpg1N4sKQnrz6yuL1nTOIR-rHyvxSLRVRW2CV9G2hDySPS3UCcBrPXhm94ejrlLcEXIwLh7MyCxwbKSWDBTi-4L1_NDWVGZ3VfpqWLyTkUuyEnqONT0OhxBxNLMHVvXM7mhxNgcsyEAKmK72HFdvPI4tU9PFz8x_y5OzIGGlJ7TJgNFg0wPLIQ3vrUTA" 
                    alt="Detail of a hand-woven natural linen textile with intricate beige and cream weave patterns lying softly folded" 
                    fill
                    className="object-cover rounded-xl shadow-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Categories (Asymmetric Bento) */}
        <CategoriesSection />

        {/* New Arrivals */}
        <ProductsSection 
          title="Sản phẩm Mới" 
          subtitle="Vừa ra mắt" 
          params={{ limit: 4 }} 
        />

        {/* Best Selling */}
        <ProductsSection 
          title="Bán chạy nhất" 
          subtitle="Được yêu thích nhất" 
          params={{ limit: 4 }} 
        />


      </main>

      <CustomerFooter />
    </div>
  );
}