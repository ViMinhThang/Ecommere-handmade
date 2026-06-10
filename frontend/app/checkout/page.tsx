"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { PaymentForm } from "@/components/checkout/payment-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useMe,
  useAddresses,
  useAddAddress,
  useCart,
  useGiftWrapTiers,
  useRewardBalance,
  cartKeys,
} from "@/lib/api/hooks";
import { cartApi } from "@/lib/api/cart";
import { ordersApi } from "@/lib/api/orders";
import { mediaApi } from "@/lib/api/media";
import { formatCurrency } from "@/lib/utils";
import type { Address } from "@/types";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { PersonalizationNote } from "@/components/storefront/personalization-note";
import { ProductOptionsNote } from "@/components/storefront/product-options-note";
import { ShippingEtaNote } from "@/components/storefront/shipping-eta-note";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Coins,
  Gift,
  MapPin,
  MessageSquareText,
  Plus,
  Tag,
  Ticket,
  X,
} from "lucide-react";

const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const isStripeConfigured =
  stripePublishableKey.startsWith("pk_") &&
  !stripePublishableKey.includes("REPLACE_WITH_REAL");
const stripePromise = isStripeConfigured
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null);

type CheckoutPaymentMethod = "STRIPE" | "COD";

type AddressFormData = Pick<
  Address,
  "fullName" | "phone" | "address" | "city" | "district" | "ward" | "isDefault"
>;

const emptyAddressFormData: AddressFormData = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  district: "",
  ward: "",
  isDefault: false,
};

function getErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.toLowerCase();

  if (normalized.includes("personalization")) {
    return "Một sản phẩm cần nội dung cá nhân hóa. Vui lòng quay lại sản phẩm hoặc giỏ hàng để kiểm tra.";
  }

  return message;
}

