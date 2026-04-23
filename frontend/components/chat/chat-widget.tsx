"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { MessageSquareText, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { chatKeys, useChatUnreadCount } from "@/lib/api/hooks";
import { ensureChatSocketConnected } from "@/lib/chat/socket";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import { Button } from "@/components/ui/button";

const HIDDEN_PATH_PREFIXES = [
  "/dashboard",
  "/login",
  "/register",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
  "/chat",
];

export function ChatWidget() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { isOpen, setIsOpen, activeSellerId, activeProductId, closeChat } = useChat();
  const queryClient = useQueryClient();
  const widgetRef = useRef<HTMLDivElement>(null);

  const shouldHide = useMemo(() => {
    if (!pathname) {
      return true;
    }
    return HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }, [pathname]);

  const { data: unreadResponse } = useChatUnreadCount(
    isAuthenticated && !shouldHide,
  );
  const unreadCount = unreadResponse?.unreadCount ?? 0;

  useEffect(() => {
    if (!isAuthenticated || shouldHide) {
      return;
    }

    const socket = ensureChatSocketConnected();
    if (!socket) {
      return;
    }

    const handleUnreadUpdated = (value: { unreadCount: number }) => {
      queryClient.setQueryData(chatKeys.unread(), value);
    };

    socket.on("chat.unread.updated", handleUnreadUpdated);
    return () => {
      socket.off("chat.unread.updated", handleUnreadUpdated);
    };
  }, [isAuthenticated, queryClient, shouldHide]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        // Only close if it's not the toggle button (which has its own handler)
        const target = event.target as HTMLElement;
        if (!target.closest("#chat-widget-trigger")) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (isLoading || !isAuthenticated || shouldHide) {
    return null;
  }

  return (
    <>
      <button
        id="chat-widget-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-0 right-0 z-40 flex items-center gap-3 rounded-tl-2xl bg-[#f04e30] px-7 py-4 text-white shadow-[-10px_-10px_40px_rgba(240,78,48,0.3)] transition-all hover:bg-[#d43d1f] hover:pl-10 active:scale-95",
          isOpen && "scale-90 opacity-0 pointer-events-none translate-y-full translate-x-full",
        )}
      >
        <MessageSquareText className="h-5 w-5" />
        <span className="text-lg font-bold font-headline tracking-widest uppercase">Chat</span>
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -left-1 min-w-5 h-5 flex items-center justify-center rounded-full bg-black text-center text-[10px] font-bold text-white border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen && (
        <div 
          ref={widgetRef}
          className={cn(
            "fixed bottom-0 right-0 z-50 flex flex-col w-[min(640px,100vw)] h-[min(540px,100vh)]",
            "shadow-[-20px_-20px_80px_rgba(0,0,0,0.15)] rounded-tl-3xl border-l border-t border-border bg-card overflow-hidden",
            "transition-all animate-in fade-in slide-in-from-bottom-10 duration-300"
          )}
        >
          <div className="absolute top-3 right-3 z-[60]">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80" 
              onClick={closeChat}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-full min-h-0">
            <ChatPanel 
              compact 
              showOpenFullPageLink 
              sellerId={activeSellerId}
              productId={activeProductId}
            />
          </div>
        </div>
      )}
    </>
  );
}
