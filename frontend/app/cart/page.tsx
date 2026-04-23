"use client";

import Image from "next/image";
import Link from "next/link";
import { X, ArrowRight, Leaf, ShoppingBag, LogIn, Tag, Ticket } from "lucide-react";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { CartItemCard } from "@/components/storefront/cart-item-card";
import { useCartContext } from "@/contexts/cart-context";
import { useAuth } from "@/contexts/auth-context";
import { useCartSuggestions, useAddToCart, useApplyVoucher, useVouchers } from "@/lib/api/hooks";
import type { Product, ProductImage, Voucher } from "@/types";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/utils";

function getProductImageUrl(product: Product): string {
  const mainImage = product.images?.find((img: ProductImage) => img.isMain);
  const firstImage = product.images?.[0];
  const imageUrl = mainImage?.url || firstImage?.url || "";

  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");
  return `${apiBase}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

function SuggestionCard({ product }: { product: Product }) {
  const imageUrl = getProductImageUrl(product);
  const addToCart = useAddToCart();
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    try {
      await addToCart.mutateAsync({ productId: product.id, quantity: 1 });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // Error already handled by mutation
    }
  };

  return (
    <div className="bg-muted p-4 rounded-lg group">
      <Link href={`/products/${product.id}`}>
        <div className="aspect-square mb-4 overflow-hidden rounded-md bg-accent">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.name}
              width={300}
              height={300}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="w-8 h-8 opacity-30" />
            </div>
          )}
        </div>
      </Link>
      <p className="font-sans text-sm font-semibold text-foreground truncate">{product.name}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="font-sans text-xs text-primary">{formatCurrency(Number(product.price))}</p>
        <button
          onClick={handleAdd}
          disabled={addToCart.isPending || added}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          {added ? "✓ Đã thêm" : "+ Thêm"}
        </button>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-8">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/40" />
      </div>
      <h2 className="text-3xl font-headline italic text-foreground mb-4">
        Giỏ hàng của bạn đang trống
      </h2>
      <p className="text-muted-foreground max-w-md mb-10 font-body">
        Có vẻ như bạn vẫn chưa tìm thấy kho báu tiếp theo của mình. Hãy khám phá các bộ sưu tập của chúng tôi để tìm thấy điều gì đó phi thường.
      </p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground px-8 py-4 rounded-md font-sans font-bold tracking-wide hover:opacity-90 transition-opacity inline-flex items-center gap-3 shadow-[0_10px_20px_rgba(133,55,36,0.15)]"
      >
        Khám phá Bộ sưu tập
        <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  );
}

function LoginPrompt() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-8">
        <LogIn className="w-16 h-16 text-muted-foreground/40" />
      </div>
      <h2 className="text-3xl font-headline italic text-foreground mb-4">
        Đăng nhập để xem giỏ hàng
      </h2>
      <p className="text-muted-foreground max-w-md mb-10 font-body">
        Đăng nhập vào tài khoản của bạn để truy cập giỏ hàng và tiếp tục trải nghiệm mua sắm của bạn.
      </p>
      <Link
        href="/login?redirect=/cart"
        className="bg-primary text-primary-foreground px-8 py-4 rounded-md font-sans font-bold tracking-wide hover:opacity-90 transition-opacity inline-flex items-center gap-3 shadow-[0_10px_20px_rgba(133,55,36,0.15)]"
      >
        Đăng nhập
        <ArrowRight className="w-5 h-5" />
      </Link>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { items, subtotal, discountAmount, total, isLoading, appliedVoucher, updateQuantity, removeItem } = useCartContext();
  const { data: suggestions } = useCartSuggestions(isAuthenticated && items.length > 0);
  const { data: allVouchersData } = useVouchers({ limit: 100 });
  const [voucherCode, setVoucherCode] = useState("");
  const applyVoucherMutation = useApplyVoucher();
  const removeVoucherMutation = useRemoveVoucher();

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    await updateQuantity(productId, quantity);
  };

  const handleRemove = async (productId: string) => {
    await removeItem(productId);
  };

  const handleApplyVoucher = async (codeOverride?: string) => {
    const code = codeOverride || voucherCode;
    if (!code.trim()) return;
    try {
      await applyVoucherMutation.mutateAsync(code);
      setVoucherCode("");
      toast.success("Áp dụng mã giảm giá thành công!");
    } catch {
      // Error handled by global MutationCache
    }
  };

  const handleRemoveVoucher = async () => {
    try {
      await removeVoucherMutation.mutateAsync();
      toast.info("Đã xóa mã giảm giá");
    } catch {
      // Error handled by global MutationCache
    }
  };

  const applicableVouchers = useMemo(() => {
    if (!allVouchersData || items.length === 0) return [];
    
    // Extract unique category IDs from cart items
    const cartCategoryIds = new Set(items.map(item => item.product.categoryId));
    
    const vouchers = Array.isArray(allVouchersData) 
      ? allVouchersData 
      : (allVouchersData as any)?.data || [];

    // Filter vouchers where categoryId matches any in cart
    return vouchers.filter((v: Voucher) => 
      v.isActive && 
      new Date(v.endDate) > new Date() &&
      cartCategoryIds.has(v.categoryId)
    );
  }, [allVouchersData, items]);

  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary/20 selection:text-primary">
      <CustomerNavBar />

      <main className="pt-32 pb-24 px-8 md:px-12 max-w-[1600px] mx-auto min-h-screen">
        <header className="mb-16">
          <h1 className="text-5xl font-headline font-bold text-primary tracking-tight italic mb-4">
            Giỏ hàng của bạn
          </h1>
          <p className="text-muted-foreground font-body">
            Những tác phẩm được chọn lọc, đang chờ đợi ngôi nhà mới.
          </p>
        </header>

        {!isAuthenticated ? (
          <LoginPrompt />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Product List Area */}
            <div className="lg:col-span-7 space-y-12">
              {items.map((item) => (
                <CartItemCard
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))}

              {/* Suggested Products */}
              {suggestions && suggestions.length > 0 && (
                <div className="mt-20">
                  <h4 className="text-lg font-headline italic text-muted-foreground mb-6 border-b border-border/20 pb-4">
                    Những người bán bạn có thể quan tâm...
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {suggestions.map((product: Product) => (
                      <SuggestionCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Summary Area */}
            <aside className="lg:col-span-5">
              <div className="sticky top-32 bg-accent p-10 rounded-xl">
                <h2 className="text-3xl font-headline font-bold text-foreground mb-8 tracking-tight">
                  Tóm tắt đơn hàng
                </h2>

                <div className="space-y-6 mb-10">
                  <div className="flex justify-between items-center text-muted-foreground border-b border-border/10 pb-4">
                    <span className="font-sans">Tạm tính</span>
                    <span className="font-sans font-semibold">{formatCurrency(subtotal)}</span>
                  </div>

                  {/* Voucher Section */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 text-foreground font-headline italic">
                      <Ticket className="w-4 h-4 text-primary" />
                      <span>Mã giảm giá</span>
                    </div>
                    
                    {!appliedVoucher ? (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nhập mã ưu đãi"
                            className="flex-grow bg-background border border-border/40 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                          />
                          <button
                            onClick={() => handleApplyVoucher()}
                            disabled={applyVoucherMutation.isPending || !voucherCode.trim()}
                            className="bg-primary text-primary-foreground px-6 py-3 rounded-md text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {applyVoucherMutation.isPending ? "..." : "Sử dụng"}
                          </button>
                        </div>

                        {/* Applicable Vouchers List */}
                        {applicableVouchers.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                              Mã giảm giá dành cho bạn
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                              {applicableVouchers.map((v: Voucher) => (
                                <button
                                  key={v.id}
                                  onClick={() => handleApplyVoucher(v.code)}
                                  className="w-full text-left p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group flex items-center justify-between"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-sans font-bold text-primary">{v.code}</span>
                                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                        {v.category?.name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{v.description}</p>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" />
                            <span className="font-sans font-bold text-primary uppercase">
                              {appliedVoucher.code}
                            </span>
                          </div>
                          <button
                            onClick={handleRemoveVoucher}
                            className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-primary border-t border-primary/10 pt-2">
                          <span className="text-sm font-sans">Giảm giá đã áp dụng</span>
                          <span className="font-sans font-bold italic">
                            - {formatCurrency(appliedVoucher.discountAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-muted-foreground border-t border-border/10 pt-6">
                    <span className="font-sans">Phí vận chuyển</span>
                    <span className="font-sans font-semibold italic text-xs">Tính ở bước tiếp theo</span>
                  </div>
                  
                  <div className="pt-6 border-t-2 border-border/30 flex justify-between items-end">
                    <div>
                      <span className="text-xl font-headline font-bold text-foreground">Tổng cộng</span>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Đã bao gồm VAT</p>
                    </div>
                    <span className="text-3xl font-sans font-extrabold text-primary tracking-tighter">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => router.push("/checkout")}
                    className="w-full bg-primary text-primary-foreground py-5 rounded-md font-sans font-bold tracking-widest uppercase text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(133,55,36,0.2)]">
                    Tiến tới Thanh toán
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <Link
                    href="/"
                    className="w-full bg-card text-primary py-4 rounded-md font-sans font-bold tracking-wide hover:bg-white transition-all border border-primary/10 block text-center"
                  >
                    Tiếp tục Mua sắm
                  </Link>
                </div>

                <div className="mt-10 p-6 bg-secondary/20 rounded-lg border border-secondary/20">
                  <div className="flex gap-4 items-start">
                    <Leaf className="w-5 h-5 text-secondary-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-sans font-bold text-secondary-foreground">
                        Cam kết Bền vững
                      </p>
                      <p className="text-xs font-sans text-secondary-foreground mt-1 opacity-80 leading-relaxed italic">
                        Mỗi đơn hàng được đóng gói bằng 100% vật liệu tự hủy và phương thức vận chuyển trung hòa carbon.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
