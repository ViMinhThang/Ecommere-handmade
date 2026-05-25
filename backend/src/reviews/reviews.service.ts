import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomOrderStatus,
  OrderStatus,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateShopReviewDto } from './dto/create-shop-review.dto';
import { ListShopReviewsQueryDto } from './dto/list-shop-reviews-query.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, data: CreateReviewDto) {
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

    if (data.productId && data.productId !== orderItem.productId) {
      throw new BadRequestException(
        'Product does not match the purchased order item',
      );
    }

    // 2. Check if sub-order is DELIVERED
    if (orderItem.subOrder.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Bạn chỉ có thể đánh giá sau khi nhận được hàng',
      );
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
        productId: orderItem.productId,
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

  async sellerReply(
    sellerId: string,
    roles: string[],
    reviewId: string,
    reply: string,
  ) {
    if (!roles.includes(Role.ROLE_SELLER)) {
      throw new ForbiddenException('Seller role is required');
    }

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

  async listShopReviews(sellerId: string, query: ListShopReviewsQueryDto) {
    await this.assertReviewableSeller(sellerId);

    const page = Math.max(query.page ?? 1, 1);
    const limit = this.normalizeShopReviewLimit(query.limit);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.shopReview.findMany({
        where: { sellerId },
        select: this.shopReviewPublicSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shopReview.count({ where: { sellerId } }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getShopReviewSummary(sellerId: string) {
    await this.assertReviewableSeller(sellerId);

    const [aggregate, ratingGroups] = await Promise.all([
      this.prisma.shopReview.aggregate({
        where: { sellerId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.shopReview.groupBy({
        by: ['rating'],
        where: { sellerId },
        _count: { rating: true },
      }),
    ]);

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingGroups.forEach((group) => {
      if (group.rating >= 1 && group.rating <= 5) {
        breakdown[group.rating as 1 | 2 | 3 | 4 | 5] = group._count.rating;
      }
    });

    const averageRating = aggregate._avg.rating;

    return {
      sellerId,
      averageRating:
        averageRating === null ? null : Math.round(averageRating * 10) / 10,
      totalReviews: aggregate._count._all,
      breakdown,
    };
  }

  async getMyShopReviewStatus(
    customerId: string,
    roles: string[],
    sellerId: string,
  ) {
    await this.assertReviewableSeller(sellerId);

    const existingReview = await this.prisma.shopReview.findUnique({
      where: {
        customerId_sellerId: {
          customerId,
          sellerId,
        },
      },
      select: this.shopReviewPublicSelect,
    });

    if (existingReview) {
      return {
        canReview: false,
        hasReviewed: true,
        review: existingReview,
        reason: 'Bạn đã đánh giá gian hàng này rồi',
      };
    }

    const eligibility = await this.getShopReviewEligibility(
      customerId,
      roles,
      sellerId,
    );

    return {
      canReview: eligibility.canReview,
      hasReviewed: false,
      review: null,
      reason: eligibility.reason,
    };
  }

  async createShopReview(
    customerId: string,
    roles: string[],
    sellerId: string,
    data: CreateShopReviewDto,
  ) {
    await this.assertReviewableSeller(sellerId);

    const eligibility = await this.getShopReviewEligibility(
      customerId,
      roles,
      sellerId,
    );

    if (!eligibility.canReview) {
      if (roles.includes(Role.ROLE_ADMIN) || !roles.includes(Role.ROLE_USER)) {
        throw new ForbiddenException(eligibility.reason);
      }

      throw new BadRequestException(eligibility.reason);
    }

    const existingReview = await this.prisma.shopReview.findUnique({
      where: {
        customerId_sellerId: {
          customerId,
          sellerId,
        },
      },
      select: { id: true },
    });

    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá gian hàng này rồi');
    }

    try {
      return await this.prisma.shopReview.create({
        data: {
          sellerId,
          customerId,
          rating: data.rating,
          comment: data.comment?.trim() || null,
        },
        select: this.shopReviewPublicSelect,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new BadRequestException('Bạn đã đánh giá gian hàng này rồi');
      }

      throw error;
    }
  }

  private readonly shopReviewPublicSelect = {
    id: true,
    sellerId: true,
    customerId: true,
    rating: true,
    comment: true,
    createdAt: true,
    updatedAt: true,
    customer: {
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    },
  } as const;

  private normalizeShopReviewLimit(limit?: number) {
    if (!limit || !Number.isFinite(limit)) {
      return 10;
    }

    return Math.min(Math.max(Math.floor(limit), 1), 50);
  }

  private async assertReviewableSeller(sellerId: string) {
    const seller = await this.prisma.user.findFirst({
      where: {
        id: sellerId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        roles: { has: Role.ROLE_SELLER },
        NOT: {
          roles: { has: Role.ROLE_ADMIN },
        },
      },
      select: { id: true },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
  }

  private async getShopReviewEligibility(
    customerId: string,
    roles: string[],
    sellerId: string,
  ) {
    if (!roles.includes(Role.ROLE_USER)) {
      return {
        canReview: false,
        reason: 'Customer role is required',
      };
    }

    if (roles.includes(Role.ROLE_ADMIN)) {
      return {
        canReview: false,
        reason: 'Admin không thể đánh giá gian hàng trong MVP',
      };
    }

    if (customerId === sellerId) {
      return {
        canReview: false,
        reason: 'Bạn không thể đánh giá gian hàng của chính mình',
      };
    }

    const [deliveredSubOrder, deliveredCustomOrder] = await Promise.all([
      this.prisma.subOrder.findFirst({
        where: {
          sellerId,
          status: OrderStatus.DELIVERED,
          order: {
            customerId,
          },
        },
        select: { id: true },
      }),
      this.prisma.customOrder.findFirst({
        where: {
          sellerId,
          customerId,
          status: CustomOrderStatus.DELIVERED,
        },
        select: { id: true },
      }),
    ]);

    if (!deliveredSubOrder && !deliveredCustomOrder) {
      return {
        canReview: false,
        reason: 'Chỉ khách đã nhận hàng từ shop mới có thể đánh giá',
      };
    }

    return {
      canReview: true,
      reason: null,
    };
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
