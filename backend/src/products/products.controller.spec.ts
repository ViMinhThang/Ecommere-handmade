import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../common/interfaces/request.interface';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
    getBySeller: jest.fn(),
    getLowStockProducts: jest.fn(),
    getInventory: jest.fn(),
    updateStock: jest.fn(),
    getInventoryLog: jest.fn(),
  };

  const mockPrismaService = {};
  const createRequest = (
    userId: string,
    roles: string[] = ['ROLE_SELLER'],
  ): AuthenticatedRequest =>
    ({
      user: {
        id: userId,
        email: `${userId}@example.com`,
        roles,
      },
    }) as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
        { provide: PrismaService, useValue: mockPrismaService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const result = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      mockProductsService.findAll.mockResolvedValue(result);

      const request = { user: undefined } as unknown as AuthenticatedRequest;
      const response = await controller.findAll(request, {});

      expect(mockProductsService.findAll).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });

  describe('getLowStock', () => {
    it('should pass parsed page and limit to service', async () => {
      const request = createRequest('seller-1');
      const result = {
        data: [],
        meta: { page: 2, limit: 10, total: 0, totalPages: 0 },
      };
      mockProductsService.getLowStockProducts.mockResolvedValue(result);

      const response = await controller.getLowStock(
        request,
        'seller-1',
        '2',
        '10',
      );

      expect(mockProductsService.getLowStockProducts).toHaveBeenCalledWith(
        'seller-1',
        ['ROLE_SELLER'],
        'seller-1',
        2,
        10,
      );
      expect(response).toEqual(result);
    });

    it('should throw BadRequestException for invalid page', () => {
      const request = createRequest('seller-1');

      expect(() =>
        controller.getLowStock(request, 'seller-1', '0', '10'),
      ).toThrow(BadRequestException);
      expect(mockProductsService.getLowStockProducts).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid limit', () => {
      const request = createRequest('seller-1');

      expect(() =>
        controller.getLowStock(request, 'seller-1', '1', 'abc'),
      ).toThrow(BadRequestException);
      expect(mockProductsService.getLowStockProducts).not.toHaveBeenCalled();
    });
  });
});
