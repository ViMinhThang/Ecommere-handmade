"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  ExternalLink,
  Inbox,
  Loader2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/lib/api/hooks";
import type { NotificationItem } from "@/lib/api/notifications";
import { ensureNotificationsSocketConnected } from "@/lib/notifications/socket";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  className?: string;
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (!Number.isFinite(date.getTime())) {
    return "";
  }
  if (diffMs < minute) {
    return "Vừa xong";
  }
  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)} phút trước`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)} giờ trước`;
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function NotificationBell({ className }: NotificationBellProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const enabled = isAuthenticated && !isLoading;
  const { data: unreadResponse } = useUnreadNotificationCount(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const socket = ensureNotificationsSocketConnected();
    if (!socket) {
      return;
    }

    const handleNotificationCreated = (notification: any) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      toast.success(notification.title || "Thông báo mới", {
        description: notification.message,
        action: notification.link ? {
          label: "Xem",
          onClick: () => router.push(notification.link)
        } : undefined
      });
    };

    socket.on("notifications.created", handleNotificationCreated);

    return () => {
      socket.off("notifications.created", handleNotificationCreated);
    };
  }, [enabled, queryClient, router]);
  const {
    data: notificationsResponse,
    isLoading: isLoadingNotifications,
    isError,
  } = useNotifications({ page: 1, limit: 5 }, enabled && isOpen);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadResponse?.unreadCount ?? 0;
  const displayedUnreadCount = unreadCount > 99 ? "99+" : String(unreadCount);
  const notifications = useMemo(
    () => notificationsResponse?.data ?? [],
    [notificationsResponse?.data],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  if (!enabled) {
    return null;
  }

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.readAt) {
      await markRead.mutateAsync(notification.id).catch(() => undefined);
    }
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead.mutateAsync().catch(() => undefined);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        aria-label="Thông báo"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
            {displayedUnreadCount}
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-11 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Thông báo</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${displayedUnreadCount} thông báo chưa đọc`
                  : "Tất cả đã được đọc"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={unreadCount === 0 || markAllRead.isPending}
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đọc hết
            </Button>
          </div>

          <div className="max-h-[22rem] overflow-y-auto p-2">
            {isLoadingNotifications ? (
              <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải thông báo...
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Không thể tải thông báo. Vui lòng thử lại.
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
                <Inbox className="h-6 w-6 text-muted-foreground/60" />
                Chưa có thông báo nào.
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => {
                  const unread = !notification.readAt;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className={cn(
                        "flex w-full gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent",
                        unread && "bg-primary/5",
                      )}
                      onClick={() => void handleNotificationClick(notification)}
                    >
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          unread ? "bg-primary" : "bg-muted",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-semibold">
                          {notification.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {notification.message}
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          {formatNotificationTime(notification.createdAt)}
                          {notification.link ? (
                            <ExternalLink className="h-3 w-3" />
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border/70 p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => {
                setIsOpen(false);
                router.push("/notifications");
              }}
            >
              Xem tất cả thông báo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
