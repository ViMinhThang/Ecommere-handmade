import { apiClient } from './client';
import type {
  FinancialSummary,
  MarketplaceLedgerEntry,
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

export const customOrdersApi = {
  create: (data: Partial<CustomOrder>) => {
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
    return apiClient.post<CustomOrder>(`/custom-orders/admin/${id}/refunds`, data);
  },

  getAdminCustomOrderLedger: (id: string) => {
    return apiClient.get<MarketplaceLedgerEntry[]>(
      `/custom-orders/admin/${id}/ledger`,
    );
  },
};
