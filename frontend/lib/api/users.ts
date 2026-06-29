import { apiClient } from './client';
import {
  User,
  UserRole,
  UserStatus,
  Address,
  SellerSearchParams,
  SellerSearchResponse,
} from '@/types';

interface UsersResponse {
  total: number;
  admins: number;
  sellers: number;
  customers: number;
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

const MAX_PAGINATION_LIMIT = 50;

function normalizeLimit(limit?: number) {
  if (!limit || !Number.isFinite(limit)) {
    return undefined;
  }

  return Math.min(Math.max(Math.floor(limit), 1), MAX_PAGINATION_LIMIT);
}

export const usersApi = {
  getAll: (params?: { role?: UserRole; status?: UserStatus; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    const limit = normalizeLimit(params?.limit);
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (limit) query.set('limit', String(limit));
    return apiClient.get<PaginatedResponse<User>>(`/users${query.toString() ? `?${query}` : ''}`);
  },

  getCustomers: (params?: { q?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    const limit = normalizeLimit(params?.limit);
    if (params?.q?.trim()) query.set('q', params.q.trim());
    if (params?.page) query.set('page', String(params.page));
    if (limit) query.set('limit', String(limit));
    return apiClient.get<PaginatedResponse<User>>(
      `/users/customers${query.toString() ? `?${query}` : ''}`,
    );
  },

  getById: (id: string) => apiClient.get<User>(`/users/${id}`),

  getMe: () => apiClient.get<User>('/users/me'),

  getSellerById: (id: string) => apiClient.get<User>(`/sellers/${id}`),

  searchSellers: (params?: SellerSearchParams) => {
    const query = new URLSearchParams();
    const limit = normalizeLimit(params?.limit);
    if (params?.q?.trim()) query.set('q', params.q.trim());
    if (params?.page) query.set('page', String(params.page));
    if (limit) query.set('limit', String(limit));
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

    const queryString = query.toString();
    return apiClient.get<SellerSearchResponse>(
      `/sellers/search${queryString ? `?${queryString}` : ''}`,
    );
  },

  create: (data: Partial<User>) => apiClient.post<User>('/users', data),

  update: (id: string, data: Partial<User>) => apiClient.patch<User>(`/users/${id}`, data),

  updateProfile: (data: Partial<User>) => apiClient.patch<User>('/users/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.patch<{ success: boolean }>('/users/account/password', data),

  delete: (id: string) => apiClient.delete<void>(`/users/${id}`),

  getStats: () => apiClient.get<UsersResponse>('/users/stats'),

  getAddresses: (userId: string) => apiClient.get<Address[]>(`/users/${userId}/addresses`),

  addAddress: (userId: string, data: Partial<Address>) => apiClient.post<Address>(`/users/${userId}/addresses`, data),

  updateAddress: (userId: string, addressId: string, data: Partial<Address>) => 
    apiClient.patch<Address>(`/users/${userId}/addresses/${addressId}`, data),

  deleteAddress: (userId: string, addressId: string) => 
    apiClient.delete<void>(`/users/${userId}/addresses/${addressId}`),
};
