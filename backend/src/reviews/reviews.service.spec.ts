import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
});
