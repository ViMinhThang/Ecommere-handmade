import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryChangeReason } from './dto/update-stock.dto';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import { CategoryStatus, ProductStatus } from '@prisma/client';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockPrisma = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      update: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const mockFlashSalesService = {
    calculateEffectivePrice: jest.fn().mockResolvedValue({
      originalPrice: 100,
      discountedPrice: 100,
      discountPercent: 0,
    }),
  };

  let mockTx: {
    product: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    category: { update: jest.Mock };
    inventoryLog: { create: jest.Mock };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTx = {
      product: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      category: { update: jest.fn() },
      inventoryLog: {
        create: jest.fn(),
      },
    };
    mockPrisma.$transaction = jest.fn((cb: (tx: typeof mockTx) => unknown) =>
      cb(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FlashSalesService, useValue: mockFlashSalesService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product with sellerId', async () => {
      const dto = {
        name: 'Test',
        description: 'Desc',
        price: 100,
        categoryId: 'cat1',
      };
      const product = {
        id: '1',
        ...dto,
        sellerId: 'seller1',
        status: ProductStatus.PENDING,
      };
      mockPrisma.$transaction = jest.fn(
        (cb: (tx: typeof mockTx) => unknown) => {
          mockTx.product.create.mockResolvedValue(product);
          mockTx.category.update.mockResolvedValue({ id: 'cat1' });
          return cb(mockTx);
        },
      );

      const result = await service.create('seller1', ['ROLE_SELLER'], dto);

      expect(result).toEqual(product);
      const productCreateMock = mockTx.product.create as jest.MockedFunction<
        (args: { data: { status: ProductStatus } }) => unknown
      >;
      const createCall = productCreateMock.mock.calls.at(-1)?.[0];
      expect(createCall?.data.status).toBe(ProductStatus.PENDING);
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const result = await service.findAll();

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('totalPages');
    });
  });

  describe('findOne', () => {
    it('should return a product', async () => {
      const product = {
        id: '1',
        name: 'Test',
        price: 100,
        categoryId: 'cat1',
        status: ProductStatus.APPROVED,
        sellerId: 'seller1',
        category: { status: CategoryStatus.ACTIVE, deletedAt: null },
      };
      mockPrisma.product.findUnique.mockResolvedValue(product);

      const result = await service.findOne('1');

      expect(result).toEqual({
        ...product,
        pricing: {
          originalPrice: 100,
          discountedPrice: 100,
          discountPercent: 0,
        },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStock', () => {
    it('should throw BadRequestException for insufficient stock', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: '1', stock: 5 });
      mockPrisma.$transaction = jest.fn(
        (cb: (tx: typeof mockTx) => unknown) => {
          mockTx.product.updateMany.mockResolvedValue({ count: 0 });
          return cb(mockTx);
        },
      );

      await expect(
        service.updateStock('1', {
          quantity: -10,
          reason: InventoryChangeReason.ORDER,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.inventoryLog.create).not.toHaveBeenCalled();
    });

    it('uses a conditional decrement for negative stock changes', async () => {
      const updatedProduct = { id: '1', stock: 3 };
      mockPrisma.product.findUnique.mockResolvedValue({ id: '1', stock: 5 });
      mockPrisma.$transaction = jest.fn(
        (cb: (tx: typeof mockTx) => unknown) => {
          mockTx.product.updateMany.mockResolvedValue({ count: 1 });
          mockTx.product.findUnique.mockResolvedValue(updatedProduct);
          return cb(mockTx);
        },
      );

      const result = await service.updateStock('1', {
        quantity: -2,
        reason: InventoryChangeReason.ORDER,
      });

      expect(result).toEqual(updatedProduct);
      expect(mockTx.product.updateMany).toHaveBeenCalledWith({
        where: { id: '1', stock: { gte: 2 } },
        data: { stock: { decrement: 2 } },
      });
      expect(mockTx.inventoryLog.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('nonexistent', 'seller1', ['ROLE_SELLER']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return low-stock products with paginated meta', async () => {
      const rows = [
        {
          id: 'product-1',
          name: 'Product 1',
          stock: 2,
          lowStockThreshold: 5,
          categoryName: 'Category 1',
        },
      ];
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce(rows);

      const result = await service.getLowStockProducts(
        'seller-1',
        ['ROLE_SELLER'],
        undefined,
        1,
        10,
      );

      expect(result).toEqual({
        data: rows,
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should return empty data and zero total pages when no low-stock products', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.getLowStockProducts(
        'seller-1',
        ['ROLE_SELLER'],
        undefined,
        1,
        10,
      );

      expect(result).toEqual({
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    });

    it('should clamp low-stock limit to max value', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([{ total: 120 }])
        .mockResolvedValueOnce([]);

      const result = await service.getLowStockProducts(
        'seller-1',
        ['ROLE_SELLER'],
        undefined,
        1,
        1000,
      );

      expect(result.meta.limit).toBe(100);
      expect(result.meta.total).toBe(120);
      expect(result.meta.totalPages).toBe(2);
    });
  });
});
