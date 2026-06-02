import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShopReviewDto } from './dto/create-shop-review.dto';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrisma = {
    orderItem: {
      findUnique: jest.fn(),
    },
    review: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    subOrder: {
      findFirst: jest.fn(),
    },
    customOrder: {
      findFirst: jest.fn(),
    },
    shopReview: {
      aggregate: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('rejects spoofed productId when creating a review', async () => {
    mockPrisma.orderItem.findUnique.mockResolvedValue({
      id: 'item_1',
      productId: 'product_a',
      subOrder: {
        status: OrderStatus.DELIVERED,
        order: { customerId: 'customer_1' },
      },
    });

    await expect(
      service.createReview('customer_1', {
        orderItemId: 'item_1',
        productId: 'product_b',
        rating: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows only the owning seller to reply to a review', async () => {
    mockPrisma.review.findUnique.mockResolvedValue({
      id: 'review_1',
      product: { sellerId: 'seller_1' },
    });

    await expect(
      service.sellerReply('seller_2', ['ROLE_SELLER'], 'review_1', 'Thanks'),
    ).rejects.toThrow(ForbiddenException);
  });

  describe('shop reviews', () => {
    beforeEach(() => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'seller_1' });
      mockPrisma.shopReview.findUnique.mockResolvedValue(null);
      mockPrisma.subOrder.findFirst.mockResolvedValue(null);
      mockPrisma.customOrder.findFirst.mockResolvedValue(null);
    });

    it('allows a customer with a delivered sub-order to create a shop review', async () => {
      mockPrisma.subOrder.findFirst.mockResolvedValue({ id: 'suborder_1' });
      mockPrisma.shopReview.create.mockResolvedValue({
        id: 'shop_review_1',
        sellerId: 'seller_1',
        customerId: 'customer_1',
        rating: 5,
        comment: 'Shop đóng gói cẩn thận',
      });

      const result = await service.createShopReview(
        'customer_1',
        ['ROLE_USER'],
        'seller_1',
        {
          rating: 5,
          comment: 'Shop đóng gói cẩn thận',
        },
      );

      expect(result.id).toBe('shop_review_1');
      expect(mockPrisma.shopReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sellerId: 'seller_1',
            customerId: 'customer_1',
            rating: 5,
          }),
        }),
      );
    });

    it('allows a customer with a delivered custom order to create a shop review', async () => {
      mockPrisma.customOrder.findFirst.mockResolvedValue({
        id: 'custom_order_1',
      });
      mockPrisma.shopReview.create.mockResolvedValue({
        id: 'shop_review_1',
      });

      await expect(
        service.createShopReview('customer_1', ['ROLE_USER'], 'seller_1', {
          rating: 4,
        }),
      ).resolves.toEqual({ id: 'shop_review_1' });
    });

    it('rejects customers without a delivered transaction', async () => {
      await expect(
        service.createShopReview('customer_1', ['ROLE_USER'], 'seller_1', {
          rating: 5,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.shopReview.create).not.toHaveBeenCalled();
    });

    it('rejects admin shop reviews in MVP', async () => {
      await expect(
        service.createShopReview(
          'admin_1',
          ['ROLE_USER', 'ROLE_SELLER', 'ROLE_ADMIN'],
          'seller_1',
          {
            rating: 5,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects seller self-review', async () => {
      await expect(
        service.createShopReview(
          'seller_1',
          ['ROLE_USER', 'ROLE_SELLER'],
          'seller_1',
          {
            rating: 5,
          },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.subOrder.findFirst).not.toHaveBeenCalled();
    });

    it('rejects duplicate shop reviews', async () => {
      mockPrisma.subOrder.findFirst.mockResolvedValue({ id: 'suborder_1' });
      mockPrisma.shopReview.findUnique.mockResolvedValue({
        id: 'shop_review_1',
      });

      await expect(
        service.createShopReview('customer_1', ['ROLE_USER'], 'seller_1', {
          rating: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects inactive, deleted, or non-seller targets', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createShopReview('customer_1', ['ROLE_USER'], 'seller_1', {
          rating: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lists public shop reviews without private customer fields', async () => {
      mockPrisma.shopReview.findMany.mockResolvedValue([
        {
          id: 'shop_review_1',
          customer: {
            id: 'customer_1',
            name: 'Linh',
            avatar: null,
          },
        },
      ]);
      mockPrisma.shopReview.count.mockResolvedValue(1);

      const result = await service.listShopReviews('seller_1', {
        page: 1,
        limit: 10,
      });

      expect(result.data[0].customer).toEqual({
        id: 'customer_1',
        name: 'Linh',
        avatar: null,
      });
      expect(JSON.stringify(result.data)).not.toContain('email');
      expect(JSON.stringify(result.data)).not.toContain('phone');
    });

    it('calculates shop review summary with average, count, and breakdown', async () => {
      mockPrisma.shopReview.aggregate.mockResolvedValue({
        _avg: { rating: 4.3333 },
        _count: { _all: 3 },
      });
      mockPrisma.shopReview.groupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 2 } },
        { rating: 3, _count: { rating: 1 } },
      ]);

      const result = await service.getShopReviewSummary('seller_1');

      expect(result).toEqual({
        sellerId: 'seller_1',
        averageRating: 4.3,
        totalReviews: 3,
        breakdown: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 },
      });
    });

    it('validates shop review rating range and comment length at DTO boundary', () => {
      const dto = plainToInstance(CreateShopReviewDto, {
        rating: 6,
        comment: 'x'.repeat(1001),
      });

      const errors = validateSync(dto);
      const serializedErrors = JSON.stringify(errors);

      expect(serializedErrors).toContain('max');
      expect(serializedErrors).toContain('maxLength');
    });
  });
});
