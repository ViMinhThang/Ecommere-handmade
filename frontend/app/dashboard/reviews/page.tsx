"use client"

import { useState } from "react"
import { useSellerReply, useMe } from "@/lib/api/hooks"
import { reviewsApi, Review } from "@/lib/api/reviews"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Star, MessageSquare, Loader2, Package, CheckCircle2, MessageCircle } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import Image from "next/image"

export default function SellerReviewsPage() {
  const { data: user } = useMe()
  const queryClient = useQueryClient()
  
  const { data: reviews, isLoading, error } = useQuery({
    queryKey: ["reviews", "seller", "latest"],
    queryFn: () => reviewsApi.getSellerLatestReviews(),
  })

  const replyMutation = useSellerReply()
  const [replyText, setReplyText] = useState<Record<string, string>>({})

  const handleReplyChange = (reviewId: string, text: string) => {
    setReplyText(prev => ({ ...prev, [reviewId]: text }))
  }

  const submitReply = async (review: Review) => {
    const text = replyText[review.id]
    if (!text?.trim()) return

    try {
      await replyMutation.mutateAsync({
        reviewId: review.id,
        reply: text,
        productId: review.productId
      })
      toast.success("Đã gửi phản hồi đến tri kỷ!")
      queryClient.invalidateQueries({ queryKey: ["reviews", "seller", "latest"] })
      handleReplyChange(review.id, "")
    } catch (err) {
      toast.error("Không thể gửi phản hồi lúc này")
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
        <p className="artisan-subtitle italic">Đang thu thập phản hồi của tri kỷ...</p>
      </div>
    )
  }

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="artisan-title text-4xl">Đánh giá từ khách hàng</h1>
          <p className="artisan-subtitle mt-2 text-stone-500">Người bán luôn trân trọng từng lời góp ý để hoàn thiện sản phẩm.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {reviews?.length === 0 ? (
          <Card className="border-dashed border-2 py-20 text-center">
            <MessageSquare className="w-16 h-16 text-muted-foreground/10 mx-auto mb-4" />
            <h3 className="font-serif text-xl text-primary mb-1">Chưa có đánh giá nào</h3>
            <p className="text-sm text-muted-foreground">Khi khách hàng đánh giá sản phẩm của bạn, chúng sẽ xuất hiện ở đây.</p>
          </Card>
        ) : (
          reviews?.map((review) => (
            <Card key={review.id} className="border-border/50 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row">
                {/* Left side: Product & Customer info */}
                <div className="w-full md:w-64 bg-muted/20 p-6 border-b md:border-b-0 md:border-r border-border/20">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">Tác phẩm</label>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-white border border-border/30 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-primary/30" />
                        </div>
                        <span className="text-sm font-bold line-clamp-2 leading-tight">
                          {review.product.name}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">Khách hàng</label>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {review.user.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{review.user.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side: Review content & Reply field */}
                <div className="flex-1 p-8 space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? "fill-brand text-brand" : "text-stone-200"}`} />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {format(new Date(review.createdAt), "dd MMM yyyy", { locale: vi })}
                    </span>
                  </div>

                  <p className="text-stone-700 italic font-body text-lg leading-relaxed">
                    "{review.comment}"
                  </p>

                  {review.images && review.images.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {review.images.map((img, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden border border-border/20 relative group/img">
                          <img src={img} alt="" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Seller Reply Section */}
                  <div className="pt-6 border-t border-border/20">
                    {review.sellerReply ? (
                      <div className="bg-primary/5 rounded-2xl p-6 border-l-4 border-primary/20 relative group/reply">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Phản hồi của Người bán</span>
                        </div>
                        <p className="text-stone-600 italic text-sm leading-relaxed">
                          {review.sellerReply}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-primary/50" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Gửi phản hồi cho khách hàng</span>
                        </div>
                        <div className="relative">
                          <Textarea 
                            placeholder="Nhập nội dung phản hồi cho khách hàng..."
                            className="bg-transparent border-stone-200 min-h-[100px] pb-12 resize-none italic"
                            value={replyText[review.id] || ""}
                            onChange={(e) => handleReplyChange(review.id, e.target.value)}
                          />
                          <Button 
                            className="absolute bottom-3 right-3 btn-artisanal py-2 px-6 h-auto text-[10px] uppercase font-bold tracking-widest"
                            onClick={() => submitReply(review)}
                            disabled={replyMutation.isPending || !replyText[review.id]?.trim()}
                          >
                            {replyMutation.isPending ? "Đang gửi..." : "Gửi Phản hồi"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
