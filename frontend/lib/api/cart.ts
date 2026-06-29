import { apiClient } from './client';
import type {
  Cart,
  Product,
  ProductPersonalization,
  ProductSelectedOptions,
} from '@/types';

export type CartItemPersonalizationInput = ProductPersonalization;
export type CartItemSelectedOptionsInput = ProductSelectedOptions;

export interface RawCartItemResponse {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  personalization?: ProductPersonalization | null;
  selectedOptions?: ProductSelectedOptions | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteManyResponse {
  count: number;
}

export interface EligibleCartVoucher {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  scope: 'platform' | 'shop';
  sellerId?: string | null;
  sellerName?: string | null;
  categoryId: string;
  categoryName?: string | null;
  endDate: string;
  discountPercent: number;
  minPrice: number;
  maxPrice?: number | null;
  maxDiscountAmount?: number | null;
  eligibleSubtotal: number;
  estimatedDiscountAmount: number;
}

export interface IneligibleCartVoucher {
  id: string;
  code: string;
  reason: string;
}

export interface EligibleCartVouchersResponse {
  platformVouchers: EligibleCartVoucher[];
  shopVouchers: EligibleCartVoucher[];
  ineligibleVouchers: IneligibleCartVoucher[];
}

export const cartApi = {
  getCart: () => apiClient.get<Cart>('/cart'),

  addItem: (
    productId: string,
    quantity: number = 1,
    personalization?: CartItemPersonalizationInput,
    selectedOptions?: CartItemSelectedOptionsInput,
  ) =>
    apiClient.post<RawCartItemResponse>('/cart/items', {
      productId,
      quantity,
      ...(personalization !== undefined ? { personalization } : {}),
      ...(selectedOptions !== undefined ? { selectedOptions } : {}),
    }),

  updateItem: (
    productId: string,
    quantity: number,
    personalization?: CartItemPersonalizationInput,
    selectedOptions?: CartItemSelectedOptionsInput,
  ) =>
    apiClient.patch<RawCartItemResponse | DeleteManyResponse>(`/cart/items/${productId}`, {
      quantity,
      ...(personalization !== undefined ? { personalization } : {}),
      ...(selectedOptions !== undefined ? { selectedOptions } : {}),
    }),

  removeItem: (productId: string) =>
    apiClient.delete<DeleteManyResponse>(`/cart/items/${productId}`),

  clearCart: () => apiClient.delete<DeleteManyResponse>('/cart'),

  getSuggestions: () => apiClient.get<Product[]>('/cart/suggestions'),

  getEligibleVouchers: () =>
    apiClient.get<EligibleCartVouchersResponse>('/cart/eligible-vouchers'),

  applyVoucher: (code: string) =>
    apiClient.post<Cart>('/cart/apply-voucher', { code }),

  removeVoucher: () =>
    apiClient.post<Cart>('/cart/remove-voucher'),
};
