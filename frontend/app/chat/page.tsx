"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { ChatPanel } from "@/features/chat/components/chat-panel";

function ChatPageContent() {
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

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground font-body">
          <CustomerNavBar />
          <main className="pt-24 px-3 pb-4 md:px-6">
            <div className="mx-auto flex h-[calc(100vh-7.8rem)] w-full max-w-[1200px] items-center justify-center rounded-lg border border-border/70 bg-card shadow-sm">
              <p className="text-sm text-muted-foreground">Loading chat...</p>
            </div>
          </main>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
