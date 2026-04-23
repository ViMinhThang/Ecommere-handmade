import { apiClient } from './client';
import type { Voucher } from '@/types';

export interface CreateVoucherDto {
  name: string;
  description?: string;
  code: string;
  categoryId: string;
  isActive?: boolean;
  endDate: string;
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
  isActive?: boolean;
  endDate?: string;
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

  getById: (id: string) => apiClient.get<Voucher>(`/vouchers/${id}`),

  getByCode: (code: string) => apiClient.get<Voucher>(`/vouchers/code/${code}`),

  create: (data: CreateVoucherDto) => apiClient.post<Voucher>('/vouchers', data),

  update: (id: string, data: UpdateVoucherDto) => apiClient.patch<Voucher>(`/vouchers/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/vouchers/${id}`),
};