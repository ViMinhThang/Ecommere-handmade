"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Truck, ArrowRight, PenTool, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customOrdersApi, CustomOrder } from "@/lib/api/custom-orders";
import { useMe } from "@/lib/api/hooks";
import { toast } from "sonner";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { formatCurrency } from "@/lib/utils";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_TYooMQauvdEDq54NiTphI7jx"
);

function PaymentForm({ order, onSuccess }: { order: CustomOrder, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const confirmPayment = useMutation({
    mutationFn: (paymentIntentId: string) => customOrdersApi.confirmPayment(order.id, paymentIntentId),
    onSuccess: () => {
      toast.success("Thanh toán thành công! Đơn hàng đã chuyển sang giai đoạn chế tác.");
      queryClient.invalidateQueries({ queryKey: ["customOrder", order.id] });
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || "Lỗi xác nhận thanh toán trên máy chủ.");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/custom-orders/${order.id}/review`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || "Thử nghiệm thanh toán thất bại.");
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      confirmPayment.mutate(paymentIntent.id);
    }
    
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-6 rounded-xl border border-slate-200">
       <PaymentElement />
       <button 
         type="submit" 
         disabled={isProcessing || !stripe}
         className="w-full bg-[#1A1A1A] text-white py-4 rounded font-bold uppercase tracking-widest disabled:opacity-50"
       >
         {isProcessing ? "Đang xử lý..." : `Thanh toán ${formatCurrency(Number(order.price))}`}
       </button>
    </form>
  );
}

export default function CustomOrderReviewPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: user } = useMe();
  
  const { data: order, isLoading } = useQuery({
    queryKey: ["customOrder", id],
    queryFn: async () => {
      const res = await customOrdersApi.getById(id);
      return res as CustomOrder;
    }
  });

  const isCustomer = user?.id === order?.customerId;
  const isSeller = user?.id === order?.sellerId;

  const approveSketch = useMutation({
    mutationFn: () => customOrdersApi.approveSketch(id),
    onSuccess: (data: any) => {
      if (data?.clientSecret) {
         setClientSecret(data.clientSecret);
         setShowCheckout(true);
      }
      queryClient.invalidateQueries({ queryKey: ["customOrder", id] });
    },
    onError: (err: any) => toast.error(err.message || "Không thể duyệt bản phác thảo")
  });

  const requestRevision = useMutation({
    mutationFn: (note: string) => customOrdersApi.requestRevision(id, note),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu chỉnh sửa.");
      queryClient.invalidateQueries({ queryKey: ["customOrder", id] });
    }
  });

  if (isLoading || !order) return <div className="p-24 text-center font-serif text-slate-500">Đang tải bản thiết kế riêng của bạn...</div>;

  const STATUS_STEPS = ["DRAFT", "PENDING_REVIEW", "AWAITING_PAYMENT", "CRAFTING", "FINISHING", "SHIPPED"];
  // Map our DB statuses to the UI phases
  const getPhaseIndex = () => {
    switch(order.status) {
      case 'DRAFT': return 0;
      case 'PENDING_REVIEW': 
      case 'REVISION_REQUESTED': return 1;
      case 'AWAITING_PAYMENT': return 2;
      case 'CRAFTING': return 3;
      case 'FINISHING': return 4;
      case 'SHIPPED': return 5;
      default: return 1;
    }
  };
  const activePhase = getPhaseIndex();

  return (
    <div className="font-sans bg-[#FAF9F6] text-slate-800 min-h-screen flex flex-col">
      <header className="max-w-7xl mx-auto w-full px-6 py-8 flex items-center justify-between">
        <div className="text-xl font-serif font-bold text-[#A35C3D] tracking-tight italic">Người Bán Tuyển Chọn</div>
      </header>

      {/* Progress Tracker */}
      <section className="max-w-6xl mx-auto w-full px-6 py-12">
          <div className="flex items-center justify-between relative">
              <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activePhase >= 1 ? 'bg-[#5C6E5E] text-white shadow-sm' : 'bg-slate-200 text-slate-400'}`}>
                      {activePhase > 0 ? <Check className="w-5 h-5" /> : <span className="text-xs font-bold">01</span>}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold mt-3 ${activePhase >= 1 ? 'text-slate-600' : 'text-slate-400'}`}>Tư vấn</span>
              </div>
              <div className={`h-0.5 flex-grow mx-4 ${activePhase >= 1 ? 'bg-[#A35C3D]' : 'bg-slate-200'}`}></div>

              <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activePhase === 1 ? 'border-2 border-[#A35C3D] bg-white' : activePhase > 1 ? 'bg-[#5C6E5E] text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {activePhase === 1 && <div className="w-2.5 h-2.5 rounded-full bg-[#A35C3D]"></div>}
                      {activePhase > 1 && <Check className="w-5 h-5" />}
                      {activePhase < 1 && <span className="text-xs font-bold">02</span>}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold mt-3 ${activePhase === 1 ? 'text-[#A35C3D]' : activePhase > 1 ? 'text-slate-600': 'text-slate-400'}`}>Phác thảo</span>
              </div>
              <div className={`h-0.5 flex-grow mx-4 ${activePhase >= 3 ? 'bg-[#A35C3D]' : 'bg-slate-200'}`}></div>

              <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activePhase === 3 ? 'border-2 border-[#A35C3D] bg-white' : activePhase > 3 ? 'bg-[#5C6E5E] text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {activePhase === 3 && <div className="w-2.5 h-2.5 rounded-full bg-[#A35C3D]"></div>}
                      {activePhase > 3 && <Check className="w-5 h-5" />}
                      {activePhase < 3 && <span className="text-xs font-bold">03</span>}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold mt-3 ${activePhase === 3 ? 'text-[#A35C3D]' : activePhase > 3 ? 'text-slate-600': 'text-slate-400'}`}>Chế tác</span>
              </div>
              <div className={`h-0.5 flex-grow mx-4 ${activePhase >= 4 ? 'bg-[#A35C3D]' : 'bg-slate-200'}`}></div>

              <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activePhase === 4 ? 'border-2 border-[#A35C3D] bg-white' : activePhase > 4 ? 'bg-[#5C6E5E] text-white' : 'bg-slate-200 text-slate-400'}`}>
                      {activePhase === 4 && <div className="w-2.5 h-2.5 rounded-full bg-[#A35C3D]"></div>}
                      {activePhase > 4 && <Check className="w-5 h-5" />}
                      {activePhase < 4 && <span className="text-xs font-bold">04</span>}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold mt-3 ${activePhase === 4 ? 'text-[#A35C3D]' : activePhase > 4 ? 'text-slate-600': 'text-slate-400'}`}>Hoàn thiện</span>
              </div>
              <div className={`h-0.5 flex-grow mx-4 ${activePhase >= 5 ? 'bg-[#A35C3D]' : 'bg-slate-200'}`}></div>

              <div className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activePhase >= 5 ? 'bg-[#A35C3D] text-white' : 'bg-slate-200 text-slate-400'}`}>
                      <Truck className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold mt-3 ${activePhase >= 5 ? 'text-[#A35C3D]' : 'text-slate-400'}`}>Đã giao</span>
              </div>
          </div>
      </section>

      <main className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 py-12 mb-20">
          <div className="aspect-[4/5] bg-[#EBE9E4] rounded-sm flex items-center justify-center relative shadow-inner overflow-hidden">
              <div className="absolute inset-0 border-[20px] border-white/10 pointer-events-none z-10"></div>
              {order.sketchImageUrl ? (
                <img src={order.sketchImageUrl} className="w-full h-full object-cover" alt="Bản phác thảo" />
              ) : (
                <div className="w-full h-full opacity-50 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.02)_100%)]"></div>
              )}
          </div>

          <div className="flex flex-col">
              <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 text-slate-900 leading-tight">Duyệt thiết kế</h1>
              
              <div className="bg-[#F2EEE6] rounded-xl p-8 mb-10 border border-slate-200/40 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                      <PenTool className="w-5 h-5 text-[#A35C3D]" />
                      <h2 className="text-sm uppercase tracking-widest font-bold text-slate-800 italic font-serif">Ghi chú từ Người bán</h2>
                  </div>
                  <p className="text-slate-600 italic leading-relaxed mb-8 text-base">
                      "{order.artisanNote}"
                  </p>
                  <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-300">
                          <div className="w-full h-full bg-slate-400 flex items-center justify-center text-white">
                               <User className="w-6 h-6" />
                          </div>
                      </div>
                      <div>
                          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-900">{order.seller?.shopName || 'Người bán chính'}</div>
                      </div>
                  </div>
              </div>

              <div className="space-y-8 mb-12">
                  <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                      <div>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-1">Sản phẩm</span>
                          <h3 className="text-2xl font-serif font-bold text-slate-900">{order.title}</h3>
                      </div>
                      <span className="text-xl font-serif font-bold text-[#A35C3D]">{formatCurrency(Number(order.price))}</span>
                  </div>

                  <div>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mb-4">Thông số tùy chỉnh</span>
                      <div className="flex flex-wrap gap-3">
                          {order.specifications?.map((spec, i) => (
                             <span key={i} className="px-4 py-2 bg-[#DCE4DE] text-[#5C6E5E] text-[10px] font-bold rounded-full uppercase tracking-wider">{spec}</span>
                          ))}
                      </div>
                  </div>
              </div>

              {order.status === 'PENDING_REVIEW' && !showCheckout && (
                <div className="space-y-4">
                    {isCustomer ? (
                      <>
                        <button 
                          onClick={() => approveSketch.mutate()}
                          disabled={approveSketch.isPending}
                          className="bg-[#A35C3D] w-full text-white py-5 rounded-md font-bold text-sm tracking-[0.2em] uppercase flex items-center justify-center space-x-3 shadow-lg shadow-[#A35C3D]/20 hover:opacity-90 transition-opacity"
                        >
                            <span>{approveSketch.isPending ? "Đang chuẩn bị thanh toán bảo mật..." : "Duyệt thiết kế"}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            const note = prompt("Vui lòng cung cấp phản hồi/yêu cầu của bạn:");
                            if (note) requestRevision.mutate(note);
                          }}
                          className="w-full bg-[#EBE9E4] text-slate-600 py-5 rounded-md font-bold text-sm tracking-[0.2em] uppercase hover:bg-slate-200 transition-colors"
                        >
                            Yêu cầu chỉnh sửa
                        </button>
                      </>
                    ) : isSeller ? (
                      <div className="p-6 bg-[#E6F0E9] text-[#4A7255] rounded-lg border border-[#4A7255]/20 text-center">
                        <p className="font-serif font-bold mb-1">Chế độ xem trước của Người bán</p>
                        <p className="text-sm italic">Đang chờ khách hàng xem xét và duyệt bản phác thảo.</p>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 text-slate-500 rounded-lg border border-slate-200 text-center">
                        <p className="text-sm italic font-serif">Đang chờ khách hàng duyệt.</p>
                      </div>
                    )}
                </div>
              )}
              
              {order.status === 'REVISION_REQUESTED' && (
                <div className="p-6 bg-orange-50 text-orange-800 rounded-lg border border-orange-200">
                  <p className="font-semibold">Đã yêu cầu chỉnh sửa.</p>
                  <p className="text-sm mt-2">
                    {isCustomer ? "Người bán sẽ sớm cập nhật bản phác thảo và ghi chú mới." : "Hãy kiểm tra bảng quản lý để phản hồi yêu cầu chỉnh sửa này."}
                  </p>
                </div>
              )}

              {/* Checkout Form Container when Approved */}
              {(order.status === 'AWAITING_PAYMENT' || showCheckout) && clientSecret && (
                <div>
                   <h3 className="font-serif text-xl font-bold border-b pb-2 mb-4">Hoàn tất thanh toán để bắt đầu chế tác</h3>
                   <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <PaymentForm order={order} onSuccess={() => setShowCheckout(false)} />
                   </Elements>
                </div>
              )}

              {/* If Await Payment but we just loaded the page and don't have clientSecret, we can auto trigger approve mutation to fetch the secret since backend idempotent */}
              {order.status === 'AWAITING_PAYMENT' && !clientSecret && !approveSketch.isPending && (
                <button 
                  onClick={() => approveSketch.mutate()}
                  className="bg-[#1A1A1A] text-white py-4 px-6 rounded-md uppercase font-bold text-sm tracking-widest"
                >
                  Tiếp tục thanh toán
                </button>
              )}

              {['CRAFTING', 'FINISHING', 'SHIPPED'].includes(order.status) && (
                <div className="p-8 bg-[#E6F0E9] text-[#4A7255] rounded-xl text-center border border-[#4A7255]/20">
                  <h3 className="font-serif text-2xl font-bold mb-2">Đơn hàng đang sản xuất</h3>
                  <p>Tác phẩm của bạn đang được chăm chút qua từng công đoạn nghệ thuật. Trạng thái hiện tại: <strong>{order.status}</strong></p>
                </div>
              )}
          </div>
      </main>
    </div>
  );
}
