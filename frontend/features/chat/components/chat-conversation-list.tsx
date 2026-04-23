import { MessageCircle, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatConversationSummary } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatMessageTime, getInitials, getTextPayload } from "../utils";

interface ChatConversationListProps {
  conversations: ChatConversationSummary[];
  activeConversationId: string;
  unreadCount: number;
  isLoadingConversations: boolean;
  showOpenFullPageLink: boolean;
  compact: boolean;
  showConversationList: boolean;
  onSelectConversation: (id: string) => void;
}

export function ChatConversationList({
  conversations,
  activeConversationId,
  unreadCount,
  isLoadingConversations,
  showOpenFullPageLink,
  compact,
  showConversationList,
  onSelectConversation,
}: ChatConversationListProps) {
  return (
    <aside
      className={cn(
        "border-r border-border/60 bg-muted/35 min-h-0",
        compact ? "w-[40%]" : "w-full md:w-[20rem]",
        showConversationList ? "flex flex-col" : "hidden md:flex md:flex-col",
      )}
    >
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Trò chuyện</p>
            {unreadCount > 0 ? (
              <Badge className="bg-primary text-primary-foreground h-5 min-w-5 px-1.5 text-[10px]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            ) : null}
          </div>
          {showOpenFullPageLink ? (
            <Link href="/chat" className="text-xs text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">
            Chưa có cuộc trò chuyện nào.
          </div>
        ) : (
          conversations.map((conversation) => {
            const isActive = conversation.id === activeConversationId;
            const previewText = conversation.lastMessage
              ? conversation.lastMessage.type === "IMAGE"
                ? "[Hình ảnh]"
                : getTextPayload(conversation.lastMessage)
              : "Bắt đầu trò chuyện";

            return (
              <button
                key={conversation.id}
                type="button"
                className={cn(
                  "w-full border-b border-border/50 px-3 py-3 text-left transition-colors",
                  isActive ? "bg-background" : "hover:bg-background/60",
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={conversation.otherParticipant.avatar || ""}
                      alt={conversation.otherParticipant.name}
                    />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(conversation.otherParticipant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {conversation.otherParticipant.shopName ||
                          conversation.otherParticipant.name}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatMessageTime(conversation.updatedAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{previewText}</p>
                    {conversation.unreadCount > 0 ? (
                      <Badge className="mt-1 h-5 bg-primary text-primary-foreground text-[10px]">
                        {conversation.unreadCount}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
