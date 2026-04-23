import { ArrowLeft, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatConversationSummary } from "@/types";
import { getInitials } from "../utils";

interface ChatHeaderProps {
  selectedConversation: ChatConversationSummary;
  user: any;
  compact: boolean;
  onBackToList: () => void;
  onOpenOfferDialog: () => void;
}

export function ChatHeader({
  selectedConversation,
  user,
  compact,
  onBackToList,
  onOpenOfferDialog,
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
            src={selectedConversation.otherParticipant.avatar || ""}
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
      <div className="flex items-center gap-2">
        {user?.roles.includes("ROLE_SELLER") && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/5"
            onClick={onOpenOfferDialog}
          >
            <PenTool className="h-3.5 w-3.5" />
            Tạo báo giá
          </Button>
        )}
        {!compact ? (
          <span className="text-xs text-muted-foreground">
            {selectedConversation.unreadCount > 0
              ? `${selectedConversation.unreadCount} chưa đọc`
              : "Đã đọc"}
          </span>
        ) : null}
      </div>
    </div>
  );
}
