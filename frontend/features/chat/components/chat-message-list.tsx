import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { chatApi } from "@/lib/api/chat";
import {
  formatMessageTime,
  getCustomOrderOfferPayload,
  getImagePayload,
  getTextPayload,
} from "../utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  nextCursor: string | null;
  isLoadingOlderMessages: boolean;
  isLoadingMessages: boolean;
  onLoadOlderMessages: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

function formatVnd(value: string | number | undefined) {
  if (value === undefined || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `${new Intl.NumberFormat("vi-VN").format(amount)} vnđ`;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function structuredLines(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item.trim() : JSON.stringify(item),
      )
      .filter(Boolean);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(
      ([key, item]) => {
        const printable =
          typeof item === "string" || typeof item === "number"
            ? String(item)
            : JSON.stringify(item);
        return `${key}: ${printable}`;
      },
    );
  }

  return [];
}

function QuoteMessageCard({
  message,
  isOwnMessage,
}: {
  message: ChatMessage;
  isOwnMessage: boolean;
}) {
  const offer = getCustomOrderOfferPayload(message);
  if (!offer) {
    return <p className="text-sm whitespace-pre-wrap">{getTextPayload(message)}</p>;
  }

  const snapshot = offer.quoteSnapshot;
  const title = stringValue(snapshot.title) || "Báo giá thiết kế riêng";
  const description = stringValue(snapshot.description);
  const leadTime = stringValue(snapshot.estimatedLeadTime);
  const revisionPolicy = stringValue(snapshot.revisionPolicy);
  const shippingNote = stringValue(snapshot.shippingNote);
  const termsNote = stringValue(snapshot.termsNote);
  const materials = structuredLines(snapshot.materials);
  const sizeOptions = structuredLines(snapshot.sizeOptions);
  const price = formatVnd(snapshot.price);
  const ctaText = isOwnMessage ? "Xem báo giá" : "Xem & chấp nhận báo giá";

  return (
    <div className="w-full min-w-[240px] max-w-[360px] rounded-md border border-border/70 bg-background text-foreground shadow-sm">
      <div className="border-b border-border/60 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-5">{title}</p>
            {snapshot.templateName ? (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                Mẫu: {snapshot.templateName}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3 px-3 py-3 text-sm">
        {description ? (
          <p className="whitespace-pre-wrap text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/45 px-3 py-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Giá cuối cùng
          </span>
          <span className="font-semibold text-primary">
            {price || "Chưa có giá"}
          </span>
        </div>

        {leadTime ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {leadTime}
          </div>
        ) : null}

        {materials.length > 0 ? (
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              Vật liệu
            </p>
            <div className="flex flex-wrap gap-1.5">
              {materials.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {sizeOptions.length > 0 ? (
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">
              Kích thước / tùy chọn
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              {sizeOptions.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
          </div>
        ) : null}

        {[revisionPolicy, shippingNote, termsNote].some(Boolean) ? (
          <div className="space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
            {revisionPolicy ? <p>Chỉnh sửa: {revisionPolicy}</p> : null}
            {shippingNote ? <p>Vận chuyển: {shippingNote}</p> : null}
            {termsNote ? <p>Điều khoản: {termsNote}</p> : null}
          </div>
        ) : null}

        <Link
          href={`/custom-orders/${offer.customOrderId}/review`}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_22px_-12px_rgba(133,55,36,0.55)] transition-all hover:brightness-[1.04]"
        >
          {ctaText}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export function ChatMessageList({
  messages,
  currentUserId,
  nextCursor,
  isLoadingOlderMessages,
  isLoadingMessages,
  onLoadOlderMessages,
  messagesEndRef,
}: ChatMessageListProps) {
  const renderMessageContent = (message: ChatMessage, isOwnMessage: boolean) => {
    if (message.type === "IMAGE") {
      const { imagePath, caption } = getImagePayload(message);
      const imageUrl = chatApi.getUploadUrl(imagePath);

      return (
        <div className="space-y-2">
          {imageUrl ? (
            <div className="relative w-full min-w-[180px] max-w-[280px] aspect-[4/3] overflow-hidden rounded-md border border-border/50">
              <Image
                src={imageUrl}
                alt="Chat image"
                fill
                sizes="280px"
                className="object-cover"
              />
            </div>
          ) : null}
          {caption ? <p className="text-sm whitespace-pre-wrap">{caption}</p> : null}
        </div>
      );
    }

    if (message.type === "CUSTOM_ORDER_OFFER") {
      return <QuoteMessageCard message={message} isOwnMessage={isOwnMessage} />;
    }

    return <p className="text-sm whitespace-pre-wrap">{getTextPayload(message)}</p>;
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoadingOlderMessages}
            onClick={onLoadOlderMessages}
          >
            {isLoadingOlderMessages ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Tải tin nhắn cũ hơn"
            )}
          </Button>
        </div>
      ) : null}

      {isLoadingMessages && messages.length === 0 ? (
        <div className="flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : null}

      {messages.map((message) => {
        const isOwnMessage = message.senderId === currentUserId;
        const hasRichQuote =
          message.type === "CUSTOM_ORDER_OFFER" &&
          getCustomOrderOfferPayload(message);
        return (
          <div
            key={message.id}
            className={cn(
              "flex",
              isOwnMessage ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[82%] rounded-lg px-3 py-2 shadow-sm",
                hasRichQuote
                  ? "bg-transparent p-0 shadow-none"
                  : isOwnMessage
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border/70",
              )}
            >
              {renderMessageContent(message, isOwnMessage)}
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  isOwnMessage
                    ? "text-primary-foreground/80"
                    : "text-muted-foreground",
                )}
              >
                {formatMessageTime(message.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
