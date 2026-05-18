import { apiClient } from "./client";
import { FlashSale } from "@/types";

export interface CreateFlashSaleDto {
  name: string;
  description?: string;
  banner?: string;
  startAt: string;
  endAt: string;
  isActive?: boolean;
  saleState?: "ACTIVE" | "PAUSED" | "ENDED";
  pausedReason?: string;
  maxUnits?: number;
  perUserLimit?: number;
  reserveStock?: number;
  autoPauseThreshold?: number;
  categoryIds: string[];
  ranges: {
    minPrice: number;
    maxPrice: number;
    discountPercent: number;
    endDate: string;
  }[];
}

export interface UpdateFlashSaleDto {
  name?: string;
  description?: string;
  banner?: string;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
  saleState?: "ACTIVE" | "PAUSED" | "ENDED";
  pausedReason?: string;
  maxUnits?: number;
  perUserLimit?: number;
  reserveStock?: number;
  autoPauseThreshold?: number;
  categoryIds?: string[];
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

export const flashSalesApi = {
  getAll: () => apiClient.get<FlashSale[]>("/flash-sales"),

  getAdminAll: () => apiClient.get<FlashSale[]>("/flash-sales/admin/all"),

  getActive: () => apiClient.get<FlashSale[]>("/flash-sales/active"),

  getOne: (id: string) => apiClient.get<FlashSale>(`/flash-sales/${id}`),

  create: (data: CreateFlashSaleDto) =>
    apiClient.post<FlashSale>("/flash-sales", data),

  update: (id: string, data: UpdateFlashSaleDto) =>
    apiClient.patch<FlashSale>(`/flash-sales/${id}`, data),

  delete: (id: string) => apiClient.delete<void>(`/flash-sales/${id}`),
};
