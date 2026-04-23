"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeSellerId: string | null;
  activeProductId: string | null;
  openChat: (sellerId?: string, productId?: string) => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSellerId, setActiveSellerId] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  const openChat = useCallback((sellerId?: string, productId?: string) => {
    setActiveSellerId(sellerId || null);
    setActiveProductId(productId || null);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    // We don't necessarily clear the seller/product ID here so the chat remains in context if reopened, 
    // but typically you want to keep the state until a new one is opened.
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        activeSellerId,
        activeProductId,
        openChat,
        closeChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
