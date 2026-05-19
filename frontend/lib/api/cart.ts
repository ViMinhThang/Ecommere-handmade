import { apiClient } from './client';
import type { Cart, Product } from '@/types';

export interface RawCartItemResponse {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteManyResponse {
  count: number;
}

export const cartApi = {
  getCart: () => apiClient.get<Cart>('/cart'),

  addItem: (productId: string, quantity: number = 1) =>
    apiClient.post<RawCartItemResponse>('/cart/items', { productId, quantity }),

  updateItem: (productId: string, quantity: number) =>
    apiClient.patch<RawCartItemResponse | DeleteManyResponse>(`/cart/items/${productId}`, { quantity }),

  removeItem: (productId: string) =>
    apiClient.delete<DeleteManyResponse>(`/cart/items/${productId}`),

  clearCart: () => apiClient.delete<DeleteManyResponse>('/cart'),

  getSuggestions: () => apiClient.get<Product[]>('/cart/suggestions'),

  applyVoucher: (code: string) =>
    apiClient.post<Cart>('/cart/apply-voucher', { code }),

  removeVoucher: () =>
    apiClient.post<Cart>('/cart/remove-voucher'),
};
