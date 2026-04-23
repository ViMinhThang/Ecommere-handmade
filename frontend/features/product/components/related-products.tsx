import Image from "next/image";
import Link from "next/link";
import { useProducts } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";
import { formatCurrency } from "@/lib/utils";

interface RelatedProductsProps {
  categoryId: string;
  categorySlug?: string;
  currentProductId: string;
}

export function RelatedProducts({ 
  categoryId, 
  categorySlug, 
  currentProductId 
}: RelatedProductsProps) {
  const { data, isLoading } = useProducts({ categoryId, limit: 4 });

  if (isLoading || !data) {
    return (
      <section className="max-w-[1600px] mx-auto px-6 md:px-12 py-32">
        <div className="animate-pulse flex gap-8">
           <div className="h-64 w-full bg-border/20 rounded-xl" />
           <div className="h-64 w-full bg-border/20 rounded-xl hidden md:block" />
           <div className="h-64 w-full bg-border/20 rounded-xl hidden md:block" />
        </div>
      </section>
    );
  }

  // Filter out current product
  let relatedProducts = data.data.filter(p => p.id !== currentProductId);
  
  // Take up to 3
  relatedProducts = relatedProducts.slice(0, 3);

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="max-w-[1600px] mx-auto px-6 md:px-12 py-32">
      <div className="flex justify-between items-end mb-16">
        <div>
          <h3 className="text-3xl md:text-4xl font-headline italic text-foreground">Sản phẩm liên quan</h3>
          <p className="text-muted-foreground mt-2 font-body">Gợi ý những sản phẩm phù hợp dành riêng cho quý khách.</p>
        </div>
        <Link href={`/categories/${categorySlug || categoryId}`} className="text-primary font-bold border-b-2 border-primary/20 hover:border-primary transition-all pb-1 hidden sm:block">
          Xem tất cả
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {relatedProducts.map((item, index) => {
          const mainImg = item.images?.find(i => i.isMain) || item.images?.[0];
          const imgUrl = mainImg?.url ? mediaApi.getImageUrl(mainImg.url) : null;
          
          return (
            <Link key={item.id} href={`/products/${item.id}`} className={`group cursor-pointer ${index === 1 ? 'md:mt-24' : ''}`}>
              <div className="bg-card border border-border/20 shadow-sm rounded-xl overflow-hidden mb-6 aspect-4/5 relative">
                {imgUrl ? (
                  <Image 
                    src={imgUrl}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-accent flex items-center justify-center text-muted-foreground italic text-sm">
                    Không có hình ảnh
                  </div>
                )}
              </div>
              <p className="font-headline italic text-xl group-hover:text-primary transition-colors">{item.name}</p>
              <p className="text-primary font-bold mt-2 font-body">
                {formatCurrency(Number(item.price))}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
