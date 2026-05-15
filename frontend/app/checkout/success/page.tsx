"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { ordersApi } from "@/lib/api/orders";
import { Button } from "@/components/ui/button";

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function confirmPayment() {
      if (!paymentIntentId) {
        setError("Thiếu mã thanh toán từ Stripe.");
        return;
      }

      try {
        const result = await ordersApi.confirmPayment(paymentIntentId);
        if (!isMounted) {
          return;
        }
        router.replace(`/orders/${result.orderId}/confirmation`);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Không thể xác nhận thanh toán.",
        );
      }
    }

    void confirmPayment();

    return () => {
      isMounted = false;
    };
  }, [paymentIntentId, router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md space-y-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">
              Thanh toán chưa được xác nhận
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => router.replace("/profile/orders")}>
            Xem đơn hàng của tôi
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-6 text-center">
        <div className="relative mx-auto h-12 w-12">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <Loader2 className="absolute inset-2 h-8 w-8 animate-spin text-primary/40" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-primary">
            Đang xác nhận thanh toán
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Vui lòng giữ nguyên trang trong giây lát.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
