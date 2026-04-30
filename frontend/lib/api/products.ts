import { apiClient } from './client';
import type { Product as BaseProduct, InventoryInfo, InventoryLog } from '@/types';

// Extended Product interface for local overrides if needed
export type Product = BaseProduct & {
  viewCount?: number;
  soldQuantity?: number;
};

export type { InventoryInfo, InventoryLog };

export type InventoryChangeReason = 'ORDER' | 'MANUAL' | 'RESTOCK' | 'RETURN';

export interface UpdateStockDto {
  quantity: number;
  reason: InventoryChangeReason;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  images: { url: string; isMain: boolean }[];
  descriptionImages?: string[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  stock?: number;
  lowStockThreshold?: number;
  sku?: string;
}

export interface ProductsStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
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

export const productsApi = {
  getAll: (params?: { 
    status?: string; 
    categoryId?: string; 
    sellerId?: string; 
    page?: number; 
    limit?: number;
    minPrice?: number;
    maxPrice?: number;
    tag?: string;
    readyToShip?: boolean;
    sortBy?: string;
    order?: 'asc' | 'desc';
    brand?: string;
    type?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.set(key, String(value));
        }
      });
    }
    const queryString = query.toString();
    return apiClient.get<PaginatedResponse<Product>>(`/products${queryString ? `?${queryString}` : ''}`);
  },

  getStats: () => apiClient.get<ProductsStats>('/products/stats'),

  getBySeller: (sellerId: string) => apiClient.get<Product[]>(`/products/seller/${sellerId}`),

  getLowStock: (sellerId?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (sellerId) params.set('sellerId', sellerId);
    if (page) params.set('page', page.toString());
    if (limit) params.set('limit', limit.toString());
    const query = params.toString();
    return apiClient.get<{ data: Product[]; meta?: { page: number; limit: number; total: number; totalPages: number } }>(`/products/low-stock${query ? `?${query}` : ''}`);
  },

  getBestSellingProducts: (limit = 10) =>
    apiClient.get<Product[]>(`/products/best-selling?limit=${limit}`),

  getMostViewedProducts: (limit = 10) =>
    apiClient.get<Product[]>(`/products/most-viewed?limit=${limit}`),

  getOne: (id: string) => apiClient.get<Product>(`/products/${id}`),

  create: (data: CreateProductDto) => apiClient.post<Product>('/products', data),

  update: (id: string, data: Partial<CreateProductDto>) => apiClient.patch<Product>(`/products/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/products/${id}`),

  getInventory: (id: string) => apiClient.get<InventoryInfo>(`/products/${id}/inventory`),

  updateStock: (id: string, data: UpdateStockDto) => apiClient.patch<Product>(`/products/${id}/stock`, data),

  getInventoryLog: (id: string) => apiClient.get<InventoryLog[]>(`/products/${id}/inventory-log`),

  updateStatus: (id: string, status: 'APPROVED' | 'REJECTED') => apiClient.patch<Product>(`/products/${id}`, { status }),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ url: string; fileName: string }>('/products/upload', formData);
  },

  recordView: (id: string) => apiClient.post<void>(`/products/${id}/view`),
};
