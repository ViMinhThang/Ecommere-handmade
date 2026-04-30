import { apiClient } from './client';
import type { Order, SubOrder } from '@/types';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'STRIPE' | 'COD';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'COD_PENDING' | 'FAILED';

export interface AdminOrderFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  customer?: string;
  seller?: string;
}

export const ordersApi = {
  getMyOrders: () => apiClient.get<SubOrder[]>('/orders/my-orders'),

  getSubOrder: (id: string) => apiClient.get<SubOrder>(`/orders/sub-order/${id}`),

  getSellerOrders: () => apiClient.get<SubOrder[]>('/orders/seller-orders'),

  getOrder: (id: string) => apiClient.get<Order>(`/orders/${id}`),

  getAdminOrders: (filters?: AdminOrderFilters) => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        }
      });
    }

    const query = params.toString();
    return apiClient.get<Order[]>(`/orders/admin${query ? `?${query}` : ''}`);
  },

  getAdminOrder: (id: string) => apiClient.get<Order>(`/orders/admin/${id}`),

  updateSubOrderStatus: (id: string, status: OrderStatus) =>
    apiClient.patch<SubOrder>(`/orders/sub-order/${id}/status`, { status }),

  updateAdminOrderStatus: (id: string, status: OrderStatus) =>
    apiClient.patch<Order>(`/orders/admin/${id}/status`, { status }),

  cancelOrder: (id: string) => apiClient.patch<Order>(`/orders/${id}/cancel`, {}),
};
