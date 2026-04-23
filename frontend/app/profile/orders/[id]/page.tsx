"use client"

import { useParams, useRouter } from "next/navigation"
import { useSubOrder, useCreateReview } from "@/lib/api/hooks"
import { formatCurrency } from "@/lib/utils"
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronLeft,
  ShoppingBag,
  ExternalLink,
  MapPin,
  Calendar,
  CreditCard,
  Star,
  Camera,
  Loader2,
  AlertCircle
} from "lucide-react"
import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Product, ProductImage } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

function getProductImageUrl(product: Product): string {
  const mainImage = product.images?.find((img: ProductImage) => img.isMain);
  const firstImage = product.images?.[0];
  const imageUrl = mainImage?.url || firstImage?.url || "";

  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");
  return `${apiBase}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const subOrderId = params.id as string
  
  const { data: subOrder, isLoading, error } = useSubOrder(subOrderId)
  const createReviewMutation = useCreateReview()

  // Review Modal State
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [images, setImages] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenReview = (item: any) => {
    setSelectedItem(item)
    setRating(5)
    setComment("")
    setImages([])
    setIsReviewModalOpen(true)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mock image upload logic for UI demonstration
    // In a real app, this would upload to the backend/S3
    const files = e.target.files
    if (files) {
      const newImages = Array.from(files).map(file => URL.createObjectURL(file))
      setImages(prev => [...prev, ...newImages])
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedItem) return

    try {
      await createReviewMutation.mutateAsync({
        productId: selectedItem.productId,
        orderItemId: selectedItem.id,
        rating,
        comment,
        images, // These would be real URLs in production
      })
      toast.success("Cảm ơn quý khách đã gửi đánh giá sản phẩm!")
      setIsReviewModalOpen(false)
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể gửi đánh giá vào lúc này")
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-700 border-green-200"
      case "SHIPPED":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "PROCESSING":
        return "bg-stone-200 text-brand border-stone-300"
      case "PAID":
      case "PENDING":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "CANCELLED":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-stone-100 text-stone-600 border-stone-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "Đã giao hàng"
      case "SHIPPED":
        return "Đang vận chuyển"
      case "PROCESSING":
        return "Đang chuẩn bị"
      case "PAID":
        return "Đã thanh toán"
      case "PENDING":
        return "Chờ xác nhận"
      case "CANCELLED":
        return "Đã hủy"
      default:
        return status
    }
  }

  const timelineSteps = [
    { key: "PAID", label: "Đã thanh toán", icon: CreditCard },
    { key: "PROCESSING", label: "Đang chuẩn bị", icon: Package },
    { key: "SHIPPED", label: "Đang vận chuyển", icon: Truck },
    { key: "DELIVERED", label: "Đã giao hàng", icon: CheckCircle2 },
  ]

  const getCurrentStepIndex = (status: string) => {
    if (status === "CANCELLED") return -1
    if (status === "PENDING") return 0
    return timelineSteps.findIndex(step => step.key === status)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="font-serif italic text-muted-foreground tracking-wide">Đang tải thông tin sản phẩm...</p>
      </div>
    )
  }

  if (error || !subOrder) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-border/40">
        <AlertCircle className="w-16 h-16 text-red-200 mx-auto mb-6" />
        <h2 className="font-serif text-3xl text-primary mb-2">Không tìm thấy thông tin</h2>
        <p className="text-muted-foreground mb-8">Hồ sơ này có thể đã bị thất lạc hoặc không thuộc quyền sở hữu của quý khách.</p>
        <button onClick={() => router.back()} className="btn-artisanal py-3 px-8 text-xs uppercase tracking-widest font-bold">
          Quay lại danh sách
        </button>
      </div>
    )
  }

  const currentStepIndex = getCurrentStepIndex(subOrder.status)
  const shippingAddress = typeof subOrder.order.shippingAddress === 'string' 
    ? JSON.parse(subOrder.order.shippingAddress) 
    : subOrder.order.shippingAddress

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Navigation */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8 group"
      >
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Trở về Bộ sưu tập</span>
      </button>

      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-10 border border-border/40 shadow-[0_20px_40px_-20px_rgba(84,67,60,0.1)] mb-10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl z-0"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border ${getStatusColor(subOrder.status)}`}>
                {getStatusLabel(subOrder.status)}
              </span>
              <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
                #{subOrder.id.slice(0, 8)}
              </span>
            </div>
            <h1 className="text-5xl font-serif font-bold text-primary mb-4">Thông tin Đơn hàng</h1>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm italic">{new Date(subOrder.createdAt).toLocaleDateString('vi-VN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-sm italic">{subOrder.items.length} sản phẩm</span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Tổng cộng giá trị đơn hàng</p>
            <p className="text-5xl font-serif font-bold text-primary tracking-tighter">
              {formatCurrency(subOrder.subTotal)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {/* Order Status Timeline */}
          {subOrder.status !== "CANCELLED" && (
            <div className="bg-white rounded-2xl p-10 border border-border/40 shadow-sm relative">
              <h3 className="font-serif italic text-2xl text-primary mb-10">Hành trình đơn hàng</h3>
              
              <div className="relative flex justify-between">
                <div className="absolute top-6 left-6 right-6 h-0.5 bg-muted z-0">
                  <div 
                    className="h-full bg-primary transition-all duration-1000 ease-out"
                    style={{ width: `${Math.max(0, (currentStepIndex / (timelineSteps.length - 1)) * 100)}%` }}
                  ></div>
                </div>

                {timelineSteps.map((step, idx) => {
                  const Icon = step.icon
                  const isCompleted = idx <= currentStepIndex
                  const isCurrent = idx === currentStepIndex
                  
                  return (
                    <div key={idx} className="relative z-10 flex flex-col items-center group">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 mb-4 ${
                        isCompleted 
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110" 
                          : "bg-white border-muted text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-primary/10" : ""}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${
                        isCompleted ? "text-primary" : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Items Detail */}
          <div className="bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-border/20 bg-muted/10">
              <h3 className="font-serif italic text-2xl text-primary">Danh sách sản phẩm</h3>
            </div>
            
            <div className="divide-y divide-border/20">
              {subOrder.items.map((item: any) => (
                <div key={item.id} className="p-8 flex flex-col sm:flex-row gap-8 group">
                  <div className="w-32 h-32 rounded-xl bg-muted overflow-hidden relative border border-border/20 shadow-sm shrink-0">
                    <Image 
                      src={getProductImageUrl(item.product)} 
                      alt={item.product.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  
                  <div className="flex-1 py-1">
                    <div className="flex justify-between items-start mb-2">
                      <Link href={`/products/${item.product.id}`} className="group/link">
                        <h4 className="font-serif font-bold text-2xl text-foreground group-hover/link:text-primary transition-colors flex items-center gap-2">
                          {item.product.name}
                          <ExternalLink className="w-4 h-4 opacity-0 group-hover/link:opacity-50 transition-opacity" />
                        </h4>
                      </Link>
                      <p className="font-serif italic text-xl text-primary">
                        {formatCurrency(Number(item.price) * item.quantity)}
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2 italic leading-relaxed">
                        {item.product.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Số lượng</p>
                            <p className="text-sm font-bold text-primary">x {item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Đơn giá</p>
                            <p className="text-sm text-foreground/80">{formatCurrency(item.price)}</p>
                          </div>
                        </div>

                        {/* REVIEW BUTTON */}
                        {subOrder.status === "DELIVERED" && (
                          <div className="pt-2">
                            {item.Review ? (
                              <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-full border border-stone-100">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-primary/60">Quý khách đã đánh giá:</span>
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < item.Review.rating ? "fill-brand text-brand" : "text-stone-200"}`} />
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleOpenReview(item)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-brand/5 hover:bg-brand/10 text-brand border border-brand/20 rounded-full transition-all group/rev"
                              >
                                <Star className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                <span className="text-[10px] uppercase font-bold tracking-widest">Đánh giá báu vật</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-10 bg-muted/5 flex flex-col items-end space-y-3">
              <div className="flex justify-between w-64 text-sm">
                <span className="text-muted-foreground italic">Tạm tính:</span>
                <span className="font-medium">{formatCurrency(subOrder.subTotal)}</span>
              </div>
              <div className="flex justify-between w-64 text-sm">
                <span className="text-muted-foreground italic">Phí giao nhận:</span>
                <span className="text-green-600 font-medium">Miễn phí</span>
              </div>
              <div className="h-px w-64 bg-border/40 my-2"></div>
              <div className="flex justify-between w-64 items-baseline">
                <span className="font-serif italic text-xl text-primary">Thành tiền:</span>
                <span className="font-serif font-bold text-3xl text-primary tracking-tight">
                  {formatCurrency(subOrder.subTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-10">
          {/* Seller Profile */}
          <div className="bg-white rounded-2xl p-8 border border-border/40 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
              <Package className="w-16 h-16 text-primary fill-primary" />
            </div>
            
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-8">Thông tin Người bán</h3>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-muted border-2 border-primary/10 overflow-hidden relative">
                {subOrder.seller.avatar ? (
                  <Image src={subOrder.seller.avatar} alt={subOrder.seller.shopName || subOrder.seller.name} fill className="object-cover" />
                ) : (
                  <Package className="w-8 h-8 text-muted-foreground/30 absolute inset-0 m-auto" />
                )}
              </div>
              <div>
                <h4 className="font-serif font-bold text-xl text-primary leading-tight">
                  {subOrder.seller.shopName || subOrder.seller.name}
                </h4>
                <p className="text-xs text-muted-foreground italic mt-1">{subOrder.seller.sellerTitle || "Nghệ nhân Tự do"}</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-8">
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                "{subOrder.seller.sellerBio || "Những tâm huyết gửi gắm vào từng đường nét của tác phẩm thủ công."}"
              </p>
            </div>
            
            <Link 
              href={`/sellers/${subOrder.sellerId}`}
              className="w-full py-3 bg-secondary/10 hover:bg-secondary/20 text-secondary-foreground text-[10px] font-bold uppercase tracking-widest transition-colors rounded-lg flex items-center justify-center gap-2 group/btn"
            >
              Ghé thăm xưởng chế tác
              <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Delivery Info */}
          <div className="bg-white rounded-2xl p-8 border border-border/40 shadow-sm">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Địa chỉ Nhận vật phẩm
            </h3>
            
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground">
                {shippingAddress?.fullName || subOrder.order.customer.name}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {shippingAddress?.address}<br />
                {shippingAddress?.ward}, {shippingAddress?.district}<br />
                {shippingAddress?.city}
              </p>
              <p className="text-xs text-muted-foreground pt-2">
                Liên lạc: <span className="font-medium text-foreground">{shippingAddress?.phone}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RATING MODAL */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="p-8 bg-primary/5 border-b border-primary/10">
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl text-primary">Đánh giá sản phẩm</DialogTitle>
              <DialogDescription className="italic text-stone-500 mt-2 leading-relaxed">
                Chia sẻ ý kiến của quý khách về tâm huyết của Người bán và chất lượng của sản phẩm #{selectedItem?.id.slice(0, 5)}.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-8">
            {/* Rating Stars */}
            <div className="flex flex-col items-center">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Mức độ hài lòng</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star className={`w-10 h-10 ${star <= rating ? "fill-brand text-brand" : "text-stone-200"}`} />
                  </button>
                ))}
              </div>
              <p className="text-xs italic text-brand font-bold mt-4 uppercase tracking-widest">
                {rating === 5 ? "Tuyệt vời" : rating === 4 ? "Rất tốt" : rating === 3 ? "Bình thường" : rating === 2 ? "Kém" : "Rất tệ"}
              </p>
            </div>

            {/* Comment */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Ý kiến của quý khách</label>
              <Textarea 
                placeholder="Lời nhắn cho Người bán..." 
                className="min-h-[120px] resize-none bg-stone-50/50 border-stone-200" 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* Photos */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 block">Ảnh thực tế sản phẩm (Tùy chọn)</label>
              <div className="flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden relative border border-stone-200 shadow-sm">
                    <Image src={img} alt="" fill className="object-cover" />
                  </div>
                ))}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center gap-1 text-stone-400 hover:border-brand hover:text-brand hover:bg-brand/5 transition-all"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Thêm ảnh</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  accept="image/*"
                  onChange={handleImageUpload} 
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-stone-50 border-t border-stone-100">
            <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Hủy bỏ
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={createReviewMutation.isPending}
              className="btn-artisanal py-6 px-10 text-[10px] uppercase tracking-widest font-bold min-w-[180px]"
            >
              {createReviewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang ghi chép...
                </>
              ) : "Gửi Đánh giá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}
