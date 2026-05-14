import { apiClient } from "./client";

export type PaymentReliabilitySeverity = "HIGH" | "MEDIUM" | "LOW";

export type PaymentReliabilityAnomalyType =
  | "STRIPE_ORDER_UNPAID_EXPIRED"
  | "CUSTOM_ORDER_UNPAID_EXPIRED"
  | "PAID_ORDER_MISSING_CAPTURE_LEDGER"
  | "REFUND_STATUS_MISMATCH"
  | "PAID_WITHOUT_WEBHOOK_RECORD";

export type PaymentReliabilityEntityType = "ORDER" | "CUSTOM_ORDER";

export type PaymentReliabilityReconciliationStatus =
  | "RECONCILED"
  | "PENDING_PAYMENT"
  | "UNPAID_EXPIRED"
  | "MISSING_CAPTURE_LEDGER"
  | "REFUND_STATUS_MISMATCH"
  | "PAID_WITHOUT_WEBHOOK";

export interface PaymentReliabilitySummary {
  totals: {
    stripeOrders: number;
    customOrders: number;
    webhookEvents: number;
    anomalies: number;
    reconciliationRows: number;
    unreconciled: number;
  };
  bySeverity: Record<PaymentReliabilitySeverity, number>;
  byType: Record<PaymentReliabilityAnomalyType, number>;
  generatedAt: string;
}

export interface PaymentReliabilityAnomaly {
  id: string;
  type: PaymentReliabilityAnomalyType;
  severity: PaymentReliabilitySeverity;
  entityType: PaymentReliabilityEntityType;
  entityId: string;
  paymentIntentId: string | null;
  orderStatus: string;
  paymentStatus: string;
  occurredAt: string;
  details: {
    isHeuristic?: boolean;
    note?: string;
    [key: string]: unknown;
  };
}

export interface PaymentReliabilityReconciliationRow {
  id: string;
  entityType: PaymentReliabilityEntityType;
  entityId: string;
  paymentIntentId: string | null;
  orderStatus: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  status: PaymentReliabilityReconciliationStatus;
  issues: PaymentReliabilityAnomalyType[];
}

export interface PaymentReliabilityWebhookEvent {
  id: string;
  eventId: string;
  type: string;
  paymentIntentId: string | null;
  processedAt: string;
  entityType: PaymentReliabilityEntityType | null;
  entityId: string | null;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface PaymentReliabilityDateRangeQuery {
  from?: string;
  to?: string;
}

export interface PaymentReliabilityPaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaymentReliabilityAnomaliesQuery
  extends PaymentReliabilityDateRangeQuery,
    PaymentReliabilityPaginationQuery {
  type?: PaymentReliabilityAnomalyType;
  severity?: PaymentReliabilitySeverity;
}

export interface PaymentReliabilityReconciliationQuery
  extends PaymentReliabilityDateRangeQuery,
    PaymentReliabilityPaginationQuery {
  entityType?: PaymentReliabilityEntityType;
  status?: PaymentReliabilityReconciliationStatus;
}

export interface PaymentReliabilityWebhooksQuery
  extends PaymentReliabilityDateRangeQuery,
    PaymentReliabilityPaginationQuery {
  type?: string;
}

function buildQueryString(
  params: Record<string, string | number | undefined | null>,
) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export const paymentReliabilityApi = {
  getSummary: (query?: PaymentReliabilityDateRangeQuery) =>
    apiClient.get<PaymentReliabilitySummary>(
      `/orders/admin/payment-reliability/summary${buildQueryString({
        from: query?.from,
        to: query?.to,
      })}`,
    ),

  getAnomalies: (query?: PaymentReliabilityAnomaliesQuery) =>
    apiClient.get<PaginatedResponse<PaymentReliabilityAnomaly>>(
      `/orders/admin/payment-reliability/anomalies${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        type: query?.type,
        severity: query?.severity,
        from: query?.from,
        to: query?.to,
      })}`,
    ),

  getReconciliation: (query?: PaymentReliabilityReconciliationQuery) =>
    apiClient.get<PaginatedResponse<PaymentReliabilityReconciliationRow>>(
      `/orders/admin/payment-reliability/reconciliation${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        entityType: query?.entityType,
        status: query?.status,
        from: query?.from,
        to: query?.to,
      })}`,
    ),

  getWebhooks: (query?: PaymentReliabilityWebhooksQuery) =>
    apiClient.get<PaginatedResponse<PaymentReliabilityWebhookEvent>>(
      `/orders/admin/payment-reliability/webhooks${buildQueryString({
        page: query?.page,
        limit: query?.limit,
        type: query?.type,
        from: query?.from,
        to: query?.to,
      })}`,
    ),
};
