"use client";

import { ChatPanel } from "@/features/chat/components/chat-panel";

export default function DashboardChatPage() {
  return (
    <div className="space-y-4 h-full">
      <div>
        <h1 className="artisan-title text-3xl">Tin nhắn</h1>
        <p className="artisan-subtitle mt-1">
          Trò chuyện với khách hàng theo thời gian thực.
        </p>
      </div>
      <div className="h-[calc(100vh-14.5rem)]">
        <ChatPanel />
      </div>
    </div>
  );
}
