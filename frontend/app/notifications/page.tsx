"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CheckCheck,
  ExternalLink,
  Inbox,
  Loader2,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth-route";
import { CustomerNavBar } from "@/components/layout/customer-nav-bar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/contexts/auth-context";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/lib/api/hooks";
import type { NotificationItem } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

type NotificationStatusFilter = "all" | "unread";

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

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationListItem({
  notification,
  onOpen,
}: {
  notification: NotificationItem;
  onOpen: (notification: NotificationItem) => void;
}) {
  const unread = !notification.readAt;

  return (
    <button
      type="button"
      className={cn(
        "flex w-full gap-4 border-b border-border/70 px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-accent/70",
        unread && "bg-primary/5",
      )}
      onClick={() => onOpen(notification)}
    >
      <span
        className={cn(
          "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-muted",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{notification.title}</span>
          {unread ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Chưa đọc
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {notification.message}
        </span>
        <span className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          {formatNotificationTime(notification.createdAt)}
          {notification.link ? <ExternalLink className="h-3.5 w-3.5" /> : null}
        </span>
      </span>
    </button>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<NotificationStatusFilter>("all");
  const limit = 10;
  const isDashboardUser =
    user?.roles?.includes("ROLE_ADMIN") || user?.roles?.includes("ROLE_SELLER");

  const query = useMemo(
    () => ({ page, limit, status }),
    [page, status],
  );
  const {
    data: notificationsResponse,
    isLoading,
    isError,
  } = useNotifications(query, isAuthenticated);
  const { data: unreadResponse } = useUnreadNotificationCount(isAuthenticated);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsResponse?.data ?? [];
  const meta = notificationsResponse?.meta;
  const unreadCount = unreadResponse?.unreadCount ?? 0;

  const handleOpenNotification = async (notification: NotificationItem) => {
    if (!notification.readAt) {
      await markRead.mutateAsync(notification.id).catch(() => undefined);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {!isDashboardUser ? <CustomerNavBar /> : null}

      {isDashboardUser ? (
        <header className="border-b border-border/70 bg-background/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
              Về dashboard
            </Button>
            <NotificationBell />
          </div>
        </header>
      ) : null}

      <main
        className={cn(
          "mx-auto w-full max-w-[1100px] px-4 pb-16 sm:px-6 lg:px-8",
          isDashboardUser ? "pt-8" : "pt-28",
        )}
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <Bell className="h-4 w-4" />
              Trung tâm thông báo
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Thông báo của bạn
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Theo dõi đơn hàng, duyệt sản phẩm, báo cáo và báo giá thủ công
              trong một nơi.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() =>
              void markAllRead.mutateAsync().catch(() => undefined)
            }
          >
            {markAllRead.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Đánh dấu tất cả đã đọc
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={status === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatus("all");
              setPage(1);
            }}
          >
            Tất cả
          </Button>
          <Button
            type="button"
            variant={status === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatus("unread");
              setPage(1);
            }}
          >
            Chưa đọc
            {unreadCount > 0 ? (
              <span className="ml-1 rounded-full bg-background/20 px-1.5 text-[11px]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Button>
        </div>

        <section className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm">
          {isLoading ? (
            <div className="flex min-h-[18rem] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang tải thông báo...
            </div>
          ) : isError ? (
            <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-7 w-7 text-destructive" />
              Không thể tải danh sách thông báo. Vui lòng thử lại.
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 text-muted-foreground/60" />
              {status === "unread"
                ? "Bạn không có thông báo chưa đọc."
                : "Chưa có thông báo nào."}
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                onOpen={handleOpenNotification}
              />
            ))
          )}
        </section>

        {meta ? (
          <Pagination
            page={meta.page}
            limit={meta.limit}
            total={meta.total}
            onPageChange={setPage}
          />
        ) : null}
      </main>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}
