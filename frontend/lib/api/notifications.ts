import { apiClient } from "./client";

export type NotificationType =
  | "ORDER_CREATED"
  | "ORDER_STATUS_UPDATED"
  | "ORDER_CANCELLED"
  | "PAYMENT_SUCCEEDED"
  | "PAYMENT_FAILED"
  | "REFUND_UPDATED"
  | "PRODUCT_SUBMITTED"
  | "PRODUCT_APPROVED"
  | "PRODUCT_REJECTED"
  | "CHAT_MESSAGE"
  | "CUSTOM_QUOTE_SENT"
  | "CUSTOM_ORDER_CREATED"
  | "CUSTOM_ORDER_STATUS_UPDATED"
  | "REPORT_CREATED"
  | "REPORT_STATUS_UPDATED"
  | "REVIEW_CREATED"
  | "REVIEW_REPLIED"
  | "QUESTION_CREATED"
  | "QUESTION_ANSWERED"
  | "REWARD_POINTS_UPDATED"
  | "SYSTEM";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  dedupeKey: string | null;
  readAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  status?: "all" | "unread";
  type?: NotificationType;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function toQueryString(params?: NotificationsQuery) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export const notificationsApi = {
  getNotifications: (params?: NotificationsQuery) =>
    apiClient.get<NotificationsResponse>(
      `/notifications${toQueryString(params)}`,
    ),

  getUnreadCount: () =>
    apiClient.get<{ unreadCount: number }>("/notifications/unread-count"),

  markNotificationRead: (id: string) =>
    apiClient.patch<NotificationItem>(`/notifications/${id}/read`, {}),

  markAllNotificationsRead: () =>
    apiClient.patch<{ updatedCount: number }>("/notifications/read-all", {}),

  deleteNotification: (id: string) =>
    apiClient.delete<{ success: true }>(`/notifications/${id}`),
};
