import { apiClient } from './client';
import { Category, CategoryStatus } from '@/types';

interface CategoriesResponse {
  total: number;
  active: number;
  inactive: number;
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

export const categoriesApi = {
  getAll: (params?: { status?: CategoryStatus; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return apiClient.get<PaginatedResponse<Category>>(`/categories${query.toString() ? `?${query}` : ''}`);
  },

  getById: (id: string) => apiClient.get<Category>(`/categories/${id}`),

  create: (data: Partial<Category>) => apiClient.post<Category>('/categories', data),

  update: (id: string, data: Partial<Category>) => apiClient.patch<Category>(`/categories/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/categories/${id}`),

  getStats: () => apiClient.get<CategoriesResponse>('/categories/stats'),
};