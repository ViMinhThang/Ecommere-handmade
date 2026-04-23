import { apiClient } from './client';

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
    images?: any[];
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
};
