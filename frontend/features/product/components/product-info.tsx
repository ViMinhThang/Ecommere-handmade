import { Star } from "lucide-react";
import { Product } from "@/lib/api/products";
import { formatCurrency } from "@/lib/utils";

interface ProductInfoProps {
  product: Product;
  averageRating: number;
  reviewsCount: number;
}

export function ProductInfo({ product, averageRating, reviewsCount }: ProductInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-secondary-foreground font-semibold tracking-widest text-xs uppercase font-label">
            {product.category?.name || "Danh mục sản phẩm"}
          </span>
          {reviewsCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3.5 h-3.5 ${i < Math.round(averageRating) ? "fill-brand text-brand" : "text-stone-200"}`} 
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-muted-foreground">({reviewsCount})</span>
            </div>
          )}
        </div>
        <h1 className="text-5xl font-headline italic font-bold text-foreground mt-2 leading-tight">
          {product.name}
        </h1>
        <p className="text-primary text-3xl font-headline italic mt-4">
          {formatCurrency(Number(product.price))}
        </p>
      </div>
      
      <p className="text-muted-foreground leading-relaxed text-lg font-body line-clamp-3">
        {(product.description || "").replace(/<[^>]*>/g, '').slice(0, 160)}...
      </p>
    </div>
  );
}
