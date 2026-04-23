"use client";

import { useState } from "react";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

interface PaymentFormProps {
  paymentIntentId: string;
  onSuccess: (orderId: string) => void;
}

export function PaymentForm({ paymentIntentId, onSuccess }: PaymentFormProps) {
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
        // Return URL is required, but we intercept it since we don't strictly redirect 
        // if we are doing synchronous handling (wait, confirmPayment redirects by default)
        // For synchronous flow without redirect, we use redirect: "if_required"
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      toast.error(error.message || "An unexpected error occurred during payment.");
      setIsProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      // Synchronous Verification Backend Call
      try {
        const response = await apiClient.post<{ success: boolean; orderId: string }>("/orders/confirm-payment", { paymentIntentId });
        toast.success("Thanh toán thành công! Đơn hàng đã được đặt.");
        if (response?.orderId) {
          onSuccess(response.orderId);
        } else {
          onSuccess("");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to verify payment with server.");
      }
    } else {
      toast.error("Payment requires further action or failed.");
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button
        disabled={isProcessing || !stripe || !elements}
        className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-headline font-bold text-lg hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
}
