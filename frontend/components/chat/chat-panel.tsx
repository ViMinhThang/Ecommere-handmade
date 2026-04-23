"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { chatApi } from "@/lib/api/chat";
import {
  chatKeys,
  useChatConversations,
  useChatMessages,
  useChatUnreadCount,
  useMarkConversationRead,
  useSendImageMessage,
  useSendTextMessage,
  useStartConversation,
} from "@/lib/api/hooks";
import { ensureChatSocketConnected } from "@/lib/chat/socket";
import type { ChatConversationSummary, ChatMessage } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomOfferDialog } from "./custom-offer-dialog";
import { PenTool } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ChatPanelProps {
  compact?: boolean;
  sellerId?: string | null;
  productId?: string | null;
  showOpenFullPageLink?: boolean;
  className?: string;
}

function formatMessageTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getTextPayload(message: ChatMessage): string {
  const text = message.payload["text"];
  return typeof text === "string" ? text : "";
}

function getImagePayload(message: ChatMessage) {
  const imagePath = message.payload["imagePath"];
  const caption = message.payload["caption"];
  return {
    imagePath: typeof imagePath === "string" ? imagePath : "",
    caption: typeof caption === "string" ? caption : "",
  };
}

function mergeUniqueMessages(messages: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  for (const message of messages) {
    map.set(message.id, message);
  }
  return Array.from(map.values()).sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );
}

function appendMessageToMap(
  current: Record<string, ChatMessage[]>,
  conversationId: string,
  message: ChatMessage,
) {
  return {
    ...current,
    [conversationId]: mergeUniqueMessages([
      ...(current[conversationId] ?? []),
      message,
    ]),
  };
}

