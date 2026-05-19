import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatConversationSummary } from "@/types";
import { mediaApi } from "@/lib/api/media";
import { getInitials } from "../utils";

interface ChatHeaderProps {
  selectedConversation: ChatConversationSummary;
  compact: boolean;
  onBackToList: () => void;
}

export function ChatHeader({
  selectedConversation,
  compact,
  onBackToList,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-3 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={onBackToList}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarImage
            src={selectedConversation.otherParticipant.avatar ? mediaApi.getImageUrl(selectedConversation.otherParticipant.avatar) : ""}
            alt={selectedConversation.otherParticipant.name}
          />
          <AvatarFallback className="text-[10px]">
            {getInitials(selectedConversation.otherParticipant.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {selectedConversation.otherParticipant.shopName ||
              selectedConversation.otherParticipant.name}
          </p>
          {selectedConversation.contextProduct ? (
            <p className="truncate text-xs text-muted-foreground">
              Sản phẩm: {selectedConversation.contextProduct.name}
            </p>
          ) : null}
        </div>
      </div>
      {!compact ? (
        <span className="text-xs text-muted-foreground">
          {selectedConversation.unreadCount > 0
            ? `${selectedConversation.unreadCount} chưa đọc`
            : "Đã đọc"}
        </span>
      ) : null}
    </div>
  );
}
