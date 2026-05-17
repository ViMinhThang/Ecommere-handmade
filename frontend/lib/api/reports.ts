import { apiClient } from './client';
import type { Report, ReportListResponse, ReportStatus, ReportType } from '@/types';

export interface CreateReportPayload {
  type: ReportType;
  targetUserId?: string;
  targetProductId?: string;
  orderId?: string;
  reason: string;
  description?: string;
}

export interface AdminReportsQuery {
  status?: ReportStatus;
  type?: ReportType;
  page?: number;
  limit?: number;
}

function toQueryString<T extends object>(params?: T) {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export const reportsApi = {
  create: (data: CreateReportPayload) => apiClient.post<Report>('/reports', data),

  getMyReports: (params?: { page?: number; limit?: number }) =>
    apiClient.get<ReportListResponse>(`/reports/my${toQueryString(params)}`),

  getAdminReports: (params?: AdminReportsQuery) =>
    apiClient.get<ReportListResponse>(
      `/admin/reports${toQueryString(params)}`,
    ),

  updateAdminStatus: (
    id: string,
    data: { status: ReportStatus; adminNote?: string },
  ) => apiClient.patch<Report>(`/admin/reports/${id}/status`, data),
};
