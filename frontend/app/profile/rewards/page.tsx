"use client";

import { useRewardBalance, useRewardLedger } from "@/lib/api/hooks";
import { formatCurrency } from "@/lib/utils";
import { Coins, Loader2, Sparkles } from "lucide-react";

const typeLabels: Record<string, string> = {
  EARN: "Cộng điểm",
  REDEEM: "Đổi điểm",
  REFUND: "Hoàn điểm",
  ADJUSTMENT: "Điều chỉnh",
  EXPIRE: "Hết hạn",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RewardsPage() {
  const balanceQuery = useRewardBalance();
  const ledgerQuery = useRewardLedger(1, 30);
  const balance = balanceQuery.data;
  const entries = ledgerQuery.data?.data ?? [];

  if (balanceQuery.isLoading || ledgerQuery.isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h1 className="mb-2 font-serif text-4xl font-bold text-primary">
          Điểm thưởng của tôi
        </h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi số dư điểm, lịch sử cộng điểm và các lần đổi điểm khi đặt hàng.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-card p-6 shadow-[0_15px_30px_-20px_rgba(84,67,60,0.2)]">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Coins className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Số dư hiện tại</p>
          <p className="mt-2 font-serif text-4xl font-bold text-primary">
            {balance?.balance ?? 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">điểm khả dụng</p>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Quy đổi</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            1 điểm = {formatCurrency(balance?.redeemVndPerPoint ?? 1000)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Dùng điểm trực tiếp trong bước thanh toán.
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-6">
          <p className="text-sm font-medium text-muted-foreground">Nhận điểm</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {formatCurrency(balance?.earnVndPerPoint ?? 10000)} = 1 điểm
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Điểm được cộng khi đơn đã giao và đã thanh toán.
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-lg border border-border/60 bg-card">
        <div className="border-b border-border/60 p-6">
          <h2 className="font-serif text-2xl font-bold text-primary">
            Lịch sử cộng/trừ điểm
          </h2>
        </div>

        {entries.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center p-10 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/25" />
            <h3 className="font-serif text-xl text-primary">Chưa có giao dịch điểm</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Hoàn tất đơn hàng đầu tiên để bắt đầu tích điểm thưởng.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {entries.map((entry) => {
              const isPositive = entry.points > 0;

              return (
                <div
                  key={entry.id}
                  className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {typeLabels[entry.type] ?? entry.type}
                      </span>
                      {entry.orderId ? (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Đơn #{entry.orderId.slice(0, 8)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.description || "Cập nhật điểm thưởng"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p
                      className={`text-lg font-bold ${
                        isPositive ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {entry.points} điểm
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Số dư: {entry.balanceAfter}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
