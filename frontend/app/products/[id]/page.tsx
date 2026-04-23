"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  Leaf, 
  History, 
  ChevronDown, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Check, 
  MessageCircle, 
  Star, 
  Image as ImageIcon,
  MessageSquare
} from "lucide-react";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { useProduct, useProducts, useProductReviews } from "@/lib/api/hooks";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { Product } from "@/lib/api/products";
import { formatCurrency } from "@/lib/utils";
import { mediaApi } from "@/lib/api/media";
import { useCartContext } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export default function ProductDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: product, isLoading, error } = useProduct(id!);
  const { data: reviews, isLoading: isReviewsLoading } = useProductReviews(id!);

  // If loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col text-foreground font-body">
        <CustomerNavBar />
        <main className="pt-24 min-h-screen grid place-items-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
            <p className="text-muted-foreground font-headline italic">Đang tải dữ liệu sản phẩm...</p>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  // If error or not found
  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col text-foreground font-body">
        <CustomerNavBar />
        <main className="pt-24 min-h-screen grid place-items-center">
          <div className="text-center">
            <h1 className="text-4xl font-headline italic text-primary mb-4">Không tìm thấy sản phẩm</h1>
            <p className="text-muted-foreground mb-8">Sản phẩm này hiện không còn trong cửa hàng của chúng tôi.</p>
            <Link href="/" className="px-8 py-3 bg-primary text-primary-foreground rounded-md tracking-wide">
              Quay lại Trang chủ
            </Link>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  // Resolve artisan image dynamically if it exists in seller object
  const artisanImage = product.seller?.avatar 
    ? mediaApi.getImageUrl(product.seller.avatar) 
    : null;

  return (
    <ProductDetailContent 
      product={product} 
      artisanImage={artisanImage} 
      reviews={reviews || []} 
      isReviewsLoading={isReviewsLoading}
    />
  );
}

