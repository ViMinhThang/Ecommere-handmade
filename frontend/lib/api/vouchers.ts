import { apiClient } from './client';
import type { Voucher } from '@/types';

export interface CreateVoucherDto {
  name: string;
  description?: string;
  code: string;
  categoryId: string;
  sellerId?: string | null;
  isActive?: boolean;
  endDate: string;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  ranges: {
    minPrice: number;
    maxPrice: number;
    discountPercent: number;
    endDate: string;
  }[];
}

export interface UpdateVoucherDto {
  name?: string;
  description?: string;
  code?: string;
  categoryId?: string;
  sellerId?: string | null;
  isActive?: boolean;
  endDate?: string;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  ranges?: {
    minPrice: number;
    maxPrice: number;
    discountPercent: number;
    endDate: string;
  }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const vouchersApi = {
  getAll: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return apiClient.get<PaginatedResponse<Voucher>>(`/vouchers${query.toString() ? `?${query}` : ''}`);
  },

  getAdminAll: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return apiClient.get<PaginatedResponse<Voucher>>(`/vouchers/admin/all${query.toString() ? `?${query}` : ''}`);
  },

  getSellerMine: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return apiClient.get<PaginatedResponse<Voucher>>(`/vouchers/seller/mine${query.toString() ? `?${query}` : ''}`);
  },

  getPublicBySeller: (sellerId: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return apiClient.get<PaginatedResponse<Voucher>>(`/vouchers/seller/${sellerId}/public${query.toString() ? `?${query}` : ''}`);
  },

  getById: (id: string) => apiClient.get<Voucher>(`/vouchers/${id}`),

  getByCode: (code: string) => apiClient.get<Voucher>(`/vouchers/code/${code}`),

  create: (data: CreateVoucherDto) => apiClient.post<Voucher>('/vouchers', data),

  update: (id: string, data: UpdateVoucherDto) => apiClient.patch<Voucher>(`/vouchers/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/vouchers/${id}`),

  createSeller: (data: CreateVoucherDto) => apiClient.post<Voucher>('/vouchers/seller', data),

  updateSeller: (id: string, data: UpdateVoucherDto) => apiClient.patch<Voucher>(`/vouchers/seller/${id}`, data),

  deleteSeller: (id: string) => apiClient.delete<void>(`/vouchers/seller/${id}`),
};
