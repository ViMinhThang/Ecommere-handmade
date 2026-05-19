"use client";

import { useQuery } from "@tanstack/react-query";
import { customOrdersApi, CustomOrder } from "@/lib/api/custom-orders";
import Link from "next/link";
import { PenTool, ArrowRight, Clock, Box } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { mediaApi } from "@/lib/api/media";

export default function ProfileCustomOrdersPage() {
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["customOrders", "my"],
    queryFn: async () => {
      // apiClient.get returns the resolved JSON (e.g. the array directly)
      const res = await customOrdersApi.getMyOrders();
      return res;
    }
  });

  if (isLoading) {
    return <div className="text-center p-12 text-muted-foreground font-serif">Đang tải đơn hàng thiết kế riêng của bạn...</div>;
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg p-12 text-center border border-border/60 text-card-foreground shadow-sm">
        <PenTool className="w-12 h-12 text-muted-foreground/45 mx-auto mb-4" />
        <h3 className="font-serif text-2xl font-bold text-foreground mb-2">Không thể tải đơn thiết kế</h3>
        <p className="text-muted-foreground">Vui lòng kiểm tra kết nối API và thử lại sau.</p>
      </div>
    );
  }

  if (!orders || (Array.isArray(orders) && orders.length === 0)) {
    return (
      <div className="bg-card rounded-lg p-12 text-center border border-border/60 text-card-foreground shadow-sm">
         <PenTool className="w-12 h-12 text-muted-foreground/45 mx-auto mb-4" />
         <h3 className="font-serif text-2xl font-bold text-foreground mb-2">Chưa Có Đơn Hàng Nào</h3>
         <p className="text-muted-foreground">Bạn chưa có đơn thiết kế riêng đang hoạt động. Hãy đăng một yêu cầu commission để người bán gửi đề xuất.</p>
      </div>
    );
  }

  // Ensure orders is map-able
  const mappedOrders = Array.isArray(orders) ? orders : [];

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'DRAFT': return { label: 'Bản Nháp', className: 'bg-muted text-muted-foreground' };
      case 'PENDING_REVIEW': return { label: 'Chờ Phê Duyệt Phác Thảo', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-200' };
      case 'REVISION_REQUESTED': return { label: 'Đang Yêu Cầu Chỉnh Sửa', className: 'bg-orange-500/15 text-orange-700 dark:text-orange-200' };
      case 'AWAITING_PAYMENT': return { label: 'Chờ Thanh Toán', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-200' };
      case 'CRAFTING': return { label: 'Đang Chế Tác', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' };
      case 'FINISHING': return { label: 'Đang Hoàn Thiện', className: 'bg-teal-500/15 text-teal-700 dark:text-teal-200' };
      case 'SHIPPED': return { label: 'Đang Giao', className: 'bg-primary/15 text-primary' };
      case 'DELIVERED': return { label: 'Đã Giao', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200' };
      case 'CANCELLED': return { label: 'Đã Hủy', className: 'bg-muted text-muted-foreground' };
      default: return { label: status, className: 'bg-muted text-muted-foreground' };
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold text-foreground border-b border-border/60 pb-4">Đồ Thiết Kế Riêng Của Bạn</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Theo dõi tiến độ các sản phẩm được chế tác độc quyền cho bạn bởi người bán thủ công.
      </p>

      <div className="space-y-4">
        {mappedOrders.map((order: CustomOrder) => {
          const statusDef = getStatusDisplay(order.status);
          return (
            <div key={order.id} className="bg-card p-6 rounded-lg border border-border/60 text-card-foreground shadow-sm flex flex-col md:flex-row gap-6 items-center">
              <div className="w-24 h-24 bg-muted flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center">
                {order.sketchImageUrl ? (
                   <img src={mediaApi.getImageUrl(order.sketchImageUrl)} className="w-full h-full object-cover" alt="Sketch" />
                ) : (
                   <Box className="w-8 h-8 text-muted-foreground/45" />
                )}
              </div>
              <div className="flex-1">
                 <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif text-xl font-bold text-foreground">{order.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusDef.className}`}>
                      {statusDef.label}
                    </span>
                 </div>
                 <div className="text-sm text-muted-foreground mb-4 flex items-center gap-4">
                    <span className="flex items-center gap-1"><PenTool className="w-4 h-4"/> Người bán: {order.seller?.shopName || order.seller?.name || 'Vô danh'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> Bền bỉ {order.leadTime || 'Chưa xác định'}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-primary">{formatCurrency(Number(order.price))}</span>
                    <Link 
                      href={`/custom-orders/${order.id}/review`}
                      className="text-sm uppercase tracking-widest font-bold text-foreground/80 hover:text-primary flex items-center gap-1"
                    >
                      Xem Tiến Độ <ArrowRight className="w-4 h-4" />
                    </Link>
                 </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
