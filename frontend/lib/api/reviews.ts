import { apiClient } from './client';
import type { ProductImage } from '@/types';

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  images: string[];
  sellerReply?: string;
  userId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  productId: string;
  product: {
    name: string;
    images?: ProductImage[];
  };
  orderItemId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewDto {
  productId: string;
  orderItemId: string;
  rating: number;
  comment?: string;
  images?: string[];
}

export interface ShopReview {
  id: string;
  sellerId: string;
  customerId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

export interface ShopReviewSummary {
  sellerId: string;
  averageRating: number | null;
  totalReviews: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ShopReviewStatus {
  canReview: boolean;
  hasReviewed: boolean;
  review: ShopReview | null;
  reason: string | null;
}

export interface CreateShopReviewDto {
  rating: number;
  comment?: string;
}

export interface ShopReviewsResponse {
  data: ShopReview[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const reviewsApi = {
  createReview: (data: CreateReviewDto) => {
    return apiClient.post<Review>('/reviews', data);
  },

  getProductReviews: (productId: string) => {
    return apiClient.get<Review[]>(`/reviews/product/${productId}`);
  },

  sellerReply: (reviewId: string, reply: string) => {
    return apiClient.patch<Review>(`/reviews/${reviewId}/reply`, { reply });
  },

  getSellerLatestReviews: () => {
    return apiClient.get<Review[]>('/reviews/seller/latest');
  },

  getShopReviews: (
    sellerId: string,
    params?: { page?: number; limit?: number },
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();
    return apiClient.get<ShopReviewsResponse>(
      `/sellers/${sellerId}/reviews${queryString ? `?${queryString}` : ''}`,
    );
  },

  getShopReviewSummary: (sellerId: string) => {
    return apiClient.get<ShopReviewSummary>(
      `/sellers/${sellerId}/reviews/summary`,
    );
  },

  getMyShopReviewStatus: (sellerId: string) => {
    return apiClient.get<ShopReviewStatus>(`/sellers/${sellerId}/reviews/me`);
  },

  createShopReview: (sellerId: string, data: CreateShopReviewDto) => {
    return apiClient.post<ShopReview>(`/sellers/${sellerId}/reviews`, data);
  },
};
