import { apiClient } from "./client";
import type { GiftWrapTier } from "@/types";

export interface CreateGiftWrapTierDto {
  name: string;
  description?: string | null;
  price: number;
  includesCard?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateGiftWrapTierDto = Partial<CreateGiftWrapTierDto>;

export const giftWrapTiersApi = {
  getPublic: () => apiClient.get<GiftWrapTier[]>("/gift-wrap-tiers"),
  getAdminAll: () => apiClient.get<GiftWrapTier[]>("/admin/gift-wrap-tiers"),
  create: (data: CreateGiftWrapTierDto) =>
    apiClient.post<GiftWrapTier>("/admin/gift-wrap-tiers", data),
  update: (id: string, data: UpdateGiftWrapTierDto) =>
    apiClient.patch<GiftWrapTier>(`/admin/gift-wrap-tiers/${id}`, data),
  delete: (id: string) =>
    apiClient.delete<{ success: true }>(`/admin/gift-wrap-tiers/${id}`),
};
