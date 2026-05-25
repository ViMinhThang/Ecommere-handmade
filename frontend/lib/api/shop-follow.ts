import { apiClient } from "./client";

export interface ShopFollowStatus {
  sellerId: string;
  isFollowing: boolean;
  followerCount: number;
}

export interface FollowedShopSeller {
  id: string;
  name: string;
  avatar?: string | null;
  shopName?: string | null;
  sellerTitle?: string | null;
  sellerBio?: string | null;
  sellerHeroImage?: string | null;
  createdAt: string;
  updatedAt: string;
  followerCount: number;
}

export interface FollowedShop {
  id: string;
  sellerId: string;
  createdAt: string;
  seller: FollowedShopSeller;
}

export const shopFollowApi = {
  getStatus: (sellerId: string) =>
    apiClient.get<ShopFollowStatus>(`/sellers/${sellerId}/follow-status`),

  follow: (sellerId: string) =>
    apiClient.post<ShopFollowStatus>(`/sellers/${sellerId}/follow`),

  unfollow: (sellerId: string) =>
    apiClient.delete<ShopFollowStatus>(`/sellers/${sellerId}/follow`),

  getFollowedShops: () =>
    apiClient.get<FollowedShop[]>("/sellers/following/me"),
};
