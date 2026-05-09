import { MessageSquare, Star } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export interface ProductReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user: {
    name: string;
    avatar?: string | null;
  };
  images?: string[];
  sellerReply?: string | null;
}

interface ProductReviewsProps {
  reviews: ProductReview[];
  averageRating: number;
  isReviewsLoading: boolean;
}

export function ProductReviews({
  reviews,
  averageRating,
  isReviewsLoading,
}: ProductReviewsProps) {
  return (
    <section className="border-b border-border/10 py-24">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-10 px-6 md:px-12 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.7fr)] lg:gap-16">
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Phản hồi khách hàng
            </span>
            <h2 className="font-headline text-4xl italic text-foreground">
              Đánh giá sản phẩm
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Những cảm nhận thật từ khách mua giúp bạn hiểu rõ hơn về chất
              liệu, độ hoàn thiện và trải nghiệm sử dụng sản phẩm.
            </p>
          </div>

          {isReviewsLoading ? (
            <div className="animate-pulse rounded-2xl border border-border/20 bg-card p-6">
              <div className="h-12 w-28 rounded bg-muted" />
              <div className="mt-4 h-4 w-36 rounded bg-muted" />
              <div className="mt-6 h-4 w-full rounded bg-muted" />
            </div>
          ) : reviews.length > 0 ? (
            <div className="rounded-2xl border border-border/30 bg-card p-6 shadow-[0_10px_30px_rgba(84,67,60,0.05)]">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-6xl font-bold text-primary">
                  {averageRating.toFixed(1)}
                </span>
                <span className="font-headline italic text-muted-foreground">
                  trên 5
                </span>
              </div>
              <div className="mt-4 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(averageRating)
                        ? "fill-brand text-brand"
                        : "text-stone-200"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-6 text-sm text-muted-foreground italic">
                Dựa trên {reviews.length} cảm nhận từ những người đồng hành.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/40 bg-muted/10 p-6 text-center">
              <p className="text-sm italic text-muted-foreground">
                Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên
                chia sẻ cảm nhận!
              </p>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {isReviewsLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-border/20 bg-card p-6"
              >
                <div className="mb-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                </div>
                <div className="space-y-3 sm:pl-16">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-3/4 rounded bg-muted" />
                </div>
              </div>
            ))
          ) : reviews.length > 0 ? (
            <div className="space-y-5">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="group rounded-2xl border border-border/30 bg-card p-6 shadow-sm transition-colors duration-300 hover:border-primary/20"
                >
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border/30 bg-muted font-serif text-xl italic text-primary">
                        {review.user.avatar ? (
                          <img
                            src={review.user.avatar}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          review.user.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-foreground">
                          {review.user.name}
                        </p>
                        <div className="mt-1 flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < review.rating
                                  ? "fill-brand text-brand"
                                  : "text-stone-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {format(new Date(review.createdAt), "dd MMMM, yyyy", {
                        locale: vi,
                      })}
                    </span>
                  </div>

                  <div className="space-y-6 sm:pl-16">
                    <p className="font-body text-base italic leading-relaxed text-foreground/90">
                      &quot;{review.comment || "Khách hàng chưa để lại nhận xét chi tiết."}&quot;
                    </p>

                    {review.images && review.images.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {review.images.map((img: string, idx: number) => (
                          <div
                            key={idx}
                            className="group/img relative h-24 w-24 overflow-hidden rounded-xl border border-border/30 shadow-sm"
                          >
                            <img
                              src={img}
                              alt=""
                              className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {review.sellerReply && (
                      <div className="rounded-xl border border-primary/10 bg-primary/5 p-5">
                        <div className="mb-3 flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                            Người bán phản hồi
                          </span>
                        </div>
                        <p className="text-sm italic leading-relaxed text-foreground/80">
                          {review.sellerReply}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-muted/10 px-6 py-12 text-center">
              <Star className="mb-3 h-10 w-10 text-muted-foreground/35" />
              <p className="font-semibold text-foreground">
                Chưa có đánh giá nào.
              </p>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                Khi khách hàng để lại cảm nhận, các đánh giá sẽ hiển thị tại
                đây.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
