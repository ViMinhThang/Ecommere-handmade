import { apiClient } from "./client";
import type { WishlistItem, WishlistStatus } from "@/types";

export const wishlistApi = {
  getAll: () => apiClient.get<WishlistItem[]>("/wishlist"),

  getStatus: (productId: string) =>
    apiClient.get<WishlistStatus>(`/wishlist/items/${productId}`),

  addItem: (productId: string) =>
    apiClient.post<WishlistItem>(`/wishlist/items/${productId}`),

  removeItem: (productId: string) =>
    apiClient.delete<WishlistStatus>(`/wishlist/items/${productId}`),
};
