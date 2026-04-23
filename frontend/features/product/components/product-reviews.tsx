import { Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    name: string;
    avatar: string | null;
  };
  images?: string[];
  sellerReply?: string;
}

interface ProductReviewsProps {
  reviews: Review[];
  averageRating: number;
  isReviewsLoading: boolean;
}

export function ProductReviews({ reviews, averageRating, isReviewsLoading }: ProductReviewsProps) {
  return (
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
                      &quot;{review.comment}&quot;
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
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Người bán phản hồi</span>
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
  );
}
