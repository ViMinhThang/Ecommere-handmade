import { apiClient } from './client';
import type { Cart, Product } from '@/types';

export const cartApi = {
  getCart: () => apiClient.get<Cart>('/cart'),

  addItem: (productId: string, quantity: number = 1) =>
    apiClient.post<Cart>('/cart/items', { productId, quantity }),

  updateItem: (productId: string, quantity: number) =>
    apiClient.patch<Cart>(`/cart/items/${productId}`, { quantity }),

  removeItem: (productId: string) =>
    apiClient.delete<Cart>(`/cart/items/${productId}`),

  clearCart: () => apiClient.delete<void>('/cart'),

  getSuggestions: () => apiClient.get<Product[]>('/cart/suggestions'),

  applyVoucher: (code: string) =>
    apiClient.post<Cart>('/cart/apply-voucher', { code }),

  removeVoucher: () =>
    apiClient.post<Cart>('/cart/remove-voucher'),
};