function ProductDetailContent({ 
  product, 
  artisanImage, 
  reviews, 
  isReviewsLoading 
}: { 
  product: Product; 
  artisanImage: string | null;
  reviews: any[];
  isReviewsLoading: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const { addItem } = useCartContext();
  const { openChat } = useChat();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const averageRating = useMemo(() => {
    if (!reviews?.length) return 0;
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / reviews.length;
  }, [reviews]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/products/${product.id}`;
      return;
    }
    setIsAdding(true);
    try {
      await addItem(product.id, quantity);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2500);
    } catch {
      // Error handled by mutation
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />
      
      <main className="pt-32 pb-24 min-h-screen">
        {/* Hero Gallery & Info Section */}
        <section className="max-w-[1600px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left: Gallery Bento */}
          <div className="lg:col-span-7">
            <ProductGallery images={product.images || []} productName={product.name} />
          </div>

          {/* Right: Purchase Content */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-10">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-foreground font-semibold tracking-widest text-xs uppercase font-label">
                  {product.category?.name || "Danh mục sản phẩm"}
                </span>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(averageRating) ? "fill-brand text-brand" : "text-stone-200"}`} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">({reviews.length})</span>
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

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border/20 shadow-[0_4px_20px_rgba(84,67,60,0.04)]">
                <Leaf className="text-primary w-6 h-6 stroke-[1.5]" />
                <div>
                  <p className="text-sm font-bold text-foreground font-body">Nguồn gốc bền vững</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Nguyên liệu đạo đức, chế tác tỉ mỉ.</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-5 rounded-xl bg-card border border-border/20 shadow-[0_4px_20px_rgba(84,67,60,0.04)]">
                <History className="text-primary w-6 h-6 stroke-[1.5]" />
                <div>
                  <p className="text-sm font-bold text-foreground font-body">Độc bản duy nhất</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sản phẩm chất lượng cao, độc đáo và tinh tế.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Quantity Selector */}
              {product.stock > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">Số lượng:</span>
                  <div className="flex items-center bg-accent rounded-full px-4 py-2 gap-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="text-foreground disabled:opacity-30 transition-opacity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-sans font-semibold w-6 text-center tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                      className="text-foreground disabled:opacity-30 transition-opacity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={handleAddToCart}
                disabled={product.stock <= 0 || isAdding}
                className={`w-full py-5 rounded-md font-bold tracking-wide shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center gap-3 ${
                  addedSuccess
                  ? "bg-secondary text-secondary-foreground"
                  : product.stock > 0 
                  ? "bg-linear-to-br from-primary to-[#a44e39] text-primary-foreground hover:shadow-primary/20 active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {addedSuccess ? (
                  <><Check className="w-5 h-5" /> Đã thêm vào giỏ hàng</>
                ) : isAdding ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : product.stock > 0 ? (
                  <><ShoppingBag className="w-5 h-5" /> Thêm vào giỏ hàng</>
                ) : (
                  "Hết hàng"
                )}
              </button>
              
              <button
                type="button"
                onClick={() => openChat(product.sellerId, product.id)}
                className="w-full py-5 rounded-md border border-primary/40 text-primary font-bold tracking-widest uppercase text-[10px] transition-all hover:bg-primary/5 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Yêu cầu tùy chỉnh
              </button>

              <button
                type="button"
                onClick={() => openChat(product.sellerId, product.id)}
                className="w-full py-3 rounded-md text-muted-foreground hover:text-primary text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Hỏi về sản phẩm
              </button>
            </div>

            {/* Tabs/Details */}
            <div className="border-t border-border/30 pt-8 space-y-6">
              <details className="group">
                <summary className="list-none flex justify-between items-center cursor-pointer select-none">
                  <span className="font-bold text-foreground tracking-tight hover:text-primary transition-colors">Kích thước & Bảo quản</span>
                  <ChevronDown className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform duration-300" />
                </summary>
                <div className="pt-4 text-muted-foreground text-sm leading-relaxed space-y-2 font-body animate-in slide-in-from-top-2 fade-in duration-300">
                  <p>Mã sản phẩm: {product.sku || "N/A"}</p>
                  <p>Khuyên dùng giặt hoặc rửa tay để bảo toàn độ hoàn thiện và tính nguyên bản theo thời gian.</p>
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* Process Story Section */}
        <section className="mt-40 bg-sidebar py-32 overflow-hidden border-y border-border/10">
          <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-20 items-center">
            <div className="md:w-1/2 space-y-12">
              <div className="relative">
                <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#d4e8d1]/30 rounded-full blur-[100px]"></div>
                <div className="relative z-10 space-y-8">
                  {product.descriptionImages && product.descriptionImages.length > 0 ? (
                    <div className="columns-1 sm:columns-2 gap-6 space-y-6">
                      {product.descriptionImages.map((imgUrl, idx) => (
                        <div key={idx} className="break-inside-avoid rounded-2xl overflow-hidden shadow-xl border border-border/10 bg-background group">
                          <img 
                            src={mediaApi.getImageUrl(imgUrl)} 
                            alt={`Description detail ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl overflow-hidden shadow-2xl relative w-full h-[500px] bg-background border border-border/20 flex flex-col items-center justify-center p-12 text-center">
                        <h3 className="text-3xl font-headline italic text-primary mb-4">Hoàn thiện tỉ mỉ</h3>
                        <p className="text-muted-foreground font-body">Mỗi chi tiết đều được chăm chút để tạo nên một sản phẩm hoàn hảo.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="md:w-1/2 space-y-10">
              <div className="space-y-4">
                <span className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Câu chuyện sản phẩm</span>
                <h2 className="text-4xl md:text-6xl font-headline italic text-foreground leading-tight">Chất lượng hàng đầu</h2>
              </div>
              
              <div 
                className="text-muted-foreground leading-relaxed text-xl font-body prose prose-stone dark:prose-invert prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary/80 prose-headings:font-headline prose-headings:italic max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
              <Link href={`/sellers/${product.sellerId}`} className="flex items-center gap-6 pt-8 border-t border-border/30 group/seller hover:opacity-80 transition-opacity">
                {artisanImage && (
                  <div className="w-16 h-16 rounded-full overflow-hidden relative grayscale border border-border/40 group-hover/seller:grayscale-0 transition-all">
                    <Image
                      src={artisanImage}
                      alt={product.seller?.name || "Artisan"}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <p className="font-headline text-xl italic text-foreground group-hover/seller:text-primary transition-colors">{product.seller?.name || "Người bán uy tín"}</p>
                  <p className="text-xs text-primary font-bold uppercase tracking-widest mt-1">
                    {product.seller?.shopName || "Người bán sáng lập"}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="max-w-[1600px] mx-auto px-6 md:px-12 py-32 border-b border-border/10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-20">
            {/* Review Summary */}
            <div className="md:w-1/3 space-y-6">
              <div className="space-y-2">
                <span className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Phản hồi khách hàng</span>
                <h2 className="text-4xl font-headline italic text-foreground">Đánh giá sản phẩm</h2>
              </div>
              
              {reviews.length > 0 ? (
                <div className="p-8 bg-card border border-border/20 rounded-2xl shadow-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-serif font-bold text-primary">{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground font-headline italic">trên 5</span>
                  </div>
                  <div className="flex gap-1 mt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < Math.round(averageRating) ? "fill-brand text-brand" : "text-stone-200"}`} />
                    ))}
                  </div>
                  <p className="mt-6 text-sm text-muted-foreground italic">Dựa trên {reviews.length} cảm nhận từ những người đồng hành.</p>
                </div>
              ) : (
                <div className="p-8 bg-muted/20 border border-dashed border-border/40 rounded-2xl text-center">
                  <p className="text-muted-foreground italic">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên chia sẻ cảm nhận!</p>
                </div>
              )}
            </div>

            {/* Review List */}
            <div className="md:w-2/3 w-full space-y-12">
              {isReviewsLoading ? (
                Array(2).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-4">
                    <div className="h-4 w-32 bg-muted rounded"></div>
                    <div className="h-20 w-full bg-muted rounded"></div>
                  </div>
                ))
              ) : reviews.length > 0 ? (
                <div className="space-y-16">
                  {reviews.map((review) => (
                    <div key={review.id} className="group animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-primary font-serif italic text-xl border border-border/40 overflow-hidden">
                            {review.user.avatar ? (
                              <img src={review.user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              review.user.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm tracking-tight">{review.user.name}</p>
                            <div className="flex gap-0.5 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-brand text-brand" : "text-stone-200"}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {format(new Date(review.createdAt), "dd MMMM, yyyy", { locale: vi })}
                        </span>
                      </div>
                      
                      <div className="pl-16 space-y-6">
                        <p className="text-stone-700 leading-relaxed font-body italic text-lg">
                          "{review.comment}"
                        </p>
                        
                        {review.images && review.images.length > 0 && (
                          <div className="flex flex-wrap gap-3 pt-2">
                            {review.images.map((img: string, idx: number) => (
                              <div key={idx} className="w-24 h-24 rounded-lg overflow-hidden border border-border/40 shadow-sm relative group/img">
                                <img src={img} alt="" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                              </div>
                            ))}
                          </div>
                        )}

                        {review.sellerReply && (
                          <div className="bg-primary/5 rounded-2xl p-6 border-l-4 border-primary/20 relative mt-4">
                            <div className="absolute -top-3 left-6 px-3 py-1 bg-white border border-primary/10 rounded-full flex items-center gap-2">
                              <MessageSquare className="w-3 h-3 text-primary" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Nghệ nhân phục đáp</span>
                            </div>
                            <p className="text-stone-600 italic text-sm leading-relaxed">
                              {review.sellerReply}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Related Works Section */}
        <RelatedWorks 
          categoryId={product.categoryId} 
          categorySlug={product.category?.slug}
          currentProductId={product.id} 
        />

      </main>

      <CustomerFooter />
    </div>
  );
}

function RelatedWorks({ 
  categoryId, 
  categorySlug, 
  currentProductId 
}: { 
  categoryId: string; 
  categorySlug?: string; 
  currentProductId: string; 
}) {
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
