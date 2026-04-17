import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, data: {
    productId: string;
    orderItemId: string;
    rating: number;
    comment?: string;
    images?: string[];
  }) {
    // 1. Check if the orderItem exists and belongs to the user via Order -> customerId
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: data.orderItemId },
      include: {
        subOrder: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Không tìm thấy vật phẩm đơn hàng');
    }

    if (orderItem.subOrder.order.customerId !== userId) {
      throw new ForbiddenException('Bạn không có quyền đánh giá vật phẩm này');
    }

    // 2. Check if sub-order is DELIVERED
    if (orderItem.subOrder.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Bạn chỉ có thể đánh giá sau khi nhận được hàng');
    }

    // 3. Prevent duplicate reviews for the same orderItem
    const existingReview = await this.prisma.review.findUnique({
      where: { orderItemId: data.orderItemId },
    });

    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá vật phẩm này rồi');
    }

    // 4. Create Review
    return this.prisma.review.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        images: data.images || [],
        userId,
        productId: data.productId,
        orderItemId: data.orderItemId,
      },
    });
  }

  async getReviewsByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async sellerReply(sellerId: string, reviewId: string, reply: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (review.product.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền phản hồi đánh giá này');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        sellerReply: reply,
      },
    });
  }

  async getLatestReviewsForSeller(sellerId: string, limit = 10) {
    return this.prisma.review.findMany({
      where: {
        product: {
          sellerId,
        },
      },
      include: {
        user: {
          select: { name: true, avatar: true },
        },
        product: {
          select: { name: true },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
