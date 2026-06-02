"use client";

import { Gift, MessageSquareText } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { GiftWrapTierSnapshot } from "@/types";

interface GiftOptionsNoteProps {
  giftWrap?: boolean | null;
  giftCard?: boolean | null;
  giftMessage?: string | null;
  giftWrapTierSnapshot?: GiftWrapTierSnapshot | null;
  giftWrapFee?: number | string | null;
  compact?: boolean;
  className?: string;
}

export function hasGiftOptions({
  giftWrap,
  giftCard,
  giftMessage,
  giftWrapTierSnapshot,
}: Pick<
  GiftOptionsNoteProps,
  "giftWrap" | "giftCard" | "giftMessage" | "giftWrapTierSnapshot"
>) {
  return Boolean(giftWrap || giftCard || giftMessage?.trim() || giftWrapTierSnapshot);
}

export function GiftOptionsNote({
  giftWrap,
  giftCard,
  giftMessage,
  giftWrapTierSnapshot,
  giftWrapFee,
  compact = false,
  className,
}: GiftOptionsNoteProps) {
  const message = giftMessage?.trim() || "";
  const fee = Number(giftWrapFee ?? giftWrapTierSnapshot?.price ?? 0);

  if (
    !hasGiftOptions({
      giftWrap,
      giftCard,
      giftMessage: message,
      giftWrapTierSnapshot,
    })
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-md border border-amber-200 bg-amber-50 text-amber-950",
        compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Gift className={compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4"} />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">Gói quà / thiệp tặng kèm</p>
          <div className="flex flex-wrap gap-2 text-amber-900/80">
            {giftWrapTierSnapshot ? (
              <span>
                {giftWrapTierSnapshot.name}
                {fee > 0 ? ` (${formatCurrency(fee)})` : ""}
              </span>
            ) : giftWrap ? (
              <span>Gói quà</span>
            ) : null}
            {giftCard ? <span>Thiệp viết tay</span> : null}
          </div>
          {giftWrapTierSnapshot?.description ? (
            <p className="text-xs text-amber-900/70">
              {giftWrapTierSnapshot.description}
            </p>
          ) : null}
          {message ? (
            <div className="mt-2 flex items-start gap-2 text-foreground/80">
              <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-800" />
              <p className="break-words">{message}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
