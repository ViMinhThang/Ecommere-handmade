import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/api/products";
import { mediaApi } from "@/lib/api/media";
import { stripProductSource } from "@/lib/utils";
import { richTextToPlainText } from "@/lib/sanitize-html";

interface ProductStoryProps {
  product: Product;
  artisanImage: string | null;
}

export function ProductStory({ product, artisanImage }: ProductStoryProps) {
  const description = richTextToPlainText(
    stripProductSource(product.description || ""),
  );

  return (
    <section className="mt-40 bg-sidebar py-32 overflow-hidden border-y border-border/10">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-20 items-center">
        <div className="md:w-1/2 space-y-12">
          <div className="relative">
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#d4e8d1]/30 rounded-full blur-[100px]"></div>
            <div className="relative z-10 space-y-8">
              {product.descriptionImages &&
              product.descriptionImages.length > 0 ? (
                <div className="columns-1 sm:columns-2 gap-6 space-y-6">
                  {product.descriptionImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="break-inside-avoid rounded-2xl overflow-hidden shadow-xl border border-border/10 bg-background group"
                    >
                      <img
                        src={mediaApi.getImageUrl(imgUrl)}
                        alt={`Chi tiết mô tả ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden shadow-2xl relative w-full h-[500px] bg-background border border-border/20 flex flex-col items-center justify-center p-12 text-center">
                  <h3 className="text-3xl font-headline italic text-primary mb-4">
                    Hoàn thiện tỉ mỉ
                  </h3>
                  <p className="text-muted-foreground font-body">
                    Mỗi chi tiết đều được chăm chút để tạo nên một sản phẩm hoàn
                    hảo.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="md:w-1/2 space-y-10">
          <div className="space-y-4">
            <span className="text-primary font-bold uppercase tracking-[0.2em] text-xs">
              Câu chuyện sản phẩm
            </span>
            <h2 className="text-4xl md:text-6xl font-headline italic text-foreground leading-tight">
              Chất lượng hàng đầu
            </h2>
          </div>

          <div className="whitespace-pre-line text-xl leading-relaxed text-muted-foreground">
            {description || "Sản phẩm được chế tác thủ công với chất liệu chọn lọc và hoàn thiện kỹ lưỡng."}
          </div>
          <Link
            href={`/sellers/${product.sellerId}`}
            className="flex items-center gap-6 pt-8 border-t border-border/30 group/seller hover:opacity-80 transition-opacity"
          >
            {artisanImage && (
              <div className="w-16 h-16 rounded-full overflow-hidden relative grayscale border border-border/40 group-hover/seller:grayscale-0 transition-all">
                <Image
                  src={artisanImage}
                  alt={product.seller?.name || "Người bán"}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <p className="font-headline text-xl italic text-foreground group-hover/seller:text-primary transition-colors">
                {product.seller?.name || "Người bán uy tín"}
              </p>
              <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">
                {product.seller?.shopName || "Người bán sáng lập"}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
