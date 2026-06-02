"use client";

import { Clock, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import type { User } from "@/types";

type ShopPoliciesNoteProps = {
  seller?: Pick<
    User,
    | "shopReturnPolicy"
    | "shopShippingPolicy"
    | "shopProcessingTime"
    | "shopPolicyUpdatedAt"
  > | null;
  showFallback?: boolean;
  compact?: boolean;
};

function formatPolicyDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function ShopPoliciesNote({
  seller,
  showFallback = false,
  compact = false,
}: ShopPoliciesNoteProps) {
  const processingTime = seller?.shopProcessingTime?.trim();
  const shippingPolicy = seller?.shopShippingPolicy?.trim();
  const returnPolicy = seller?.shopReturnPolicy?.trim();
  const updatedAt = formatPolicyDate(seller?.shopPolicyUpdatedAt);
  const hasPolicy = Boolean(processingTime || shippingPolicy || returnPolicy);

  if (!hasPolicy && !showFallback) {
    return null;
  }

  const items = [
    {
      key: "processing",
      icon: Clock,
      title: "Thời gian xử lý",
      value:
        processingTime ||
        "Shop đang cập nhật thời gian chuẩn bị đơn cho từng nhóm sản phẩm.",
    },
    {
      key: "shipping",
      icon: Truck,
      title: "Chính sách vận chuyển",
      value:
        shippingPolicy ||
        "Shop sẽ xác nhận phương thức vận chuyển phù hợp khi chuẩn bị đơn hàng.",
    },
    {
      key: "return",
      icon: RefreshCcw,
      title: "Đổi trả",
      value:
        returnPolicy ||
        "Shop đang cập nhật chính sách đổi trả. Vui lòng nhắn tin cho shop nếu cần hỗ trợ.",
    },
  ];

  return (
    <section
      className={
        compact
          ? "rounded-xl border border-primary/10 bg-card p-5"
          : "rounded-2xl border border-primary/10 bg-white/80 p-6 shadow-sm"
      }
    >
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Chính sách gian hàng
          </p>
          <h3 className="mt-2 font-headline text-2xl italic text-primary">
            Đổi trả, xử lý và vận chuyển
          </h3>
        </div>
        {updatedAt ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            Cập nhật {updatedAt}
          </span>
        ) : null}
      </div>

      <div className={compact ? "space-y-4" : "grid gap-4 md:grid-cols-3"}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.key}
              className="rounded-xl border border-border/60 bg-background/80 p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-primary">
                <Icon className="h-4 w-4" />
                <h4 className="text-sm font-bold">{item.title}</h4>
              </div>
              <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {item.value}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