function getVoucherErrorMessage(error: unknown) {
  const message = getErrorMessage(error, "Không thể áp dụng mã giảm giá.");
  const normalized = message.toLowerCase();

  if (normalized.includes("expired")) {
    return "Mã giảm giá đã hết hạn.";
  }
  if (normalized.includes("inactive") || normalized.includes("not found")) {
    return "Mã giảm giá không hợp lệ hoặc chưa được kích hoạt.";
  }
  if (
    normalized.includes("cannot be applied") ||
    normalized.includes("category") ||
    normalized.includes("range") ||
    normalized.includes("min")
  ) {
    return "Đơn hàng chưa đủ điều kiện áp dụng mã giảm giá này.";
  }
  if (
    normalized.includes("usage limit") ||
    normalized.includes("limit has been reached")
  ) {
    return "Mã giảm giá đã hết lượt sử dụng.";
  }

  return message;
}

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useMe();
  const { data: addresses } = useAddresses(user?.id || "");
  const { mutate: addAddress, isPending: isSavingAddress } = useAddAddress();
  const { data: cart } = useCart();
  const { data: giftWrapTiers = [], isLoading: isGiftWrapTiersLoading } =
    useGiftWrapTiers();
  const { data: rewardBalance } = useRewardBalance(Boolean(user));

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutOrderId, setCheckoutOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>("COD");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    fullName: "",
    street: "",
    city: "",
    zipCode: "",
    district: "",
    ward: "",
  });
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [pendingAddressId, setPendingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressFormData, setAddressFormData] =
    useState<AddressFormData>(emptyAddressFormData);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [isRemovingVoucher, setIsRemovingVoucher] = useState(false);
  const [rewardPointsInput, setRewardPointsInput] = useState("");
  const [giftOptions, setGiftOptions] = useState({
    giftWrap: false,
    giftWrapTierId: "",
    giftCard: false,
    giftMessage: "",
  });

  const savedAddresses = addresses || [];
  const selectedAddress =
    savedAddresses.find((address) => address.id === selectedAddressId) || null;
  const selectedGiftWrapTier =
    giftWrapTiers.find((tier) => tier.id === giftOptions.giftWrapTierId) ||
    null;

  useEffect(() => {
    if (clientSecret || !giftOptions.giftWrap) {
      return;
    }

    if (giftWrapTiers.length === 0) {
      setGiftOptions((current) => ({
        ...current,
        giftWrapTierId: "",
      }));
      return;
    }

    if (!giftWrapTiers.some((tier) => tier.id === giftOptions.giftWrapTierId)) {
      setGiftOptions((current) => ({
        ...current,
        giftWrapTierId: giftWrapTiers[0].id,
        giftCard: current.giftCard || giftWrapTiers[0].includesCard,
      }));
    }
  }, [
    clientSecret,
    giftOptions.giftWrap,
    giftOptions.giftWrapTierId,
    giftWrapTiers,
  ]);

  useEffect(() => {
    if (!addresses || addresses.length === 0) {
      if (user) {
        setFormData((prev) => ({ ...prev, email: user.email }));
      }
      return;
    }

    const selectedAddressStillExists = addresses.some(
      (address) => address.id === selectedAddressId,
    );
    if (selectedAddressId && selectedAddressStillExists) {
      return;
    }

    const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];
    setSelectedAddressId(defaultAddress.id);
    setPendingAddressId(defaultAddress.id);
    setFormData((prev) => ({
      ...prev,
      fullName: defaultAddress.fullName,
      phone: defaultAddress.phone,
      street: defaultAddress.address,
      city: defaultAddress.city,
      district: defaultAddress.district,
      ward: defaultAddress.ward,
      email: user?.email || prev.email,
    }));
  }, [addresses, selectedAddressId, user]);

  const applyAddressToCheckout = (address: Address) => {
    setSelectedAddressId(address.id);
    setPendingAddressId(address.id);
    setFormData((prev) => ({
      ...prev,
      fullName: address.fullName,
      phone: address.phone,
      street: address.address,
      city: address.city,
      district: address.district,
      ward: address.ward,
      email: user?.email || prev.email,
    }));
  };

  const openAddressDialog = () => {
    setPendingAddressId(selectedAddressId);
    setShowAddressForm(savedAddresses.length === 0);
    setIsAddressDialogOpen(true);
  };

  const openNewAddressForm = () => {
    setAddressFormData({
      fullName: formData.fullName,
      phone: formData.phone,
      address: formData.street,
      city: formData.city,
      district: formData.district,
      ward: formData.ward,
      isDefault: savedAddresses.length === 0,
    });
    setShowAddressForm(true);
  };

  const handleUseSelectedAddress = () => {
    const address = savedAddresses.find((item) => item.id === pendingAddressId);
    if (!address) {
      toast.error("Vui lòng chọn một địa chỉ giao hàng.");
      return;
    }

    applyAddressToCheckout(address);
    setIsAddressDialogOpen(false);
  };

  const handleSaveNewAddress = (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      toast.error("Vui lòng đăng nhập để lưu địa chỉ.");
      return;
    }

    if (savedAddresses.length >= 5) {
      toast.error("Quý khách chỉ được lưu tối đa 5 địa chỉ.");
      return;
    }

    addAddress(
      { userId: user.id, data: addressFormData },
      {
        onSuccess: (address) => {
          applyAddressToCheckout(address);
          setAddressFormData(emptyAddressFormData);
          setShowAddressForm(false);
          setIsAddressDialogOpen(false);
          toast.success("Đã lưu và chọn địa chỉ mới.");
        },
        onError: (error) => {
          toast.error(error.message || "Không thể lưu địa chỉ.");
        },
      },
    );
  };

  useEffect(() => {
    if (user && !formData.email) {
      setFormData((prev) => ({ ...prev, email: user.email }));
    }
  }, [formData.email, user]);

  const handleApplyVoucher = async (event: React.FormEvent) => {
    event.preventDefault();

    if (clientSecret) {
      toast.error("Không thể đổi mã giảm giá sau khi đã tạo phiên thanh toán.");
      return;
    }

    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      const message = "Vui lòng nhập mã giảm giá.";
      setVoucherError(message);
      toast.error(message);
      return;
    }

    setIsApplyingVoucher(true);
    setVoucherError(null);

    try {
      const updatedCart = await cartApi.applyVoucher(code);
      queryClient.setQueryData(cartKeys.cart(), updatedCart);
      await queryClient.invalidateQueries({ queryKey: cartKeys.all });
      setVoucherCode("");
      toast.success(`Đã áp dụng mã ${updatedCart.appliedVoucher?.code || code}.`);
    } catch (error) {
      const message = getVoucherErrorMessage(error);
      setVoucherError(message);
      toast.error(message);
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = async () => {
    if (clientSecret) {
      toast.error("Không thể xóa mã giảm giá sau khi đã tạo phiên thanh toán.");
      return;
    }

    setIsRemovingVoucher(true);
    setVoucherError(null);

    try {
      const updatedCart = await cartApi.removeVoucher();
      queryClient.setQueryData(cartKeys.cart(), updatedCart);
      await queryClient.invalidateQueries({ queryKey: cartKeys.all });
      setVoucherCode("");
      toast.success("Đã xóa mã giảm giá.");
    } catch (error) {
      const message = getVoucherErrorMessage(error);
      setVoucherError(message);
      toast.error(message);
    } finally {
      setIsRemovingVoucher(false);
    }
  };

  const handleInitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === "STRIPE" && !isStripeConfigured) {
      toast.error(
        "Thanh toán thẻ trực tuyến chưa được cấu hình. Vui lòng chọn COD hoặc thiết lập khóa Stripe thử nghiệm.",
      );
      return;
    }

    if (giftOptions.giftWrap && !selectedGiftWrapTier) {
      toast.error("Vui lòng chọn mức gói quà trước khi đặt hàng.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await ordersApi.checkout({
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          city: formData.city,
          district: formData.district,
          ward: formData.ward,
          address: formData.street,
        },
        giftWrap: giftOptions.giftWrap,
        giftWrapTierId: giftOptions.giftWrap
          ? giftOptions.giftWrapTierId
          : undefined,
        giftCard:
          giftOptions.giftCard ||
          giftOptions.giftMessage.trim().length > 0 ||
          Boolean(selectedGiftWrapTier?.includesCard),
        giftMessage: giftOptions.giftMessage.trim() || undefined,
        paymentMethod,
        rewardPointsToRedeem,
      });

      if (!data?.orderId) {
        throw new Error("Phản hồi thanh toán thiếu mã đơn hàng.");
      }

      if (data.paymentMethod === "COD" || data.requiresPayment === false) {
        toast.success("Đặt hàng thanh toán khi nhận hàng thành công.");
        router.push(`/orders/${data.orderId}/confirmation`);
        return;
      }

      if (!data.clientSecret) {
        throw new Error("Phản hồi thanh toán thiếu dữ liệu thanh toán.");
      }

      setClientSecret(data.clientSecret);
      setCheckoutOrderId(data.orderId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể khởi tạo thanh toán."));
    } finally {
      setIsLoading(false);
    }
  };

  const paymentIntentId = clientSecret?.split("_secret")[0] || "";

  const options: StripeElementsOptions = {
    clientSecret: clientSecret || "",
    appearance: {
      theme: "flat",
      variables: {
        colorPrimary: "#8B4513",
        colorBackground: "#ffffff",
        colorText: "#1c1917",
        borderRadius: "0px",
      },
      rules: {
        ".Input": {
          border: "1px solid #e1e0da",
        },
      },
    },
  };

  const subtotal = cart?.subtotal || 0;
  const discountAmount = cart?.discountAmount || 0;
  const productOriginalSubtotal =
    cart?.items.reduce(
      (sum, item) =>
        sum +
        (item.pricing?.originalPrice ?? Number(item.product.price)) *
          item.quantity,
      0,
    ) || subtotal;
  const flashSaleDiscountAmount = Math.max(
    0,
    productOriginalSubtotal - subtotal,
  );
  const voucherDiscountAmount =
    cart?.appliedVoucher?.discountAmount ?? discountAmount;
  const shipping = 25000;
  const giftWrapFee =
    giftOptions.giftWrap && selectedGiftWrapTier
      ? Number(selectedGiftWrapTier.price)
      : 0;
  const baseTotal = (cart?.total || 0) + shipping + giftWrapFee;
  const redeemVndPerPoint = rewardBalance?.redeemVndPerPoint ?? 1000;
  const earnVndPerPoint = rewardBalance?.earnVndPerPoint ?? 10000;
  const rewardBalancePoints = rewardBalance?.balance ?? 0;
  const requestedRewardPoints = Math.max(
    0,
    Math.floor(Number(rewardPointsInput) || 0),
  );
  const maxRewardPointsByOrder = Math.max(
    0,
    Math.ceil(baseTotal / redeemVndPerPoint) - 1,
  );
  const rewardPointsToRedeem = Math.min(
    requestedRewardPoints,
    rewardBalancePoints,
    maxRewardPointsByOrder,
  );
  const rewardDiscountAmount = rewardPointsToRedeem * redeemVndPerPoint;
  const total = Math.max(0, baseTotal - rewardDiscountAmount);
  const earnedRewardPoints = Math.floor(total / earnVndPerPoint);
  const isVoucherActionPending = isApplyingVoucher || isRemovingVoucher;
  const hasGiftSelection =
    giftOptions.giftWrap ||
    giftOptions.giftCard ||
    giftOptions.giftMessage.trim().length > 0;
  const isCheckoutLocked = Boolean(clientSecret);

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="font-headline text-3xl italic mb-4">
          Giỏ hàng của quý khách đang trống
        </h2>
        <button
          onClick={() => router.push("/")}
          className="text-[#8B4513] underline font-medium"
        >
          Tiếp tục khám phá
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6F1] text-stone-800 font-body">
      <style jsx global>{`
        .custom-input {
          background: transparent;
          border-bottom: 1px solid #d1d5db;
          padding: 0.5rem 0;
          width: 100%;
          transition: border-color 0.2s;
        }
        .custom-input:focus {
          outline: none;
          border-bottom-color: #8b4513;
        }
        .custom-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          font-weight: 700;
        }
      `}</style>

      <header className="bg-[#F8F6F1] border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <h1 className="font-headline text-2xl italic text-[#8B4513] tracking-tight">
            Chợ Thủ Công
          </h1>
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-stone-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pt-12">
        <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 sm:gap-6 sm:text-xs sm:tracking-[0.2em]">
          <div
            className={`flex items-center ${!clientSecret ? "text-[#8B4513]" : "text-stone-400"}`}
          >
            <span
              className={`mr-2 flex h-8 w-8 items-center justify-center rounded-full font-headline italic sm:mr-3 ${!clientSecret ? "bg-[#8B4513] text-white" : "border border-stone-300"}`}
            >
              1
            </span>
            <span>Thông tin</span>
          </div>
          <div className="hidden h-px w-10 bg-stone-300 sm:block"></div>
          <div
            className={`flex items-center ${clientSecret ? "text-[#8B4513]" : "text-stone-400"}`}
          >
            <span
              className={`mr-2 flex h-8 w-8 items-center justify-center rounded-full font-headline italic sm:mr-3 ${clientSecret ? "bg-[#8B4513] text-white" : "border border-stone-300"}`}
            >
              2
            </span>
            <span>Thanh toán</span>
          </div>
          <div className="hidden h-px w-10 bg-stone-300 sm:block"></div>
          <div className="flex items-center">
            <span className="mr-2 flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 font-headline italic sm:mr-3">
              3
            </span>
            <span>Hoàn tất</span>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:py-16">
        <div className="min-w-0 lg:col-span-7">
          {!clientSecret ? (
            <form
              onSubmit={handleInitCheckout}
              className="space-y-12 animate-in fade-in duration-700"
            >
              <section>
                <h2 className="font-headline text-3xl italic mb-8">
                  Thông tin liên hệ
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="custom-label">Địa chỉ email</label>
                    <input
                      type="email"
                      required
                      placeholder="ten@example.com"
                      className="custom-input"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
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
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-headline text-3xl italic mb-8">
                  Địa chỉ giao hàng
                </h2>
                <div className="mb-8 rounded-sm border border-[#8B4513]/20 bg-white/70 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                        <MapPin className="h-4 w-4 text-[#8B4513]" />
                        Địa chỉ nhận hàng
                      </div>
                      {selectedAddress ? (
                        <div className="space-y-1 text-sm">
                          <p className="font-bold text-stone-900">
                            {selectedAddress.fullName}{" "}
                            <span className="font-medium text-stone-500">
                              {selectedAddress.phone}
                            </span>
                          </p>
                          <p className="text-stone-600">
                            {selectedAddress.address}, {selectedAddress.ward},{" "}
                            {selectedAddress.district}, {selectedAddress.city}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-stone-500">
                          Chưa chọn địa chỉ đã lưu. Quý khách có thể nhập mới
                          bên dưới.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={openAddressDialog}
                      className="shrink-0 rounded-sm border border-[#8B4513] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B4513] transition-colors hover:bg-[#8B4513] hover:text-white"
                    >
                      {savedAddresses.length > 0
                        ? "Chọn địa chỉ"
                        : "Thêm địa chỉ"}
                    </button>
                  </div>
                </div>
                <div className="space-y-8">
                  <div>
                    <label className="custom-label">Họ và tên</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      className="custom-input"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
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
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                      <label className="custom-label">Tỉnh / Thành phố</label>
                      <input
                        type="text"
                        required
                        placeholder="TP. Hồ Chí Minh"
                        className="custom-input"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
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
                        onChange={(e) =>
                          setFormData({ ...formData, district: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="custom-label">Phường / Xã</label>
                      <input
                        type="text"
                        required
                        placeholder="Phường Bến Nghé"
                        className="custom-input"
                        value={formData.ward}
                        onChange={(e) =>
                          setFormData({ ...formData, ward: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="custom-label">Mã bưu điện</label>
                      <input
                        type="text"
                        placeholder="70000"
                        className="custom-input"
                        value={formData.zipCode}
                        onChange={(e) =>
                          setFormData({ ...formData, zipCode: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-headline text-3xl italic mb-8">
                  Gói quà / thiệp
                </h2>
                <div className="space-y-4 rounded-sm border border-stone-200 bg-white/70 p-5">
                  <label className="flex cursor-pointer items-start gap-4 rounded-sm border border-stone-200 bg-[#F8F6F1]/60 p-4">
                    <input
                      type="checkbox"
                      checked={giftOptions.giftWrap}
                      disabled={isCheckoutLocked}
                      onChange={(event) =>
                        setGiftOptions((current) => ({
                          ...current,
                          giftWrap: event.target.checked,
                          giftWrapTierId: event.target.checked
                            ? current.giftWrapTierId ||
                              giftWrapTiers[0]?.id ||
                              ""
                            : "",
                          giftCard: event.target.checked
                            ? current.giftCard ||
                              Boolean(giftWrapTiers[0]?.includesCard)
                            : current.giftCard,
                        }))
                      }
                      className="mt-1"
                    />
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                        <Gift className="h-4 w-4 text-[#8B4513]" />
                        Gói quà thủ công
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Chọn kiểu gói quà phù hợp với sản phẩm handmade. Phí gói quà sẽ được cộng vào tổng thanh toán.
                      </p>
                    </div>
                  </label>

                  {giftOptions.giftWrap && (
                    <div className="space-y-3 rounded-sm border border-amber-200 bg-amber-50/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-stone-900">
                          Chọn mức gói quà
                        </p>
                        {giftWrapFee > 0 ? (
                          <span className="text-xs font-semibold text-[#8B4513]">
                            +{formatCurrency(giftWrapFee)}
                          </span>
                        ) : null}
                      </div>

                      {isGiftWrapTiersLoading ? (
                        <p className="text-xs text-stone-500">
                          Đang tải danh sách gói quà...
                        </p>
                      ) : giftWrapTiers.length === 0 ? (
                        <p className="text-xs text-amber-700">
                          Hiện chưa có mức gói quà khả dụng. Vui lòng bỏ chọn gói quà hoặc thử lại sau.
                        </p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {giftWrapTiers.map((tier) => {
                            const selected =
                              giftOptions.giftWrapTierId === tier.id;

                            return (
                              <button
                                key={tier.id}
                                type="button"
                                disabled={isCheckoutLocked}
                                onClick={() =>
                                  setGiftOptions((current) => ({
                                    ...current,
                                    giftWrap: true,
                                    giftWrapTierId: tier.id,
                                    giftCard:
                                      current.giftCard || tier.includesCard,
                                  }))
                                }
                                className={`rounded-sm border p-4 text-left transition ${
                                  selected
                                    ? "border-[#8B4513] bg-white shadow-sm"
                                    : "border-stone-200 bg-white/70 hover:border-[#8B4513]/50"
                                } ${isCheckoutLocked ? "cursor-not-allowed opacity-70" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-stone-900">
                                      {tier.name}
                                    </p>
                                    {tier.description ? (
                                      <p className="mt-1 text-xs leading-5 text-stone-500">
                                        {tier.description}
                                      </p>
                                    ) : null}
                                  </div>
                                  <span className="shrink-0 text-sm font-semibold text-[#8B4513]">
                                    {formatCurrency(Number(tier.price))}
                                  </span>
                                </div>
                                {tier.includesCard ? (
                                  <p className="mt-2 text-[11px] font-medium text-amber-700">
                                    Đã gồm thiệp viết tay
                                  </p>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <label className="flex cursor-pointer items-start gap-4 rounded-sm border border-stone-200 bg-[#F8F6F1]/60 p-4">
                    <input
                      type="checkbox"
                      checked={giftOptions.giftCard}
                      disabled={isCheckoutLocked}
                      onChange={(event) =>
                        setGiftOptions((current) => ({
                          ...current,
                          giftCard: event.target.checked,
                        }))
                      }
                      className="mt-1"
                    />
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                        <MessageSquareText className="h-4 w-4 text-[#8B4513]" />
                        Thiệp viết tay
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Thêm thiệp nhỏ kèm lời nhắn cho người nhận.
                      </p>
                    </div>
                  </label>

                  <div className="space-y-2">
                    <Label htmlFor="gift-message">Lời nhắn tặng kèm</Label>
                    <Textarea
                      id="gift-message"
                      value={giftOptions.giftMessage}
                      maxLength={500}
                      rows={4}
                      disabled={isCheckoutLocked}
                      placeholder="Ví dụ: Chúc mừng sinh nhật, mong món quà nhỏ này làm bạn vui..."
                      onChange={(event) => {
                        const value = event.target.value.slice(0, 500);
                        setGiftOptions((current) => ({
                          ...current,
                          giftCard: current.giftCard || value.trim().length > 0,
                          giftMessage: value,
                        }));
                      }}
                      className="bg-white"
                    />
                    <p className="text-right text-[11px] text-stone-500">
                      {giftOptions.giftMessage.length}/500 ký tự
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="font-headline text-3xl italic mb-8">
                  Phương thức thanh toán
                </h2>
                <div className="space-y-4">
                  <label className="flex items-start gap-4 border border-stone-200 rounded-sm p-4 cursor-pointer bg-white/70">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        Thanh toán khi nhận hàng (COD)
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        Đặt hàng ngay và thanh toán khi đơn được giao tới.
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-4 border border-stone-200 rounded-sm p-4 bg-white/70 ${
                      isStripeConfigured
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-70"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="STRIPE"
                      checked={paymentMethod === "STRIPE"}
                      onChange={() => setPaymentMethod("STRIPE")}
                      disabled={!isStripeConfigured}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-semibold text-stone-900">
                        Thanh toán thẻ trực tuyến (Stripe)
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        {isStripeConfigured
                          ? "Thanh toán trực tuyến qua biểu mẫu Stripe bảo mật."
                          : "Chưa cấu hình Stripe local, demo sẽ dùng COD."}
                      </p>
                    </div>
                  </label>
                  {paymentMethod === "STRIPE" && !isStripeConfigured && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-sm p-3">
                      Thanh toán thẻ trực tuyến chưa được cấu hình. Vui lòng
                      chọn COD hoặc thiết lập khóa Stripe thử nghiệm.
                    </p>
                  )}
                </div>
              </section>

              <div className="pt-8">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#8B4513] text-white px-10 py-5 rounded-sm flex items-center hover:bg-[#6F3610] transition-colors disabled:opacity-50 text-sm font-bold uppercase tracking-widest"
                >
                  {isLoading ? "Đang xử lý..." : "Tiếp tục thanh toán"}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 ml-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-12 animate-in zoom-in-95 duration-500">
              <section>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="font-headline text-3xl italic">
                    Thông tin thanh toán
                  </h2>
                  <button
                    onClick={() => {
                      setClientSecret(null);
                      setCheckoutOrderId("");
                    }}
                    className="text-xs uppercase tracking-widest font-bold text-stone-400 hover:text-primary transition-colors"
                  >
                    Sửa địa chỉ
                  </button>
                </div>
                <div className="bg-white p-8 rounded-sm shadow-sm border border-stone-200">
                  <Elements
                    key={clientSecret}
                    stripe={stripePromise}
                    options={options}
                  >
                    <PaymentForm
                      orderId={checkoutOrderId}
                      paymentIntentId={paymentIntentId}
                      onPaymentElementError={(message) => {
                        toast.error(message);
                      }}
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

        <div className="min-w-0 lg:col-span-5">
          <div className="rounded-md border border-stone-200/60 bg-stone-100/50 p-5 shadow-sm sm:p-8 lg:sticky lg:top-32 lg:p-10">
            <h2 className="font-headline text-2xl italic mb-10">
              Tóm tắt đơn hàng
            </h2>

            <div className="mb-10 space-y-6">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[80px_minmax(0,1fr)] gap-4"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-sm border border-stone-200 bg-stone-200">
                    {item.product.images?.[0] && (
                      <SafeImage
                        src={mediaApi.getImageUrl(item.product.images[0].url)}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    )}
                    <span className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-stone-800 text-[10px] text-white">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-stone-900">
                        {item.product.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-tight text-stone-500">
                        Mã sản phẩm: {item.product.sku || "Chưa có"}
                      </p>
                      <PersonalizationNote
                        personalization={item.personalization}
                        compact
                        className="bg-white/80"
                      />
                      <ProductOptionsNote
                        selectedOptions={item.selectedOptions}
                        compact
                        className="bg-white/80"
                      />
                      <ShippingEtaNote
                        profile={item.product.shippingProfile}
                        compact
                        className="bg-white/80"
                      />
                    </div>
                    <p className="mt-2 inline-flex shrink-0 whitespace-nowrap text-right font-headline text-lg italic text-[#8B4513] sm:mt-0">
                      {formatCurrency(
                        (item.pricing?.discountedPrice ??
                          Number(item.product.price)) * item.quantity,
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-8 border-t border-stone-200/60 text-sm">
              <div className="space-y-4 rounded-sm border border-[#8B4513]/15 bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-[#8B4513]" />
                    <span className="font-semibold text-stone-900">
                      Mã giảm giá
                    </span>
                  </div>
                  {cart.appliedVoucher && (
                    <span className="rounded-full bg-[#8B4513]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8B4513]">
                      Đang áp dụng
                    </span>
                  )}
                </div>

                {cart.appliedVoucher ? (
                  <div className="rounded-sm border border-[#8B4513]/20 bg-[#8B4513]/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 shrink-0 text-[#8B4513]" />
                          <span className="truncate font-bold uppercase text-[#8B4513]">
                            {cart.appliedVoucher.code}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          Đã giảm {formatCurrency(voucherDiscountAmount)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        disabled={isVoucherActionPending || Boolean(clientSecret)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-stone-200 bg-white text-stone-500 transition-colors hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Xóa mã giảm giá"
                      >
                        {isRemovingVoucher ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-[#8B4513]" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleApplyVoucher} className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={voucherCode}
                        onChange={(event) => {
                          setVoucherCode(event.target.value.toUpperCase());
                          setVoucherError(null);
                        }}
                        disabled={isVoucherActionPending || Boolean(clientSecret)}
                        placeholder="Nhập mã giảm giá"
                        className="h-11 bg-white"
                      />
                      <Button
                        type="submit"
                        disabled={
                          isVoucherActionPending ||
                          Boolean(clientSecret) ||
                          !voucherCode.trim()
                        }
                        className="h-11 shrink-0 rounded-sm bg-[#8B4513] px-5 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#6F3610]"
                      >
                        {isApplyingVoucher ? "Đang áp dụng..." : "Áp dụng"}
                      </Button>
                    </div>
                    {voucherError && (
                      <p className="text-xs font-medium text-red-600">
                        {voucherError}
                      </p>
                    )}
                    {clientSecret && (
                      <p className="text-xs text-stone-500">
                        Phiên thanh toán đã được tạo, không thể đổi mã giảm giá
                        ở bước này.
                      </p>
                    )}
                  </form>
                )}
              </div>

              <div className="space-y-4 rounded-sm border border-amber-200 bg-amber-50/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-700" />
                    <span className="font-semibold text-stone-900">
                      Điểm thưởng
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-amber-800">
                    {rewardBalancePoints} điểm
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="number"
                    min={0}
                    max={Math.min(rewardBalancePoints, maxRewardPointsByOrder)}
                    value={rewardPointsInput}
                    disabled={isCheckoutLocked || rewardBalancePoints <= 0}
                    placeholder="Số điểm muốn dùng"
                    className="h-11 bg-white"
                    onChange={(event) =>
                      setRewardPointsInput(event.target.value.replace(/\D/g, ""))
                    }
                    onBlur={() =>
                      setRewardPointsInput(
                        rewardPointsToRedeem > 0
                          ? String(rewardPointsToRedeem)
                          : "",
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCheckoutLocked || rewardBalancePoints <= 0}
                    className="h-11 shrink-0 rounded-sm border-amber-300 bg-white px-5 text-xs font-bold uppercase tracking-widest text-amber-800 hover:bg-amber-100"
                    onClick={() =>
                      setRewardPointsInput(
                        String(Math.min(rewardBalancePoints, maxRewardPointsByOrder)),
                      )
                    }
                  >
                    Dùng tối đa
                  </Button>
                </div>

                <div className="space-y-1 text-xs text-amber-900/80">
                  <p>
                    {rewardPointsToRedeem > 0
                      ? `Đổi ${rewardPointsToRedeem} điểm, giảm ${formatCurrency(rewardDiscountAmount)}.`
                      : `1 điểm = ${formatCurrency(redeemVndPerPoint)} giảm giá.`}
                  </p>
                  <p>
                    Đơn này sẽ nhận {earnedRewardPoints} điểm sau khi hoàn tất.
                  </p>
                </div>
              </div>

              {hasGiftSelection && (
                <div className="rounded-sm border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Gift className="h-4 w-4" />
                    Gói quà / thiệp tặng kèm
                  </div>
                  <div className="space-y-1 text-amber-900/80">
                    {giftOptions.giftWrap && selectedGiftWrapTier ? (
                      <p>
                        {selectedGiftWrapTier.name} (+{formatCurrency(giftWrapFee)})
                      </p>
                    ) : giftOptions.giftWrap ? (
                      <p>Gói quà thủ công</p>
                    ) : null}
                    {(giftOptions.giftCard ||
                      giftOptions.giftMessage.trim().length > 0 ||
                      selectedGiftWrapTier?.includesCard) && (
                      <p>Thiệp viết tay</p>
                    )}
                    {giftOptions.giftMessage.trim() ? (
                      <p className="break-words">
                        Lời nhắn: {giftOptions.giftMessage.trim()}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {flashSaleDiscountAmount > 0 && (
                <div className="flex items-center justify-between gap-4 text-emerald-700">
                  <span className="font-medium">Ưu đãi Flash sale</span>
                  <span className="shrink-0 whitespace-nowrap font-semibold">
                    -{formatCurrency(flashSaleDiscountAmount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-stone-500 font-medium">Tạm tính</span>
                <span className="shrink-0 whitespace-nowrap font-semibold">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {voucherDiscountAmount > 0 && (
                <div className="flex items-center justify-between gap-4 text-[#8B4513]">
                  <span className="font-medium">
                    Giảm giá ({cart.appliedVoucher?.code})
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-semibold">
                    -{formatCurrency(voucherDiscountAmount)}
                  </span>
                </div>
              )}
              {rewardDiscountAmount > 0 && (
                <div className="flex items-center justify-between gap-4 text-amber-700">
                  <span className="font-medium">
                    Đổi điểm thưởng ({rewardPointsToRedeem} điểm)
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-semibold">
                    -{formatCurrency(rewardDiscountAmount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <span className="text-stone-500 font-medium">
                  Phí vận chuyển
                </span>
                <span className="shrink-0 whitespace-nowrap font-semibold">
                  {formatCurrency(shipping)}
                </span>
              </div>
              {giftWrapFee > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-stone-500 font-medium">
                    Phí gói quà
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-semibold">
                    {formatCurrency(giftWrapFee)}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-12 flex flex-col">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-stone-400">
                  Tổng thanh toán
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <span className="inline-flex shrink-0 whitespace-nowrap font-headline text-3xl italic text-[#8B4513] sm:text-4xl">
                  {formatCurrency(total)}
                </span>
                <span className="text-[9px] text-stone-400 uppercase font-bold tracking-widest sm:text-right">
                  Đã bao gồm thuế
                </span>
              </div>
            </div>

            <div className="mt-8 space-y-3 border-t border-stone-200/60 pt-6">
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0 text-[#8B4513]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Thanh toán bảo mật và mã hóa</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0 text-[#8B4513]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span>Vật liệu đóng gói bền vững</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-sm bg-[#F8F6F1] p-0 sm:max-w-[720px]">
          <div className="p-6 md:p-8">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl italic text-[#8B4513]">
                Chọn địa chỉ giao hàng
              </DialogTitle>
              <DialogDescription>
                Chọn một địa chỉ đã lưu hoặc thêm địa chỉ mới cho đơn hàng này.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-3">
              {savedAddresses.length > 0 ? (
                savedAddresses.map((address) => {
                  const isSelected = pendingAddressId === address.id;

                  return (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => setPendingAddressId(address.id)}
                      className={`w-full rounded-sm border bg-white p-4 text-left transition-all ${
                        isSelected
                          ? "border-[#8B4513] shadow-[0_12px_30px_-24px_rgba(139,69,19,0.7)]"
                          : "border-stone-200 hover:border-[#8B4513]/40"
                      }`}
                    >
                      <div className="flex gap-4">
                        <span
                          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-[#8B4513] bg-[#8B4513]"
                              : "border-stone-300"
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-stone-900">
                              {address.fullName}
                            </span>
                            <span className="text-sm text-stone-500">
                              {address.phone}
                            </span>
                            {address.isDefault && (
                              <span className="rounded-full bg-[#8B4513]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#8B4513]">
                                Mặc định
                              </span>
                            )}
                          </span>
                          <span className="block text-sm leading-relaxed text-stone-600">
                            {address.address}, {address.ward},{" "}
                            {address.district}, {address.city}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-sm border border-dashed border-stone-300 bg-white/70 p-8 text-center">
                  <MapPin className="mx-auto mb-3 h-8 w-8 text-[#8B4513]" />
                  <p className="text-sm text-stone-500">
                    Quý khách chưa có địa chỉ nào được lưu.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-stone-200 pt-6">
              <button
                type="button"
                onClick={openNewAddressForm}
                disabled={savedAddresses.length >= 5}
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B4513] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Thêm địa chỉ mới ({savedAddresses.length}/5)
              </button>

              {showAddressForm && (
                <form
                  onSubmit={handleSaveNewAddress}
                  className="mt-6 space-y-5 rounded-sm border border-stone-200 bg-white/80 p-5"
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-full-name">Họ và tên</Label>
                      <Input
                        id="checkout-full-name"
                        value={addressFormData.fullName}
                        onChange={(event) =>
                          setAddressFormData({
                            ...addressFormData,
                            fullName: event.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-phone">Số điện thoại</Label>
                      <Input
                        id="checkout-phone"
                        value={addressFormData.phone}
                        onChange={(event) =>
                          setAddressFormData({
                            ...addressFormData,
                            phone: event.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-city">Tỉnh / Thành phố</Label>
                      <Input
                        id="checkout-city"
                        value={addressFormData.city}
                        onChange={(event) =>
                          setAddressFormData({
                            ...addressFormData,
                            city: event.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-district">Quận / Huyện</Label>
                      <Input
                        id="checkout-district"
                        value={addressFormData.district}
                        onChange={(event) =>
                          setAddressFormData({
                            ...addressFormData,
                            district: event.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-ward">Phường / Xã</Label>
                      <Input
                        id="checkout-ward"
                        value={addressFormData.ward}
                        onChange={(event) =>
                          setAddressFormData({
                            ...addressFormData,
                            ward: event.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="checkout-address">Địa chỉ cụ thể</Label>
                    <Input
                      id="checkout-address"
                      value={addressFormData.address}
                      onChange={(event) =>
                        setAddressFormData({
                          ...addressFormData,
                          address: event.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    <input
                      type="checkbox"
                      checked={addressFormData.isDefault}
                      onChange={(event) =>
                        setAddressFormData({
                          ...addressFormData,
                          isDefault: event.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-stone-300 text-[#8B4513]"
                    />
                    Đặt làm địa chỉ mặc định
                  </label>

                  <Button
                    type="submit"
                    disabled={isSavingAddress}
                    className="w-full"
                  >
                    {isSavingAddress
                      ? "Đang lưu..."
                      : "Lưu và dùng địa chỉ này"}
                  </Button>
                </form>
              )}
            </div>
          </div>

          <DialogFooter className="rounded-none bg-white px-6 py-4 md:px-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddressDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleUseSelectedAddress}
              disabled={!pendingAddressId}
            >
              Dùng địa chỉ này
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="bg-[#EAE7E0] mt-24 py-20 border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-16">
          <div>
            <h3 className="font-headline italic text-2xl text-[#8B4513] mb-6">
              Chợ Thủ Công
            </h3>
            <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
              Kết nối những người sưu tầm tinh tế với những người bán tâm huyết
              nhất thế giới từ năm 2024.
            </p>
            <p className="text-[10px] text-stone-400 mt-16 uppercase tracking-widest font-bold">
              &copy; 2024 Chợ Thủ Công. Chế tác với tâm hồn.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-12 text-[10px] uppercase tracking-[0.2em] font-extrabold text-stone-600 pt-2">
            <div className="space-y-6">
              <a
                href="#"
                className="block hover:text-[#8B4513] transition-colors"
              >
                Vận chuyển & Đổi trả
              </a>
              <a
                href="#"
                className="block hover:text-[#8B4513] transition-colors"
              >
                Tính Bền vững
              </a>
            </div>
            <div className="space-y-6">
              <a
                href="#"
                className="block hover:text-[#8B4513] transition-colors"
              >
                Câu chuyện Người bán
              </a>
              <a
                href="#"
                className="block hover:text-[#8B4513] transition-colors"
              >
                Quyền riêng tư
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
