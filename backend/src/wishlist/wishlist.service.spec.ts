import { Test, TestingModule } from '@nestjs/testing';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import { NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: jest.Mocked<PrismaService>;
  let flashSalesService: jest.Mocked<FlashSalesService>;

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    price: 100000,
    categoryId: 'cat-1',
    status: ProductStatus.APPROVED,
    deletedAt: null,
    images: [],
    category: { id: 'cat-1', name: 'Category', slug: 'category' },
    seller: {
      id: 'seller-1',
      name: 'Seller',
      shopName: 'Shop',
      avatar: null,
    },
  };

  const mockWishlistItem = {
    id: 'wishlist-1',
    userId: 'user-1',
    productId: 'product-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProduct,
  };

  beforeEach(async () => {
    const mockPrisma = {
      wishlistItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
    };

    const mockFlashSales = {
      calculateEffectivePrice: jest.fn().mockResolvedValue({
        originalPrice: 100000,
        discountedPrice: 100000,
        discountPercent: 0,
        flashSaleId: null,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FlashSalesService, useValue: mockFlashSales },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    prisma = module.get(PrismaService);
    flashSalesService = module.get(FlashSalesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return wishlist items with pricing', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([mockWishlistItem]);

      const result = await service.list('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].product.pricing).toBeDefined();
      expect(result[0].product.pricing.originalPrice).toBe(100000);
      expect(prisma.wishlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            product: {
              deletedAt: null,
              status: ProductStatus.APPROVED,
            },
          }),
        }),
      );
    });

    it('should only return APPROVED products', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([]);

      await service.list('user-1');

      expect(prisma.wishlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            product: expect.objectContaining({
              status: ProductStatus.APPROVED,
            }),
          }),
        }),
      );
    });

    it('should call flash sales service for pricing', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([mockWishlistItem]);

      await service.list('user-1');

      expect(flashSalesService.calculateEffectivePrice).toHaveBeenCalledWith(
        100000,
        'cat-1',
      );
    });
  });

  describe('getProductStatus', () => {
    it('should return true if product is wishlisted', async () => {
      prisma.wishlistItem.count.mockResolvedValue(1);

      const result = await service.getProductStatus('user-1', 'product-1');

      expect(result).toEqual({
        productId: 'product-1',
        isWishlisted: true,
      });
    });

    it('should return false if product is not wishlisted', async () => {
      prisma.wishlistItem.count.mockResolvedValue(0);

      const result = await service.getProductStatus('user-1', 'product-1');

      expect(result).toEqual({
        productId: 'product-1',
        isWishlisted: false,
      });
    });

    it('should only count APPROVED products', async () => {
      prisma.wishlistItem.count.mockResolvedValue(0);

      await service.getProductStatus('user-1', 'product-1');

      expect(prisma.wishlistItem.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          product: {
            deletedAt: null,
            status: ProductStatus.APPROVED,
          },
        }),
      });
    });
  });

  describe('add', () => {
    it('should add product to wishlist', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.wishlistItem.findUnique.mockResolvedValue(null);
      prisma.wishlistItem.create.mockResolvedValue(mockWishlistItem);

      const result = await service.add('user-1', 'product-1');

      expect(result.product.pricing).toBeDefined();
      expect(prisma.wishlistItem.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          productId: 'product-1',
        },
        include: expect.any(Object),
      });
    });

    it('should return existing item if already wishlisted (idempotent)', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.wishlistItem.findUnique.mockResolvedValue(mockWishlistItem);

      const result = await service.add('user-1', 'product-1');

      expect(result.product.pricing).toBeDefined();
      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.add('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.wishlistItem.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if product is not APPROVED', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.add('user-1', 'pending-product')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if product is deleted', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.add('user-1', 'deleted-product')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove product from wishlist', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.remove('user-1', 'product-1');

      expect(result).toEqual({
        productId: 'product-1',
        isWishlisted: false,
      });
      expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          productId: 'product-1',
        },
      });
    });

    it('should be idempotent (no error if not wishlisted)', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.remove('user-1', 'product-1');

      expect(result).toEqual({
        productId: 'product-1',
        isWishlisted: false,
      });
    });
  });
});
