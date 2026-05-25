import { apiClient } from './client';
import type {
  FinancialSummary,
  MarketplaceLedgerEntry,
  QuoteSnapshot,
  Refund,
  RefundRequest,
} from '@/types';

export interface CustomOrder {
  id: string;
  customerId: string;
  sellerId: string;
  paymentIntentId: string | null;
  title: string;
  artisanNote: string | null;
  price: string;
  leadTime: string | null;
  specifications: string[];
  sketchImageUrl: string | null;
  revisionNote: string | null;
  quoteTemplateId?: string | null;
  quoteSnapshot?: QuoteSnapshot | null;
  quoteSentAt?: string | null;
  quoteAcceptedAt?: string | null;
  paymentStatus?: 'UNPAID' | 'PAID' | 'COD_PENDING' | 'FAILED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  status: 'DRAFT' | 'PENDING_REVIEW' | 'REVISION_REQUESTED' | 'AWAITING_PAYMENT' | 'CRAFTING' | 'FINISHING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  financialSummary?: FinancialSummary;
  seller?: {
    id: string;
    name: string;
    shopName: string;
    avatar?: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CustomOrderProgressEvent {
  id: string;
  customOrderId: string;
  actorId: string;
  status: CustomOrder['status'] | null;
  title: string;
  note: string | null;
  imageUrl: string | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    roles: string[];
    avatar?: string | null;
    shopName?: string | null;
  };
}

export interface CreateCustomOrderPayload {
  customerId: string;
  title: string;
  artisanNote?: string;
  price: number;
  leadTime?: string;
  specifications?: string[];
  sketchImageUrl?: string;
}

export interface CreateCustomOrderProgressEventPayload {
  title: string;
  note?: string;
  imageUrl?: string;
  status?: CustomOrder['status'];
}

export const customOrdersApi = {
  create: (data: CreateCustomOrderPayload) => {
    return apiClient.post<CustomOrder>('/custom-orders', data);
  },
  
  getMyOrders: () => {
    return apiClient.get<CustomOrder[]>('/custom-orders/my-orders');
  },
  
  getSellerOrders: () => {
    return apiClient.get<CustomOrder[]>('/custom-orders/seller-orders');
  },

  getById: (id: string) => {
    return apiClient.get<CustomOrder>(`/custom-orders/${id}`);
  },

  getProgressEvents: (id: string) => {
    return apiClient.get<CustomOrderProgressEvent[]>(
      `/custom-orders/${id}/progress`,
    );
  },

  createProgressEvent: (
    id: string,
    data: CreateCustomOrderProgressEventPayload,
  ) => {
    return apiClient.post<CustomOrderProgressEvent>(
      `/custom-orders/${id}/progress`,
      data,
    );
  },

  requestRevision: (id: string, revisionNote: string) => {
    return apiClient.post<{ success: boolean; status: string }>(`/custom-orders/${id}/request-revision`, { revisionNote });
  },

  approveSketch: (id: string) => {
    return apiClient.post<{ success: boolean; clientSecret: string; paymentIntentId: string }>(`/custom-orders/${id}/approve-sketch`);
  },

  confirmPayment: (id: string, paymentIntentId: string) => {
    return apiClient.post<CustomOrder>(`/custom-orders/${id}/confirm-payment`, { paymentIntentId });
  },

  updateStatus: (id: string, status: CustomOrder['status']) => {
    return apiClient.patch<CustomOrder>(`/custom-orders/${id}/status`, { status });
  },

  updateSketch: (id: string, data: { sketchImageUrl?: string; artisanNote?: string }) => {
    return apiClient.patch<CustomOrder>(`/custom-orders/${id}/sketch`, data);
  },

  cancel: (id: string) => {
    return apiClient.patch<CustomOrder>(`/custom-orders/${id}/cancel`, {});
  },

  refundAdminCustomOrder: (
    id: string,
    data: Omit<RefundRequest, 'subOrderId'>,
  ) => {
    return apiClient.post<Refund>(`/custom-orders/admin/${id}/refunds`, data);
  },

  getAdminCustomOrderLedger: (id: string) => {
    return apiClient.get<MarketplaceLedgerEntry[]>(
      `/custom-orders/admin/${id}/ledger`,
    );
  },
};
