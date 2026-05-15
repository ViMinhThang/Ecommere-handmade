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
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function PaymentForm({
  orderId,
  paymentIntentId,
  onSuccess,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: "if_required",
    });

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
      <PaymentElement />
      <button
        disabled={isProcessing || !stripe || !elements}
        className="w-full rounded-md bg-primary py-4 text-lg font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
      >
        {isProcessing ? "Đang xử lý..." : "Thanh toán ngay"}
      </button>
    </form>
  );
}
