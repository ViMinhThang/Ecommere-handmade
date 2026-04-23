"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { CustomOfferDialog } from "./custom-offer-dialog";
import { 
  mergeUniqueMessages, 
  appendMessageToMap 
} from "../utils";

import { ChatConversationList } from "./chat-conversation-list";
import { ChatHeader } from "./chat-header";
import { ChatMessageList } from "./chat-message-list";
import { ChatInputArea } from "./chat-input-area";

interface ChatPanelProps {
  compact?: boolean;
  sellerId?: string | null;
  productId?: string | null;
  showOpenFullPageLink?: boolean;
  className?: string;
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

  const showConversationList = isMobileListVisible || !selectedConversationId;

  return (
    <div className={cn("h-full min-h-0 w-full overflow-hidden", className)}>
      <div className="flex h-full min-h-0">
        <ChatConversationList 
          conversations={conversations}
          activeConversationId={activeConversationId}
          unreadCount={unreadCount}
          isLoadingConversations={isLoadingConversations}
          showOpenFullPageLink={showOpenFullPageLink}
          compact={compact}
          showConversationList={showConversationList}
          onSelectConversation={handleSelectConversation}
        />

        <section
          className={cn(
            "min-h-0 flex-1 flex-col",
            showConversationList ? "hidden md:flex" : "flex",
          )}
        >
          {!selectedConversation ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Chọn một cuộc trò chuyện để bắt đầu.
            </div>
          ) : (
            <>
              <ChatHeader 
                selectedConversation={selectedConversation}
                user={user}
                compact={compact}
                onBackToList={() => setIsMobileListVisible(true)}
                onOpenOfferDialog={() => setIsOfferDialogOpen(true)}
              />

              <ChatMessageList 
                messages={combinedMessages}
                currentUserId={user?.id}
                nextCursor={nextCursor}
                isLoadingOlderMessages={isLoadingOlderMessages}
                isLoadingMessages={isLoadingMessages}
                onLoadOlderMessages={handleLoadOlderMessages}
                messagesEndRef={messagesEndRef}
              />

              <ChatInputArea 
                draftText={draftText}
                setDraftText={setDraftText}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                isSending={isSending}
                activeConversationId={activeConversationId}
                onSendMessage={handleSendMessage}
                fileInputRef={fileInputRef}
              />
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
