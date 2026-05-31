import { MessageSquare, Star } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { mediaApi } from "@/lib/api/media";
import type { CustomOrderReview } from "@/lib/api/custom-orders";

interface CustomOrderReviewDisplayProps {
  review: CustomOrderReview;
}

export function CustomOrderReviewDisplay({
  review,
}: CustomOrderReviewDisplayProps) {
  return (
    <article className="rounded-2xl border border-border/30 bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border/30 bg-muted font-serif text-xl italic text-primary">
            {review.user.avatar ? (
              <img
                src={mediaApi.getImageUrl(review.user.avatar)}
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
                      ? "fill-primary text-primary"
                      : "text-muted"
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
        {review.comment && (
          <p className="font-body text-base italic leading-relaxed text-foreground/90">
            &quot;{review.comment}&quot;
          </p>
        )}

        {review.images && review.images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {review.images.map((img: string, idx: number) => (
              <div
                key={idx}
                className="group/img relative h-24 w-24 overflow-hidden rounded-xl border border-border/30 shadow-sm"
              >
                <img
                  src={mediaApi.getImageUrl(img)}
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
  );
}
