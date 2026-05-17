"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { ordersApi } from "@/lib/api/orders";

interface PaymentFormProps {
  orderId: string;
  paymentIntentId: string;
  onSuccess: (orderId: string) => void;
  onPaymentElementError?: (message: string) => void;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getStripeUiErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("client_secret") &&
    normalizedMessage.includes("paymentintent")
  ) {
    return "Cấu hình Stripe không khớp. Vui lòng chọn COD hoặc kiểm tra lại cặp NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY và STRIPE_SECRET_KEY rồi restart frontend/backend.";
  }

  if (
    normalizedMessage.includes("mounted payment element") ||
    normalizedMessage.includes("express checkout element")
  ) {
    return "Biểu mẫu Stripe chưa tải được. Vui lòng tải lại trang, chọn COD, hoặc kiểm tra cấu hình Stripe.";
  }

  return message;
}

export function PaymentForm({
  orderId,
  paymentIntentId,
  onSuccess,
  onPaymentElementError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentElementError, setPaymentElementError] = useState<string | null>(
    null,
  );

  const handlePaymentElementError = (event: {
    error?: { message?: string };
  }) => {
    const message = getStripeUiErrorMessage(
      event.error?.message ||
        "Không thể tải biểu mẫu thanh toán Stripe. Vui lòng kiểm tra cấu hình Stripe hoặc chọn COD.",
    );

    setPaymentElementError(message);
    setIsProcessing(false);
    onPaymentElementError?.(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (paymentElementError) {
      toast.error(paymentElementError);
      return;
    }

    setIsProcessing(true);

    let confirmResult;
    try {
      confirmResult = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: "if_required",
      });
    } catch (error) {
      toast.error(
        getStripeUiErrorMessage(
          getErrorMessage(error, "Không thể xử lý thanh toán với Stripe."),
        ),
      );
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = confirmResult;

    if (error) {
      toast.error(error.message || "Không thể xử lý thanh toán.");
      setIsProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      try {
        const response = await ordersApi.confirmPayment(paymentIntentId);
        toast.success("Thanh toán thành công! Đơn hàng đã được đặt.");
        const confirmedOrderId = response?.orderId || orderId;
        if (!confirmedOrderId) {
          toast.error("Thanh toán đã xác nhận nhưng thiếu mã đơn hàng.");
          setIsProcessing(false);
          return;
        }

        onSuccess(confirmedOrderId);
      } catch (error) {
        toast.error(
          getErrorMessage(error, "Không thể xác nhận thanh toán với hệ thống."),
        );
      }
    } else {
      toast.error("Thanh toán cần xác thực thêm hoặc đã thất bại.");
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        onReady={() => setPaymentElementError(null)}
        onLoadError={handlePaymentElementError}
      />
      {paymentElementError && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {paymentElementError}
        </div>
      )}
      <button
        disabled={isProcessing || !stripe || !elements || !!paymentElementError}
        className="w-full rounded-md bg-primary py-4 text-lg font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
      >
        {isProcessing ? "Đang xử lý..." : "Thanh toán ngay"}
      </button>
    </form>
  );
}
