"use client";

import { useQuery } from "@tanstack/react-query";
import { customOrdersApi } from "@/lib/api/custom-orders";
import Link from "next/link";
import { PenTool, ArrowRight, Clock, Box } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ProfileCustomOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["customOrders", "my"],
    queryFn: async () => {
      // apiClient.get returns the resolved JSON (e.g. the array directly)
      const res = await customOrdersApi.getMyOrders();
      return res;
    }
  });

  if (isLoading) {
    return <div className="text-center p-12 text-slate-500 font-serif">Đang tải đơn hàng thiết kế riêng của bạn...</div>;
  }

  if (!orders || (Array.isArray(orders) && orders.length === 0)) {
    return (
      <div className="bg-white rounded-lg p-12 text-center border border-slate-200">
         <PenTool className="w-12 h-12 text-slate-300 mx-auto mb-4" />
         <h3 className="font-serif text-2xl font-bold text-slate-800 mb-2">Chưa Có Đơn Hàng Nào</h3>
         <p className="text-slate-500">Bạn chưa có đơn đặt hàng thiết kế riêng nào. Hãy liên hệ với nghệ nhân yêu thích của bạn qua tính năng Chat để lên ý tưởng.</p>
      </div>
    );
  }

  // Ensure orders is map-able
  const mappedOrders = Array.isArray(orders) ? orders : [];

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'DRAFT': return { label: 'Bản Nháp', className: 'bg-slate-100 text-slate-600' };
      case 'PENDING_REVIEW': return { label: 'Chờ Phê Duyệt Phác Thảo', className: 'bg-yellow-100 text-yellow-800' };
      case 'REVISION_REQUESTED': return { label: 'Đang Yêu Cầu Chỉnh Sửa', className: 'bg-orange-100 text-orange-800' };
      case 'AWAITING_PAYMENT': return { label: 'Chờ Thanh Toán', className: 'bg-blue-100 text-blue-800' };
      case 'CRAFTING': return { label: 'Đang Chế Tác', className: 'bg-green-100 text-green-800' };
      case 'FINISHING': return { label: 'Đang Hoàn Thiện', className: 'bg-teal-100 text-teal-800' };
      case 'SHIPPED': return { label: 'Đã Giao Hàng', className: 'bg-purple-100 text-purple-800' };
      default: return { label: status, className: 'bg-slate-100 text-slate-600' };
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-bold text-slate-900 border-b pb-4">Đồ Thiết Kế Riêng Của Bạn</h2>
      <p className="text-slate-600 text-sm mb-6">
        Theo dõi tiến độ các tác phẩm được chế tác độc quyền cho bạn bởi thợ thủ công.
      </p>

      <div className="space-y-4">
        {mappedOrders.map((order: any) => {
          const statusDef = getStatusDisplay(order.status);
          return (
            <div key={order.id} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center">
              <div className="w-24 h-24 bg-slate-100 flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center">
                {order.sketchImageUrl ? (
                   <img src={order.sketchImageUrl} className="w-full h-full object-cover" alt="Sketch" />
                ) : (
                   <Box className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                 <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif text-xl font-bold text-slate-800">{order.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusDef.className}`}>
                      {statusDef.label}
                    </span>
                 </div>
                 <div className="text-sm text-slate-500 mb-4 flex items-center gap-4">
                    <span className="flex items-center gap-1"><PenTool className="w-4 h-4"/> Nghệ nhân: {order.seller?.shopName || order.seller?.name || 'Vô danh'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> Bền bỉ {order.leadTime || 'Chưa xác định'}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-[#A35C3D]">{formatCurrency(Number(order.price))}</span>
                    <Link 
                      href={`/custom-orders/${order.id}/review`}
                      className="text-sm uppercase tracking-widest font-bold text-slate-700 hover:text-[#A35C3D] flex items-center gap-1"
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
