"use client"

import { useMe, useMySubOrders } from "@/lib/api/hooks"
import { formatCurrency } from "@/lib/utils"
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronRight, 
  Search,
  Star,
  ShoppingBag,
  Heart,
  PenTool
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Product, ProductImage } from "@/types"

function getProductImageUrl(product: Product): string {
  const mainImage = product.images?.find((img: ProductImage) => img.isMain);
  const firstImage = product.images?.[0];
  const imageUrl = mainImage?.url || firstImage?.url || "";

  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");
  return `${apiBase}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

export default function OrdersPage() {
  const { data: user } = useMe()
  const { data: subOrders, isLoading, error } = useMySubOrders()

  const getDisplayedOrderAmount = (subOrder: {
    subTotal: number
    discountAmount?: number
    type?: string
  }) => {
    if (subOrder.type === "CUSTOM") {
      return subOrder.subTotal
    }

    return subOrder.subTotal - (subOrder.discountAmount || 0)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-700"
      case "SHIPPED":
      case "FINISHING":
        return "bg-blue-100 text-blue-700"
      case "PROCESSING":
      case "CRAFTING":
        return "bg-stone-200 text-brand"
      case "PENDING":
      case "PAID":
      case "PENDING_REVIEW":
      case "AWAITING_PAYMENT":
        return "bg-amber-100 text-amber-700"
      case "REVISION_REQUESTED":
        return "bg-purple-100 text-purple-700"
      case "CANCELLED":
        return "bg-red-100 text-red-700"
      default:
        return "bg-stone-100 text-stone-600"
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
      case "PENDING_REVIEW":
        return "Đang chờ duyệt"
      case "REVISION_REQUESTED":
        return "Yêu cầu chỉnh sửa"
      case "AWAITING_PAYMENT":
        return "Chờ thanh toán"
      case "CRAFTING":
        return "Đang chế tác"
      case "FINISHING":
        return "Đang hoàn thiện"
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <CheckCircle2 className="w-4 h-4" />
      case "SHIPPED":
        return <Truck className="w-4 h-4" />
      case "PROCESSING":
        return <Package className="w-4 h-4" />
      case "PAID":
      case "PENDING":
        return <Clock className="w-4 h-4" />
      case "CANCELLED":
        return <XCircle className="w-4 h-4" />
      default:
        return <Package className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="font-serif italic text-muted-foreground tracking-wide">Đang tìm kiếm các sản phẩm của quý khách...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold text-primary mb-2">Thông tin Đơn hàng & Các sản phẩm đã mua</h1>
        <p className="text-muted-foreground italic">Danh sách các sản phẩm quý khách đã mua tại cửa hàng.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-8">
          {!subOrders || subOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-[0_15px_30px_-15px_rgba(84,67,60,0.08)] border border-dashed border-border flex flex-col items-center text-center">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/20 mb-6" />
              <h3 className="font-serif text-2xl text-primary mb-2">Chưa có sản phẩm nào</h3>
              <p className="text-muted-foreground mb-8">Dường như quý khách chưa thực hiện đơn hàng nào.</p>
              <Link href="/discovery" className="btn-artisanal py-3 px-8 text-xs uppercase tracking-widest font-bold">
                Khám phá ngay
              </Link>
            </div>
          ) : (
            subOrders.map((subOrder: any) => (
              <div key={subOrder.id} className="bg-white rounded-xl p-8 shadow-[0_15px_30px_-15px_rgba(84,67,60,0.08)] border border-border/30 transition-all hover:shadow-[0_20px_40px_-20px_rgba(84,67,60,0.12)] group">
                {/* Order Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                        {subOrder.type === "CUSTOM" ? "Đơn tùy chỉnh" : "Kiện hàng"} #{subOrder.id.slice(0, 8)}
                      </h3>
                      {subOrder.type === "CUSTOM" && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider rounded border border-primary/20">
                          Custom
                        </span>
                      )}
                      {subOrder.type !== "CUSTOM" && subOrder.order?.paymentMethod && (
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-700 text-[9px] font-bold uppercase tracking-wider rounded border border-stone-200">
                          {subOrder.order.paymentMethod}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{new Date(subOrder.createdAt).toLocaleDateString('vi-VN', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-3">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${getStatusColor(subOrder.status)}`}>
                      {getStatusIcon(subOrder.status)}
                      {getStatusLabel(subOrder.status)}
                    </span>
                    <p className="font-serif italic text-2xl text-primary">
                      {formatCurrency(getDisplayedOrderAmount(subOrder))}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-linear-to-r from-transparent via-border/50 to-transparent mb-8"></div>

                {/* Items List */}
                <div className="space-y-6 mb-8">
                  {subOrder.items.map((item: any) => (
                    <div key={item.id} className="flex items-center space-x-5">
                      <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden relative border border-border/20 shadow-sm shrink-0">
                        {item.product.images?.[0]?.url ? (
                          <Image 
                            src={getProductImageUrl(item.product)} 
                            alt={item.product.name} 
                            fill 
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-accent/30">
                            <PenTool className="w-8 h-8 text-primary/30" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-foreground text-lg">{item.product.name}</h4>
                        <div className="flex items-center divide-x divide-border/30 mt-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest pr-3">Người bán: {subOrder.seller.shopName || subOrder.seller.name}</p>
                          {item.quantity > 0 && (
                            <p className="text-[10px] text-brand uppercase font-bold tracking-widest pl-3">Số lượng: {item.quantity}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-border/20">
                  {subOrder.status === "SHIPPED" && subOrder.type !== "CUSTOM" && (
                    <button className="btn-artisanal py-2.5 px-6 text-xs uppercase tracking-widest font-bold">
                      Theo dõi đơn hàng
                    </button>
                  )}
                  {subOrder.type === "CUSTOM" ? (
                    <Link 
                      href={`/custom-orders/${subOrder.id}/review`}
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md hover:opacity-90 transition-all active:scale-95 shadow-sm"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Xem tiến độ & Chi tiết
                    </Link>
                  ) : (
                    <>
                      {subOrder.status === "DELIVERED" && (
                        <Link 
                          href={`/profile/orders/${subOrder.id}`}
                          className="flex items-center gap-2 bg-accent text-primary px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md hover:bg-accent/80 transition-all active:scale-95 shadow-sm"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Đánh giá sản phẩm
                        </Link>
                      )}
                      <Link 
                        href={`/profile/orders/${subOrder.id}`}
                        className="flex items-center gap-1.5 bg-white text-muted-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md border border-border/50 hover:bg-muted/30 transition-all active:scale-95 shadow-sm"
                      >
                        Xem Chi tiết
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Stats Widget */}
          <div className="bg-white p-8 rounded-xl shadow-[0_15px_30px_-15_rgba(84,67,60,0.08)] border-l-4 border-primary border">
            <h3 className="font-serif italic text-2xl text-primary mb-8 tracking-tight">Thống kê mua hàng</h3>
            
            {/* Metric 1 */}
            <div className="mb-8">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Số lượng sản phẩm</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-5xl font-serif text-primary leading-none font-bold">
                  {subOrders?.reduce((acc, curr) => acc + curr.items.length, 0) || 0}
                </span>
                <span className="text-sm text-muted-foreground font-serif italic">Sản phẩm</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="mb-10">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Chất liệu Yêu thích</p>
              <div className="flex flex-wrap gap-2.5">
                {["Gốm sứ", "Vải lanh", "Đồng thau", "Thủy tinh"].map((medium) => (
                  <span key={medium} className="bg-secondary/20 text-secondary-foreground px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase">
                    {medium}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic mt-6 pt-6 border-t border-border/40 leading-relaxed">
              "Bộ sưu tập của quý khách phản ánh một sự trân trọng sâu sắc đối với những hình dáng hữu cơ."
            </p>
          </div>

          {/* Support Widget */}
          <div className="bg-primary/5 p-8 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Heart className="w-16 h-16 text-primary fill-primary" />
            </div>
            <h3 className="font-serif font-bold text-xl text-primary mb-3 relative">Ủng hộ Người bán</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed relative">
              Mỗi đánh giá đều giúp cộng đồng những nhà sáng tạo độc lập của chúng tôi phát triển mạnh mẽ hơn.
            </p>
            <Link href="#" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center group/link relative">
              Chia sẻ Câu chuyện của Quý khách
              <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
