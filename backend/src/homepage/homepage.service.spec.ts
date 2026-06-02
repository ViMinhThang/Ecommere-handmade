import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductStatus } from '@prisma/client';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { HomepageService } from './homepage.service';

describe('HomepageService', () => {
  let service: HomepageService;

  const mockPrisma = {
    homepageBanner: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    homepageFeaturedProduct: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
  };

  const mockFlashSales = {
    calculateEffectivePrice: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockFlashSales.calculateEffectivePrice.mockResolvedValue({
      originalPrice: 100000,
      discountedPrice: 100000,
      discountPercent: 0,
      flashSaleId: null,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomepageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FlashSalesService, useValue: mockFlashSales },
      ],
    }).compile();

    service = module.get(HomepageService);
  });

  it('returns only public homepage data queried through active filters', async () => {
    mockPrisma.homepageBanner.findMany.mockResolvedValue([
      { id: 'banner_1', title: 'Hero' },
    ]);
    mockPrisma.homepageFeaturedProduct.findMany.mockResolvedValue([
      {
        id: 'featured_1',
        product: {
          id: 'product_1',
          price: 100000,
          categoryId: 'category_1',
        },
      },
    ]);

    const result = await service.getPublicHomepage();

    expect(result.banners).toHaveLength(1);
    expect(result.featuredProducts).toHaveLength(1);
    expect(mockPrisma.homepageBanner.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
        }),
      }),
    );
    expect(mockPrisma.homepageFeaturedProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          product: expect.objectContaining({
            status: ProductStatus.APPROVED,
            deletedAt: null,
          }),
        }),
      }),
    );
  });

  it('rejects duplicate featured products', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'product_1' });
    mockPrisma.homepageFeaturedProduct.findUnique.mockResolvedValue({
      id: 'featured_1',
    });

    await expect(
      service.createFeaturedProduct({ productId: 'product_1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects invalid banner schedule', async () => {
    await expect(
      service.createBanner({
        title: 'Hero',
        imageUrl: 'https://example.com/hero.jpg',
        startAt: '2026-05-26T00:00:00.000Z',
        endAt: '2026-05-25T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
