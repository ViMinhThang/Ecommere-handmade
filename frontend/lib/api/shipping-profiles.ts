import { apiClient } from "./client";
import type { ShippingProfile } from "@/types";

export interface CreateShippingProfileDto {
  name: string;
  carrierName: string;
  trackingUrlTemplate?: string | null;
  processingMinDays: number;
  processingMaxDays: number;
  transitMinDays: number;
  transitMaxDays: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export type UpdateShippingProfileDto = Partial<CreateShippingProfileDto>;

export const shippingProfilesApi = {
  listMine: () => apiClient.get<ShippingProfile[]>("/shipping-profiles/me"),

  create: (data: CreateShippingProfileDto) =>
    apiClient.post<ShippingProfile>("/shipping-profiles", data),

  update: (id: string, data: UpdateShippingProfileDto) =>
    apiClient.patch<ShippingProfile>(`/shipping-profiles/${id}`, data),

  setDefault: (id: string) =>
    apiClient.patch<ShippingProfile>(`/shipping-profiles/${id}/default`, {}),

  delete: (id: string) =>
    apiClient.delete<{ success: true }>(`/shipping-profiles/${id}`),
};
