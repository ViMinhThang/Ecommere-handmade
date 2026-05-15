"use client";

import { useDeferredValue, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  customOrdersApi,
  CreateCustomOrderPayload,
} from "@/lib/api/custom-orders";
import { usersApi } from "@/lib/api/users";
import { User } from "@/types";
import { SketchUpload } from "@/components/dashboard/sketch-upload";
import { getErrorMessage } from "@/lib/utils";

// Minimal reproduction of custom_order1 style generator
export default function NewCustomOrderPage() {
  const router = useRouter();
  const [customerSearch, setCustomerSearch] = useState("");
  const deferredCustomerSearch = useDeferredValue(customerSearch.trim());
  const customerSearchQuery =
    deferredCustomerSearch.length >= 2 ? deferredCustomerSearch : undefined;

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    isFetching: isFetchingUsers,
  } = useQuery({
    queryKey: ["sellerCustomers", { q: customerSearchQuery, limit: 20 }],
    queryFn: () => usersApi.getCustomers({ q: customerSearchQuery, limit: 20 }),
  });

  const customers = usersData?.data || [];

  const [formData, setFormData] = useState({
    customerId: "",
    title: "Bình Gốm Mỹ Nghệ Chạm Khắc Tay",
    artisanNote: "Một sản phẩm mang đậm hơi thở truyền thống, được tinh chỉnh riêng cho không gian hiện đại của bạn.",
    price: 320,
    leadTime: "4 tuần hoàn thiện",
    sketchImageUrl: "",
  });

  const [specInput, setSpecInput] = useState("");
  const [specifications, setSpecifications] = useState<string[]>(["Gốm thô"]);

  const createOrder = useMutation({
    mutationFn: (data: CreateCustomOrderPayload) =>
      customOrdersApi.create(data),
    onSuccess: (data) => {
      toast.success("Đơn hàng thiết kế đã được tạo và gửi bản duyệt.");
      // The seller can be navigated to their dashboard, but for tracking let's just 
      // navigate to the newly created review link so they can see what the user sees
      router.push(`/custom-orders/${data.id}/review`);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Lỗi khi tạo đơn hàng thiết kế"));
    }
  });

  const handleAddSpec = () => {
    if (specInput.trim()) {
      setSpecifications([...specifications, specInput.trim()]);
      setSpecInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
       toast.error("Vui lòng chọn khách hàng");
       return;
    }

    createOrder.mutate({
      ...formData,
      specifications,
    });
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-10 rounded-xl shadow-sm border border-slate-200">
      <h1 className="text-3xl font-serif font-bold text-[#A35C3D] mb-2">Thiết lập Phòng thiết kế</h1>
      <p className="text-slate-500 mb-8">Soạn thảo một bản giao ước thiết kế riêng cho khách hàng của bạn.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
             <label htmlFor="custom-order-customer-search" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Tìm khách hàng</label>
             <input
               id="custom-order-customer-search"
               name="custom-order-customer-search"
               type="search"
               value={customerSearch}
               onChange={(e) => setCustomerSearch(e.target.value)}
               placeholder="Tên, email hoặc số điện thoại"
               className="w-full border-b border-slate-300 py-2 mb-5 focus:outline-none focus:border-[#A35C3D] bg-transparent transition-colors"
             />
             <label htmlFor="custom-order-customer" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Chọn Khách hàng</label>
             {isLoadingUsers || isFetchingUsers ? (
               <div className="py-2 text-sm text-slate-400 animate-pulse">Đang tải danh sách...</div>
             ) : (
               <select 
                 id="custom-order-customer"
                 name="custom-order-customer"
                 required
                 value={formData.customerId}
                 onChange={e => setFormData({...formData, customerId: e.target.value})}
                 className="w-full border-b border-slate-300 py-2 focus:outline-none focus:border-[#A35C3D] bg-transparent transition-colors cursor-pointer"
               >
                 <option value="" disabled>
                   {customers.length ? "Chọn một khách hàng" : "Không có khách hàng phù hợp"}
                 </option>
                 {customers.map((user: User) => (
                   <option key={user.id} value={user.id}>
                     {user.name} ({user.email})
                   </option>
                 ))}
               </select>
             )}
             <p className="text-[10px] text-slate-400 mt-1 italic">Việc chọn khách hàng sẽ liên kết bản thiết kế này với tài khoản của họ.</p>
          </div>

          <div>
             <label htmlFor="custom-order-title" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Tên Sản phẩm</label>
             <input 
               id="custom-order-title"
               name="custom-order-title"
               type="text" 
               required
               value={formData.title}
               onChange={e => setFormData({...formData, title: e.target.value})}
               className="w-full border-b border-slate-300 py-2 text-xl font-serif focus:outline-none focus:border-[#A35C3D]"
             />
          </div>

          <div>
             <label htmlFor="custom-order-note" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Ghi chú từ Người bán</label>
             <textarea 
               id="custom-order-note"
               name="custom-order-note"
               required
               rows={4}
               value={formData.artisanNote}
               onChange={e => setFormData({...formData, artisanNote: e.target.value})}
               className="w-full bg-slate-100/50 rounded p-4 text-sm focus:ring-1 focus:ring-[#A35C3D] outline-none"
             ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
               <label htmlFor="custom-order-price" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Tổng chi phí ($)</label>
               <input 
                 id="custom-order-price"
                 name="custom-order-price"
                 type="number" 
                 required
                 value={formData.price}
                 onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                 className="w-full border-b border-slate-300 py-2 focus:outline-none focus:border-[#A35C3D]"
               />
            </div>
            <div>
               <label htmlFor="custom-order-lead-time" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Thời gian hoàn thiện</label>
               <input 
                 id="custom-order-lead-time"
                 name="custom-order-lead-time"
                 type="text" 
                 required
                 value={formData.leadTime}
                 onChange={e => setFormData({...formData, leadTime: e.target.value})}
                 className="w-full border-b border-slate-300 py-2 focus:outline-none focus:border-[#A35C3D]"
               />
            </div>
          </div>

          <div>
             <div className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Bản phác thảo sơ bộ</div>
             <SketchUpload 
               value={formData.sketchImageUrl} 
               onChange={(url) => setFormData({...formData, sketchImageUrl: url})} 
               label="Tải lên bản phác thảo"
             />
             <p className="text-[10px] text-slate-400 mt-2 italic">Một tài liệu tham khảo trực quan giúp khách hàng hiểu rõ ý tưởng của bạn.</p>
          </div>

          <div>
             <label htmlFor="custom-order-spec" className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Thông số kỹ thuật</label>
             <div className="flex gap-2 mb-3">
                <input 
                   id="custom-order-spec"
                   name="custom-order-spec"
                   type="text" 
                   value={specInput}
                   onChange={e => setSpecInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSpec())}
                   placeholder="vd: Lớp phủ men ngọc xanh mờ"
                   className="flex-1 border-b border-slate-300 py-2 focus:outline-none focus:border-[#A35C3D]"
                />
                <button type="button" onClick={handleAddSpec} className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded">Thêm</button>
             </div>
             <div className="flex flex-wrap gap-2">
               {specifications.map((s, i) => (
                 <span key={i} className="px-3 py-1 bg-[#DCE4DE] text-[#5C6E5E] text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-2">
                   {s}
                   <button type="button" onClick={() => setSpecifications(specifications.filter((_, idx) => idx !== i))}>&times;</button>
                 </span>
               ))}
             </div>
          </div>

          <div className="pt-8">
            <button 
              type="submit" 
              disabled={createOrder.isPending}
              className="w-full bg-[#A35C3D] hover:bg-[#8a4d33] transition-colors text-white py-4 rounded font-bold uppercase tracking-[0.15em] shadow-lg shadow-[#A35C3D]/20 disabled:opacity-50"
            >
              {createOrder.isPending ? "Đang tạo bản duyệt..." : "Tạo Liên kết Duyệt thiết kế"}
            </button>
          </div>
        </form>
      </div>
    );
}
