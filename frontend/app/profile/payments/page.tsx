"use client";

import Link from "next/link";
import { CreditCard, Loader2, ReceiptText, RotateCcw } from "lucide-react";
import { usePaymentHistory } from "@/lib/api/hooks";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  COD_PENDING: "Chờ thu COD",
  FAILED: "Thất bại",
  PARTIALLY_REFUNDED: "Hoàn tiền một phần",
  REFUNDED: "Đã hoàn tiền",
};

const methodLabel: Record<string, string> = {
  STRIPE: "Stripe",
  COD: "Thanh toán khi nhận hàng",
};

export default function PaymentsPage() {
  const { data: payments, isLoading } = usePaymentHistory();
  const items = payments || [];

  return (
    <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h1 className="text-3xl font-serif font-bold text-primary mb-2">
          Phương thức thanh toán
        </h1>
        <p className="text-foreground/70 italic">
          Lịch sử thanh toán và hoàn tiền. Nền tảng không lưu thông tin thẻ của
          quý khách.
        </p>
      </div>

      <section className="rounded-lg border border-primary/20 bg-primary/5 p-6 mb-8">
        <div className="flex items-start gap-4">
          <CreditCard className="mt-1 h-5 w-5 text-primary" />
          <div>
            <h2 className="font-serif text-xl font-bold text-primary">
              Thanh toán an toàn qua Stripe
            </h2>
            <p className="mt-2 text-sm text-foreground/70">
              Dữ liệu thẻ được xử lý bởi Stripe. HandCraft Market chỉ lưu trạng
              thái thanh toán, mã giao dịch và lịch sử hoàn tiền.
            </p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex h-[320px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-card p-12 text-center">
          <ReceiptText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <p className="font-serif text-lg italic text-muted-foreground">
            Chưa có giao dịch thanh toán nào.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card text-card-foreground shadow-sm">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-4 border-b border-border/50 bg-accent/45 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-foreground/70">
            <span>Giao dịch</span>
            <span>Phương thức</span>
            <span>Trạng thái</span>
            <span className="text-right">Số tiền</span>
          </div>
          {items.map((item) => {
            const href =
              item.source === "ORDER"
                ? `/orders/${item.sourceId}/confirmation`
                : `/custom-orders/${item.sourceId}/review`;

            return (
              <Link
                key={item.id}
                href={href}
                className="grid grid-cols-1 gap-3 border-b border-border/30 px-6 py-5 transition-colors last:border-b-0 hover:bg-accent/35 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:gap-4"
              >
                <div>
                  <p className="font-serif text-lg font-bold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {methodLabel[item.paymentMethod] || item.paymentMethod}
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">
                    {statusLabel[item.paymentStatus] || item.paymentStatus}
                  </p>
                  {item.refundedAmount > 0 && (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <RotateCcw className="h-3 w-3" />
                      Đã hoàn {formatCurrency(item.refundedAmount)}
                    </p>
                  )}
                </div>
                <p className="text-left font-bold text-foreground md:text-right">
                  {formatCurrency(item.amount)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