export function ChatPanel({
  compact = false,
  sellerId,
  productId,
  showOpenFullPageLink = false,
  className,
}: ChatPanelProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [olderMessagesMap, setOlderMessagesMap] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [incomingMessagesMap, setIncomingMessagesMap] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [nextCursorMap, setNextCursorMap] = useState<Record<string, string | null>>(
    {},
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const startedConversationKeyRef = useRef<string | null>(null);

  const listParams = useMemo(() => ({ limit: 20 }), []);
  const { data: conversationsResponse, isLoading: isLoadingConversations } =
    useChatConversations(listParams, isAuthenticated);
  const conversations = useMemo(
    () => conversationsResponse?.data ?? [],
    [conversationsResponse],
  );

  const activeConversationId =
    selectedConversationId || conversations[0]?.id || "";
  const { data: messagesResponse, isLoading: isLoadingMessages } = useChatMessages(
    activeConversationId,
    { limit: 20 },
    !!activeConversationId,
  );

  const { data: unreadResponse } = useChatUnreadCount(isAuthenticated);
  const unreadCount = unreadResponse?.unreadCount ?? 0;

  const startConversationMutation = useStartConversation();
  const sendTextMutation = useSendTextMessage();
  const sendImageMutation = useSendImageMessage();
  const markReadMutation = useMarkConversationRead();

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === activeConversationId) ??
      null,
    [activeConversationId, conversations],
  );

  const olderMessages = useMemo(
    () => olderMessagesMap[activeConversationId] ?? [],
    [activeConversationId, olderMessagesMap],
  );
  const incomingMessages = useMemo(
    () => incomingMessagesMap[activeConversationId] ?? [],
    [activeConversationId, incomingMessagesMap],
  );
  const latestMessages = useMemo(
    () => messagesResponse?.data ?? [],
    [messagesResponse],
  );

  const combinedMessages = useMemo(
    () => mergeUniqueMessages([...olderMessages, ...latestMessages, ...incomingMessages]),
    [incomingMessages, latestMessages, olderMessages],
  );

  const nextCursor = nextCursorMap[activeConversationId] ?? messagesResponse?.nextCursor ?? null;

  useEffect(() => {
    if (!isAuthenticated || !user || !sellerId || sellerId === user.id) {
      return;
    }

    const startKey = `${sellerId}:${productId ?? ""}`;
    if (startedConversationKeyRef.current === startKey) {
      return;
    }
    startedConversationKeyRef.current = startKey;

    startConversationMutation.mutate(
      {
        sellerId,
        productId: productId || undefined,
      },
      {
        onSuccess: (conversation) => {
          setSelectedConversationId(conversation.id);
          setIsMobileListVisible(false);
          queryClient.invalidateQueries({ queryKey: [...chatKeys.all, "conversations"] });
        },
      },
    );
  }, [
    isAuthenticated,
    productId,
    queryClient,
    sellerId,
    startConversationMutation,
    user,
  ]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    markReadMutation.mutate(activeConversationId);
  }, [activeConversationId, markReadMutation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [combinedMessages]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const socket = ensureChatSocketConnected();
    if (!socket) {
      return;
    }

    const handleMessageCreated = (incoming: ChatMessage) => {
      setIncomingMessagesMap((previous) =>
        appendMessageToMap(previous, incoming.conversationId, incoming),
      );
    };

    const handleConversationUpdated = (updated: ChatConversationSummary) => {
      queryClient.setQueryData(
        chatKeys.conversations(listParams),
        (previous:
          | {
              data: ChatConversationSummary[];
              nextCursor: string | null;
            }
          | undefined) => {
          if (!previous) {
            return previous;
          }

          const withoutCurrent = previous.data.filter(
            (conversation) => conversation.id !== updated.id,
          );
          return {
            ...previous,
            data: [updated, ...withoutCurrent],
          };
        },
      );
    };

    const handleUnreadUpdated = (value: { unreadCount: number }) => {
      queryClient.setQueryData(chatKeys.unread(), value);
    };

    socket.on("chat.message.created", handleMessageCreated);
    socket.on("chat.conversation.updated", handleConversationUpdated);
    socket.on("chat.unread.updated", handleUnreadUpdated);

    return () => {
      socket.off("chat.message.created", handleMessageCreated);
      socket.off("chat.conversation.updated", handleConversationUpdated);
      socket.off("chat.unread.updated", handleUnreadUpdated);
    };
  }, [isAuthenticated, listParams, queryClient]);

  useEffect(() => {
    if (!activeConversationId || !isAuthenticated) {
      return;
    }

    const socket = ensureChatSocketConnected();
    socket?.emit("chat.conversation.join", {
      conversationId: activeConversationId,
    });
  }, [activeConversationId, isAuthenticated]);

  const isSending = sendTextMutation.isPending || sendImageMutation.isPending;

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsMobileListVisible(false);
  }, []);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!activeConversationId || !nextCursor || isLoadingOlderMessages) {
      return;
    }

    setIsLoadingOlderMessages(true);
    try {
      const response = await chatApi.getMessages(activeConversationId, {
        limit: 20,
        cursor: nextCursor,
      });

      setOlderMessagesMap((previous) => ({
        ...previous,
        [activeConversationId]: mergeUniqueMessages([
          ...response.data,
          ...(previous[activeConversationId] ?? []),
        ]),
      }));
      setNextCursorMap((previous) => ({
        ...previous,
        [activeConversationId]: response.nextCursor,
      }));
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [activeConversationId, isLoadingOlderMessages, nextCursor]);

  const handleSendMessage = useCallback(async () => {
    if (!activeConversationId || isSending) {
      return;
    }

    const trimmedText = draftText.trim();
    if (!trimmedText && !selectedFile) {
      return;
    }

    let sentMessage: ChatMessage;
    if (selectedFile) {
      sentMessage = await sendImageMutation.mutateAsync({
        conversationId: activeConversationId,
        file: selectedFile,
        caption: trimmedText || undefined,
      });
    } else {
      sentMessage = await sendTextMutation.mutateAsync({
        conversationId: activeConversationId,
        text: trimmedText,
      });
    }

    setIncomingMessagesMap((previous) =>
      appendMessageToMap(previous, activeConversationId, sentMessage),
    );
    setDraftText("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await queryClient.invalidateQueries({
      queryKey: [...chatKeys.all, "messages", activeConversationId],
    });
    await queryClient.invalidateQueries({
      queryKey: [...chatKeys.all, "conversations"],
    });
  }, [
    activeConversationId,
    draftText,
    isSending,
    queryClient,
    selectedFile,
    sendImageMutation,
    sendTextMutation,
  ]);

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

    if (message.type === "CUSTOM_ORDER_OFFER") {
      const payload = message.payload as any;
      return (
        <div className="space-y-3 py-1">
          <div className="flex items-start gap-2.5 text-foreground">
            <div className="mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary">
              <PenTool className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">Báo giá Tùy chỉnh</p>
              <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-tight">#{payload.customOrderId.slice(0, 8)}</p>
            </div>
          </div>
          
          <div className="rounded-md bg-muted/50 p-3 border border-border/40 text-foreground">
            <p className="text-sm font-medium mb-1">{payload.title}</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(payload.price)}</p>
            {payload.text && (
              <p className="text-xs text-muted-foreground mt-2 italic">"{payload.text}"</p>
            )}
          </div>

          <Link href={`/custom-orders/${payload.customOrderId}/review`}>
            <Button size="sm" className="w-full h-8 text-[11px] font-bold uppercase tracking-widest">
              Xem chi tiết & Thanh toán
            </Button>
          </Link>
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-wrap">{getTextPayload(message)}</p>;
  };

  const showConversationList = isMobileListVisible || !selectedConversationId;

  return (
    <div className={cn("h-full min-h-0 w-full overflow-hidden", className)}>
      <div className="flex h-full min-h-0">
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
                <p className="text-sm font-semibold text-primary">Chat</p>
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
                Chua co cuoc tro chuyen nao.
              </div>
            ) : (
              conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const previewText = conversation.lastMessage
                  ? conversation.lastMessage.type === "IMAGE"
                    ? "[Hinh anh]"
                    : getTextPayload(conversation.lastMessage)
                  : "Bat dau tro chuyen";

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className={cn(
                      "w-full border-b border-border/50 px-3 py-3 text-left transition-colors",
                      isActive ? "bg-background" : "hover:bg-background/60",
                    )}
                    onClick={() => handleSelectConversation(conversation.id)}
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

        <section
          className={cn(
            "min-h-0 flex-1 flex-col",
            showConversationList ? "hidden md:flex" : "flex",
          )}
        >
          {!selectedConversation ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Chon mot cuoc tro chuyen de bat dau.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8"
                    onClick={() => setIsMobileListVisible(true)}
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
                        San pham: {selectedConversation.contextProduct.name}
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
                      onClick={() => setIsOfferDialogOpen(true)}
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      Tạo báo giá
                    </Button>
                  )}
                  {!compact ? (
                    <span className="text-xs text-muted-foreground">
                      {selectedConversation.unreadCount > 0
                        ? `${selectedConversation.unreadCount} chua doc`
                        : "Da doc"}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {nextCursor ? (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLoadingOlderMessages}
                      onClick={() => void handleLoadOlderMessages()}
                    >
                      {isLoadingOlderMessages ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Tai tin nhan cu hon"
                      )}
                    </Button>
                  </div>
                ) : null}

                {isLoadingMessages && combinedMessages.length === 0 ? (
                  <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : null}

                {combinedMessages.map((message) => {
                  const isOwnMessage = message.senderId === user?.id;
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

              <div className="border-t border-border/60 px-3 py-3">
                {selectedFile ? (
                  <div className="mb-2 flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-2 py-1.5">
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedFile.name}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  <Input
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                    placeholder="Nhap tin nhan..."
                    maxLength={2000}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    disabled={
                      isSending ||
                      (!draftText.trim() && !selectedFile) ||
                      !activeConversationId
                    }
                    onClick={() => void handleSendMessage()}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      {selectedConversation && (
        <CustomOfferDialog
          isOpen={isOfferDialogOpen}
          onOpenChange={setIsOfferDialogOpen}
          conversationId={selectedConversation.id}
          customerId={selectedConversation.customerId}
          initialTitle={selectedConversation.contextProduct?.name}
        />
      )}
    </div>
  );
}
