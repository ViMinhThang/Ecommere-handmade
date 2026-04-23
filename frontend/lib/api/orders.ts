import { apiClient } from './client';
import type { SubOrder } from '@/types';

export const ordersApi = {
  getMyOrders: () => apiClient.get<SubOrder[]>('/orders/my-orders'),
  
  getSubOrder: (id: string) => apiClient.get<SubOrder>(`/orders/sub-order/${id}`),

  getSellerOrders: () => apiClient.get<SubOrder[]>('/orders/seller-orders'),

  getOrder: (id: string) => apiClient.get<any>(`/orders/${id}`),

  updateSubOrderStatus: (id: string, status: string) => 
    apiClient.patch<SubOrder>(`/orders/sub-order/${id}/status`, { status }),
};
