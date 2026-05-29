"use client";

import { Gift, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

interface GiftOptionsNoteProps {
  giftWrap?: boolean | null;
  giftCard?: boolean | null;
  giftMessage?: string | null;
  compact?: boolean;
  className?: string;
}

export function hasGiftOptions({
  giftWrap,
  giftCard,
  giftMessage,
}: Pick<GiftOptionsNoteProps, "giftWrap" | "giftCard" | "giftMessage">) {
  return Boolean(giftWrap || giftCard || giftMessage?.trim());
}

export function GiftOptionsNote({
  giftWrap,
  giftCard,
  giftMessage,
  compact = false,
  className,
}: GiftOptionsNoteProps) {
  const message = giftMessage?.trim() || "";

  if (!hasGiftOptions({ giftWrap, giftCard, giftMessage: message })) {
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
            {giftWrap ? <span>Gói quà</span> : null}
            {giftCard ? <span>Thiệp viết tay</span> : null}
          </div>
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
