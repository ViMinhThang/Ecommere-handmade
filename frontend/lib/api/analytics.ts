import { apiClient } from './client';

export interface RevenueData {
  date: string;
  revenue: number;
}

export interface CategoryRevenueData {
  name: string;
  value: number;
}

export const analyticsApi = {
  getSellerRevenueOverTime: (startDate: string, endDate: string) => {
    return apiClient.get<RevenueData[]>(`/analytics/seller/revenue-over-time?startDate=${startDate}&endDate=${endDate}`);
  },

  getSellerRevenueByCategory: (month: number, year: number) => {
    return apiClient.get<CategoryRevenueData[]>(`/analytics/seller/revenue-by-category?month=${month}&year=${year}`);
  },
};
