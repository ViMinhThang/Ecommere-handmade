"use client";

import { useSearchParams } from "next/navigation";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { ChatPanel } from "@/components/chat/chat-panel";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const sellerId = searchParams.get("sellerId");
  const productId = searchParams.get("productId");

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      <CustomerNavBar />
      <main className="pt-24 px-3 pb-4 md:px-6">
        <div className="mx-auto w-full max-w-[1200px] h-[calc(100vh-7.8rem)]">
          <ChatPanel 
            sellerId={sellerId} 
            productId={productId} 
            className="rounded-lg border border-border/70 bg-card shadow-sm"
          />
        </div>
      </main>
    </div>
  );
}
