import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryChangeReason } from './dto/update-stock.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

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
    $transaction: jest.fn(),
  };

  let mockTx: {
    product: { findUnique: jest.Mock; update: jest.Mock };
    inventoryLog: { create: jest.Mock };
  };

  beforeEach(async () => {
    mockTx = {
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      inventoryLog: {
        create: jest.fn(),
      },
    };
    mockPrisma.$transaction = jest.fn(
      async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
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
      const product = { id: '1', ...dto, sellerId: 'seller1' };
      mockPrisma.product.create.mockResolvedValue(product);
      mockPrisma.$transaction = jest.fn(
        async (cb: (tx: typeof mockTx) => unknown) => {
          mockTx.product.findUnique.mockResolvedValue({ stock: 10 });
          mockTx.product.update.mockResolvedValue(product);
          return cb(mockTx);
        },
      );

      const result = await service.create('seller1', dto);

      expect(result).toEqual(product);
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
      const product = { id: '1', name: 'Test' };
      mockPrisma.product.findUnique.mockResolvedValue(product);

      const result = await service.findOne('1');

      expect(result).toEqual(product);
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
        async (cb: (tx: typeof mockTx) => unknown) => {
          mockTx.product.findUnique.mockResolvedValue({ stock: 5 });
          return cb(mockTx);
        },
      );

      await expect(
        service.updateStock('1', {
          quantity: -10,
          reason: InventoryChangeReason.ORDER,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if product not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
