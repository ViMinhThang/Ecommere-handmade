import { apiClient } from "./client";

export interface PaymentHistoryItem {
  id: string;
  source: "ORDER" | "CUSTOM_ORDER";
  sourceId: string;
  title: string;
  amount: number;
  currency: string;
  paymentMethod: "STRIPE" | "COD";
  paymentStatus:
    | "UNPAID"
    | "PAID"
    | "COD_PENDING"
    | "FAILED"
    | "PARTIALLY_REFUNDED"
    | "REFUNDED";
  paymentIntentId: string | null;
  refundedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export const paymentsApi = {
  getHistory: () => apiClient.get<PaymentHistoryItem[]>("/payments/history"),
};
