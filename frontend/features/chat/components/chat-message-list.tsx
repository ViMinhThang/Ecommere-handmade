import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { chatApi } from "@/lib/api/chat";
import { formatMessageTime, getImagePayload, getTextPayload } from "../utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  nextCursor: string | null;
  isLoadingOlderMessages: boolean;
  isLoadingMessages: boolean;
  onLoadOlderMessages: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
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
  const renderMessageContent = (message: ChatMessage) => {
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
                isOwnMessage
                  ? "bg-primary text-primary-foreground"
                  : "bg-background border border-border/70",
              )}
            >
              {renderMessageContent(message)}
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
