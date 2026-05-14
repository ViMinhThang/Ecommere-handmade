import { apiClient } from './client';
import type {
  Product as BaseProduct,
  InventoryInfo,
  InventoryLog,
  ProductQuestion,
  ProductQuestionsResponse,
  CreateProductQuestionInput,
  AnswerProductQuestionInput,
} from '@/types';

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

export interface LowStockMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LowStockResponse {
  data: Product[];
  meta: LowStockMeta;
}

type LowStockApiResponse =
  | Product[]
  | {
      data: Product[];
      meta?: Partial<LowStockMeta>;
    };

function normalizeLowStockResponse(
  payload: LowStockApiResponse,
  page?: number,
  limit?: number,
): LowStockResponse {
  const fallbackPage = page && page > 0 ? Math.floor(page) : 1;
  const fallbackLimit = limit && limit > 0 ? Math.floor(limit) : 20;

  if (Array.isArray(payload)) {
    const total = payload.length;
    return {
      data: payload,
      meta: {
        page: fallbackPage,
        limit: fallbackLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / fallbackLimit),
      },
    };
  }

  const data = Array.isArray(payload.data) ? payload.data : [];
  const rawMeta = payload.meta;
  const total =
    typeof rawMeta?.total === 'number' && Number.isFinite(rawMeta.total)
      ? rawMeta.total
      : data.length;
  const normalizedLimit =
    typeof rawMeta?.limit === 'number' &&
    Number.isFinite(rawMeta.limit) &&
    rawMeta.limit > 0
      ? Math.floor(rawMeta.limit)
      : fallbackLimit;
  const normalizedPage =
    typeof rawMeta?.page === 'number' &&
    Number.isFinite(rawMeta.page) &&
    rawMeta.page > 0
      ? Math.floor(rawMeta.page)
      : fallbackPage;
  const totalPages =
    typeof rawMeta?.totalPages === 'number' &&
    Number.isFinite(rawMeta.totalPages) &&
    rawMeta.totalPages >= 0
      ? Math.floor(rawMeta.totalPages)
      : total === 0
        ? 0
        : Math.ceil(total / normalizedLimit);

  return {
    data,
    meta: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages,
    },
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

  getLowStock: async (sellerId?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (sellerId) params.set('sellerId', sellerId);
    if (page) params.set('page', page.toString());
    if (limit) params.set('limit', limit.toString());
    const query = params.toString();
    const response = await apiClient.get<LowStockApiResponse>(
      `/products/low-stock${query ? `?${query}` : ''}`,
    );
    return normalizeLowStockResponse(response, page, limit);
  },

  getBestSellingProducts: (limit = 10) =>
    apiClient.get<Product[]>(`/products/best-selling?limit=${limit}`),

  getMostViewedProducts: (limit = 10) =>
    apiClient.get<Product[]>(`/products/most-viewed?limit=${limit}`),

  getOne: (id: string) => apiClient.get<Product>(`/products/${id}`),

  getQuestions: (
    productId: string,
    params?: { page?: number; limit?: number },
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();

    return apiClient.get<ProductQuestionsResponse>(
      `/products/${productId}/questions${queryString ? `?${queryString}` : ''}`,
    );
  },

  createQuestion: (productId: string, data: CreateProductQuestionInput) =>
    apiClient.post<ProductQuestion>(`/products/${productId}/questions`, data),

  answerQuestion: (questionId: string, data: AnswerProductQuestionInput) =>
    apiClient.patch<ProductQuestion>(
      `/products/questions/${questionId}/answer`,
      data,
    ),

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
