import { apiClient } from "./client";
import type { Product } from "@/types";

export interface HomepageBanner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HomepageFeaturedProduct {
  id: string;
  productId: string;
  product: Product;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HomepagePayload {
  banners: HomepageBanner[];
  featuredProducts: Product[];
}

export interface CreateHomepageBannerDto {
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  startAt?: string;
  endAt?: string;
}

export type UpdateHomepageBannerDto = Partial<CreateHomepageBannerDto>;

export interface CreateHomepageFeaturedProductDto {
  productId: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateHomepageFeaturedProductDto =
  Partial<CreateHomepageFeaturedProductDto>;

export const homepageApi = {
  getHomepage: () => apiClient.get<HomepagePayload>("/homepage"),

  getAdminBanners: () =>
    apiClient.get<HomepageBanner[]>("/admin/homepage/banners"),

  createBanner: (data: CreateHomepageBannerDto) =>
    apiClient.post<HomepageBanner>("/admin/homepage/banners", data),

  updateBanner: (id: string, data: UpdateHomepageBannerDto) =>
    apiClient.patch<HomepageBanner>(`/admin/homepage/banners/${id}`, data),

  deleteBanner: (id: string) =>
    apiClient.delete<{ success: true }>(`/admin/homepage/banners/${id}`),

  getAdminFeaturedProducts: () =>
    apiClient.get<HomepageFeaturedProduct[]>(
      "/admin/homepage/featured-products",
    ),

  createFeaturedProduct: (data: CreateHomepageFeaturedProductDto) =>
    apiClient.post<HomepageFeaturedProduct>(
      "/admin/homepage/featured-products",
      data,
    ),

  updateFeaturedProduct: (
    id: string,
    data: UpdateHomepageFeaturedProductDto,
  ) =>
    apiClient.patch<HomepageFeaturedProduct>(
      `/admin/homepage/featured-products/${id}`,
      data,
    ),

  deleteFeaturedProduct: (id: string) =>
    apiClient.delete<{ success: true }>(
      `/admin/homepage/featured-products/${id}`,
    ),
};
