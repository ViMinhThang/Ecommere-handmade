"use client";

import { useEffect, useState } from "react";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { apiClient } from "@/lib/api/client";
import { PaymentForm } from "@/components/checkout/payment-form";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMe, useAddresses, useCart } from "@/lib/api/hooks";
import Image from "next/image";
import { mediaApi } from "@/lib/api/media";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_TYooMQauvdEDq54NiTphI7jx"
);

export default function CheckoutPage() {
  const router = useRouter();
  const { data: user } = useMe();
  const { data: addresses } = useAddresses(user?.id || "");
  const { data: cart } = useCart();
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    fullName: "",
    street: "",
    city: "",
    zipCode: "",
    district: "", // Adding district to support existing API
  });

  // Auto-fill address with default
  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
      if (defaultAddress) {
        setFormData(prev => ({
          ...prev,
          fullName: defaultAddress.fullName,
          phone: defaultAddress.phone,
          street: defaultAddress.address,
          city: defaultAddress.city,
          district: defaultAddress.district,
          email: user?.email || "",
        }));
      }
    } else if (user) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [addresses, user]);

  const handleInitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await apiClient.post<any>("/orders/checkout", {
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          city: formData.city,
          district: formData.district,
          street: formData.street,
        }
      });

      if (data?.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    } catch (err: any) {
      toast.error(err.message || "Không thể khởi tạo thanh toán.");
    } finally {
      setIsLoading(false);
    }
  };

  const paymentIntentId = clientSecret?.split('_secret')[0] || "";

  const options: StripeElementsOptions = {
    clientSecret: clientSecret || "",
    appearance: {
      theme: 'flat',
      variables: {
        colorPrimary: '#8B4513',
        colorBackground: '#ffffff',
        colorText: '#1c1917',
        borderRadius: '0px',
      },
      rules: {
        '.Input': {
          border: '1px solid #e1e0da',
        }
      }
    },
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-headline text-3xl italic mb-4">Giỏ hàng của quý khách đang trống</h2>
        <button onClick={() => router.push("/")} className="text-[#8B4513] underline font-medium">Tiếp tục khám phá</button>
      </div>
    );
  }

  const subtotal = cart.subtotal || 0;
  const discountAmount = cart.discountAmount || 0;
  const shipping = 25000; // Flat shipping
  const total = (cart.total || 0) + shipping;

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-stone-800 font-body">
      <style jsx global>{`
        .custom-input {
          background: transparent;
          border-bottom: 1px solid #D1D5DB;
          padding: 0.5rem 0;
          width: 100%;
          transition: border-color 0.2s;
        }
        .custom-input:focus {
          outline: none;
          border-bottom-color: #8B4513;
        }
        .custom-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6B7280;
          font-weight: 700;
        }
      `}</style>
      
      <header className="bg-[#F8F6F1] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
            <h1 className="font-headline text-2xl italic text-[#8B4513] tracking-tight">The Artisanal Curator</h1>
            <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-6 pt-12">
        <div className="flex items-center justify-center space-x-4 md:space-x-8 text-xs uppercase tracking-[0.2em] font-bold text-stone-400">
          <div className={`flex items-center ${!clientSecret ? 'text-[#8B4513]' : 'text-stone-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 italic font-headline ${!clientSecret ? 'bg-[#8B4513] text-white' : 'border border-stone-300'}`}>1</span>
            <span>Thông tin</span>
          </div>
          <div className="w-12 h-px bg-stone-300"></div>
          <div className={`flex items-center ${clientSecret ? 'text-[#8B4513]' : 'text-stone-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 italic font-headline ${clientSecret ? 'bg-[#8B4513] text-white' : 'border border-stone-300'}`}>2</span>
            <span>Thanh toán</span>
          </div>
          <div className="w-12 h-px bg-stone-300"></div>
          <div className="flex items-center">
            <span className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center mr-3 italic font-headline">3</span>
            <span>Hoàn tất</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        {/* Left: Form */}
        <div className="lg:col-span-7">
          {!clientSecret ? (
            <form onSubmit={handleInitCheckout} className="space-y-12 animate-in fade-in duration-700">
              {/* Contact Info */}
              <section>
                <h2 className="font-headline text-3xl italic mb-8">Thông tin Liên hệ</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="custom-label">Địa chỉ Email</label>
                    <input 
                      type="email" 
                      required
                      placeholder="ten@example.com" 
                      className="custom-input"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="custom-label">Số điện thoại</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="+84 (0) 000-000-000" 
                      className="custom-input"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
              </section>

              {/* Shipping Address */}
              <section>
                <h2 className="font-headline text-3xl italic mb-8">Địa chỉ Giao hàng</h2>
                <div className="space-y-8">
                  <div>
                    <label className="custom-label">Họ và Tên</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nguyễn Văn A" 
                      className="custom-input"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="custom-label">Địa chỉ chi tiết</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Số nhà, tên đường..." 
                      className="custom-input"
                      value={formData.street}
                      onChange={e => setFormData({...formData, street: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <label className="custom-label">Tỉnh / Thành phố</label>
                      <input 
                        type="text" 
                        required
                        placeholder="TP. Hồ Chí Minh" 
                        className="custom-input"
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="custom-label">Quận / Huyện</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Quận 1" 
                        className="custom-input"
                        value={formData.district}
                        onChange={e => setFormData({...formData, district: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="custom-label">Mã Bưu điện</label>
                      <input 
                        type="text" 
                        placeholder="70000" 
                        className="custom-input"
                        value={formData.zipCode}
                        onChange={e => setFormData({...formData, zipCode: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <div className="pt-8">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-[#8B4513] text-white px-10 py-5 rounded-sm flex items-center hover:bg-[#6F3610] transition-colors disabled:opacity-50 text-sm font-bold uppercase tracking-widest"
                >
                  {isLoading ? "Đang xử lý..." : "Tiếp tục Thanh toán"}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-12 animate-in zoom-in-95 duration-500">
              <section>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-headline text-3xl italic">Thông tin Thanh toán</h2>
                  <button 
                    onClick={() => setClientSecret(null)}
                    className="text-xs uppercase tracking-widest font-bold text-stone-400 hover:text-primary transition-colors"
                  >
                    Chỉnh sửa địa chỉ
                  </button>
                </div>
                <div className="bg-white p-8 rounded-sm shadow-sm border border-stone-200">
                  <Elements stripe={stripePromise} options={options}>
                    <PaymentForm 
                      paymentIntentId={paymentIntentId} 
                      onSuccess={(orderId) => {
                        router.push(`/orders/${orderId}/confirmation`);
                      }} 
                    />
                  </Elements>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className="lg:col-span-5">
          <div className="bg-stone-100/50 p-10 rounded-sm sticky top-32 border border-stone-200/50">
            <h2 className="font-headline text-2xl italic mb-10">Tóm tắt Đơn hàng</h2>
            
            {/* Items */}
            <div className="space-y-8 mb-10">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="relative w-20 h-20 bg-stone-200 rounded-sm overflow-hidden border border-stone-200">
                      {item.product.images?.[0] && (
                        <Image 
                          src={mediaApi.getImageUrl(item.product.images[0].url)}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      )}
                      <span className="absolute -top-2 -right-2 bg-stone-800 text-white text-[10px] w-6 h-6 flex items-center justify-center rounded-full z-10">{item.quantity}</span>
                    </div>
                    <div className="ml-5">
                      <p className="text-sm font-semibold text-stone-900">{item.product.name}</p>
                      <p className="text-xs text-stone-500 mt-1 uppercase tracking-tighter">SKU: {item.product.sku || 'N/A'}</p>
                    </div>
                  </div>
                  <p className="font-headline italic text-[#8B4513] text-lg">
                    {(Number(item.product.price) * item.quantity).toLocaleString('vi-VN')} ₫
                  </p>
                </div>
              ))}
            </div>

            {/* Costs */}
            <div className="space-y-4 pt-8 border-t border-stone-200/60 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Tạm tính</span>
                <span className="font-semibold">{subtotal.toLocaleString('vi-VN')} ₫</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#8B4513]">
                  <span className="font-medium">Giảm giá ({cart.appliedVoucher?.code})</span>
                  <span className="font-semibold">-{discountAmount.toLocaleString('vi-VN')} ₫</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Phí vận chuyển</span>
                <span className="font-semibold">{shipping.toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>

            {/* Total */}
            <div className="pt-12 flex flex-col">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-stone-400">Tổng thanh toán</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-headline text-4xl italic text-[#8B4513]">{total.toLocaleString('vi-VN')} ₫</span>
                <span className="text-[9px] text-stone-400 uppercase font-bold tracking-widest">Đã bao gồm thuế</span>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex flex-col gap-6 px-4">
            <div className="flex items-center text-[10px] text-stone-500 uppercase tracking-widest font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[#8B4513]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Thanh toán Bảo mật & Mã hóa
            </div>
            <div className="flex items-center text-[10px] text-stone-500 uppercase tracking-widest font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-[#8B4513]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Vật liệu đóng gói bền vững
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[#EAE7E0] mt-24 py-20 border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
          <div>
            <h3 className="font-headline italic text-2xl text-[#8B4513] mb-6">The Artisanal Curator</h3>
            <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
              Kết nối những người sưu tầm tinh tế với những người bán tâm huyết nhất thế giới từ năm 2024.
            </p>
            <p className="text-[10px] text-stone-400 mt-16 uppercase tracking-widest font-bold">
              &copy; 2024 The Artisanal Curator. Chế tác với tâm hồn.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-12 text-[10px] uppercase tracking-[0.2em] font-extrabold text-stone-600 pt-2">
            <div className="space-y-6">
              <a href="#" className="block hover:text-[#8B4513] transition-colors">Vận chuyển & Đổi trả</a>
              <a href="#" className="block hover:text-[#8B4513] transition-colors">Tính Bền vững</a>
            </div>
            <div className="space-y-6">
              <a href="#" className="block hover:text-[#8B4513] transition-colors">Câu chuyện Người bán</a>
              <a href="#" className="block hover:text-[#8B4513] transition-colors">Quyền riêng tư</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
