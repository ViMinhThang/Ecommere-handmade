"use client";

import { useParams, useRouter } from "next/navigation";
import { useOrder } from "@/lib/api/hooks";
import { mediaApi } from "@/lib/api/media";
import { OrderItem, OrderShippingAddress, SubOrder } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { vi } from "date-fns/locale";

function normalizeShippingAddress(value: unknown): OrderShippingAddress | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as OrderShippingAddress;
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    return value as OrderShippingAddress;
  }

  return null;
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: order, isLoading, error } = useOrder(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center">
        <div className="text-stone-400 animate-pulse font-headline italic text-2xl">Đang tải thông tin đơn hàng...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-headline text-3xl italic mb-4 text-primary">Không tìm thấy đơn hàng</h2>
        <p className="text-stone-500 mb-8">Có lỗi xảy ra khi tải thông tin đơn hàng của quý khách.</p>
        <button onClick={() => router.push("/")} className="text-[#8B4513] underline font-medium">Quay lại trang chủ</button>
      </div>
    );
  }

  const shippingAddress = normalizeShippingAddress(order.shippingAddress);
  const arrivalStart = addDays(new Date(order.createdAt), 3);
  const arrivalEnd = addDays(new Date(order.createdAt), 7);

  // Flatten items across all sub-orders
  const allItems = order.subOrders?.flatMap((so: SubOrder) => 
    so.items.map((item: OrderItem) => ({
      ...item,
      sellerName: so.seller.shopName || so.seller.name
    }))
  ) || [];

  const itemSubtotal = allItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );
  const discountAmount = Number(order.discountAmount || 0);
  const shipping = Math.max(Number(order.totalAmount) - (itemSubtotal - discountAmount), 0);
  const total = Number(order.totalAmount);
  const subtotal = itemSubtotal - discountAmount;
  const tax = 0;

  return (
    <div className="text-stone-800 min-h-screen flex flex-col bg-[#F8F6F1] font-body">
      <style jsx global>{`
        .summary-card {
          background-color: #F2F0EB;
          border-radius: 4px;
        }
      `}</style>

      {/* Main Content Container */}
      <main className="flex-grow max-w-6xl mx-auto px-6 py-12 lg:py-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Side: Order Details & Items */}
          <div className="lg:col-span-8 summary-card p-8 lg:p-12 border border-stone-200/50">
            {/* Order Header Info */}
            <div className="flex flex-col md:flex-row justify-between mb-16 gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-stone-500 mb-3">Mã đơn hàng</p>
                <h2 className="font-headline text-2xl md:text-3xl text-stone-800 italic">#{order.id.slice(0,8).toUpperCase()}</h2>
              </div>
              <div className="md:text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-stone-500 mb-3">Ngày nhận hàng dự kiến</p>
                <h2 className="font-headline text-2xl md:text-3xl text-stone-800 italic leading-tight uppercase">
                  {format(arrivalStart, "dd MMM", { locale: vi })} — {format(arrivalEnd, "dd MMM", { locale: vi })}
                </h2>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-12">
              {allItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex gap-8 items-start group">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-stone-300 flex-shrink-0 rounded-sm overflow-hidden relative border border-stone-200 shadow-sm">
                    {item.product.images?.[0] && (
                      <Image 
                        src={mediaApi.getImageUrl(item.product.images[0].url)}
                        alt={item.product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="flex-grow flex flex-col md:flex-row justify-between">
                    <div>
                      <h3 className="font-headline text-xl md:text-2xl text-stone-800 italic mb-1">{item.product.name}</h3>
                      <p className="text-[10px] text-stone-500 uppercase tracking-widest font-bold">{item.sellerName}</p>
                    </div>
                    <div className="mt-4 md:mt-0 md:text-right">
                      <p className="font-headline text-lg text-stone-800 italic">{(Number(item.price) * item.quantity).toLocaleString('vi-VN')} ₫</p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1 font-bold">Số lượng: {item.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-20 pt-12 border-t border-stone-300/50">
              <Link href="/" className="text-[#8B4513] text-xs uppercase tracking-widest font-bold hover:underline">
                tiếp tục mua sắm &rarr;
              </Link>
            </div>
          </div>

          {/* Right Side: Summary & Shipping */}
          <div className="lg:col-span-4 space-y-6">
            {/* Order Summary */}
            <div className="summary-card p-8 border border-stone-200/50">
              <h3 className="font-headline text-2xl italic mb-8">Tóm tắt đơn hàng</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium tracking-tight">Tạm tính</span>
                  <span className="font-bold text-stone-700">{subtotal.toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium tracking-tight">Phí vận chuyển</span>
                  <span className="font-bold text-stone-700">{shipping.toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium tracking-tight">Thuế VAT (8%)</span>
                  <span className="font-bold text-stone-700">{tax.toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="pt-8 mt-4 border-t border-stone-300 flex flex-col gap-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-stone-400">Tổng cộng</span>
                  <div className="flex justify-between items-center">
                    <span className="font-headline text-2xl italic">Đã bao gồm thuế</span>
                    <span className="font-headline text-3xl italic text-[#8B4513] tracking-tight">{total.toLocaleString('vi-VN')} ₫</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="summary-card p-8 border border-stone-200/50">
              <h3 className="font-headline text-2xl italic mb-6">Giao hàng đến</h3>
              <div className="text-sm text-stone-600 leading-relaxed font-medium">
                {shippingAddress ? (
                  <>
                    <p className="text-stone-900 font-bold text-base mb-2">{shippingAddress.fullName}</p>
                    <p>{shippingAddress.street || shippingAddress.address}</p>
                    <p>{shippingAddress.district}, {shippingAddress.city}</p>
                    <p className="mt-4 text-stone-400 font-bold uppercase tracking-widest text-[10px]">Điện thoại: {shippingAddress.phone}</p>
                  </>
                ) : (
                  <p>Thông tin giao hàng không khả dụng.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#EAE7E0] py-16 border-t border-stone-200 mt-auto">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12">
            <div>
              <h3 className="font-headline italic text-xl text-[#8B4513] mb-4">The Artisanal Curator</h3>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                &copy; 2024 The Artisanal Curator. Chế tác với tâm hồn.
              </p>
            </div>
            
            <nav className="flex flex-wrap gap-x-8 gap-y-4 text-[10px] uppercase tracking-widest font-bold text-stone-600">
              <a href="#" className="hover:text-[#8B4513] transition-colors">Vận chuyển & Đổi trả</a>
              <a href="#" className="hover:text-[#8B4513] transition-colors">Tính Bền vững</a>
              <a href="#" className="hover:text-[#8B4513] transition-colors">Câu chuyện Người bán</a>
              <a href="#" className="hover:text-[#8B4513] transition-colors">Quyền riêng tư</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
