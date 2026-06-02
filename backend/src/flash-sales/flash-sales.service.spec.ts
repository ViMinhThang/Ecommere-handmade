import { BadRequestException } from '@nestjs/common';
import { FlashSaleState } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';
import { FlashSalesService } from './flash-sales.service';

describe('FlashSalesService', () => {
  let service: FlashSalesService;
  let prisma: {
    category: { findMany: jest.Mock };
    flashSale: {
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tx: {
    flashSaleCategory: { deleteMany: jest.Mock };
    flashSaleRange: { deleteMany: jest.Mock };
    flashSale: { update: jest.Mock };
  };

  const startAt = '2026-06-01T00:00:00.000Z';
  const endAt = '2026-06-02T00:00:00.000Z';

  const createDto = (
    overrides: Partial<CreateFlashSaleDto> = {},
  ): CreateFlashSaleDto => ({
    name: 'Summer Sale',
    startAt,
    endAt,
    categoryIds: ['cat-1'],
    ranges: [
      {
        minPrice: 100,
        maxPrice: 1000,
        discountPercent: 10,
        endDate: endAt,
      },
    ],
    ...overrides,
  });

  const existingFlashSale = (overrides: Record<string, unknown> = {}) => ({
    id: 'flash-sale-1',
    name: 'Existing Sale',
    startAt: new Date(startAt),
    endAt: new Date(endAt),
    maxUnits: null,
    perUserLimit: null,
    reserveStock: 0,
    autoPauseThreshold: null,
    ...overrides,
  });

  beforeEach(() => {
    tx = {
      flashSaleCategory: { deleteMany: jest.fn().mockResolvedValue({}) },
      flashSaleRange: { deleteMany: jest.fn().mockResolvedValue({}) },
      flashSale: {
        update: jest.fn().mockResolvedValue({ id: 'flash-sale-1' }),
      },
    };
    prisma = {
      category: {
        findMany: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
      },
      flashSale: {
        create: jest.fn().mockResolvedValue({ id: 'flash-sale-1' }),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    service = new FlashSalesService(prisma as unknown as PrismaService);
  });

  it('creates a sale with valid guardrails', async () => {
    await service.create(
      createDto({
        maxUnits: 100,
        perUserLimit: 2,
        reserveStock: 10,
        autoPauseThreshold: 90,
      }),
    );

    expect(prisma.flashSale.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          saleState: FlashSaleState.ACTIVE,
          maxUnits: 100,
          perUserLimit: 2,
          reserveStock: 10,
          autoPauseThreshold: 90,
        }),
      }),
    );
  });

  it('rejects invalid negative guardrail values', async () => {
    await expect(
      service.create(createDto({ reserveStock: -1 })),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.flashSale.findMany).not.toHaveBeenCalled();
    expect(prisma.flashSale.create).not.toHaveBeenCalled();
  });

  it('rejects perUserLimit greater than maxUnits', async () => {
    await expect(
      service.create(createDto({ maxUnits: 5, perUserLimit: 6 })),
    ).rejects.toThrow('perUserLimit must be less than or equal to maxUnits');

    expect(prisma.flashSale.create).not.toHaveBeenCalled();
  });

  it('rejects autoPauseThreshold greater than maxUnits', async () => {
    await expect(
      service.create(createDto({ maxUnits: 5, autoPauseThreshold: 6 })),
    ).rejects.toThrow(
      'autoPauseThreshold must be less than or equal to maxUnits',
    );

    expect(prisma.flashSale.create).not.toHaveBeenCalled();
  });

  it('updates valid guardrails without allowing client-managed counters', async () => {
    prisma.flashSale.findUnique.mockResolvedValue(existingFlashSale());

    const updateDto: UpdateFlashSaleDto = {
      saleState: FlashSaleState.PAUSED,
      pausedReason: 'Manual pause for stock review',
      maxUnits: 50,
      perUserLimit: 3,
      reserveStock: 5,
      autoPauseThreshold: 45,
    };

    await service.update('flash-sale-1', updateDto);

    expect(tx.flashSale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          saleState: FlashSaleState.PAUSED,
          pausedReason: 'Manual pause for stock review',
          maxUnits: 50,
          perUserLimit: 3,
          reserveStock: 5,
          autoPauseThreshold: 45,
        }),
      }),
    );
    expect(tx.flashSale.update.mock.calls[0][0].data).not.toHaveProperty(
      'soldUnits',
    );
    expect(tx.flashSale.update.mock.calls[0][0].data).not.toHaveProperty(
      'reservedUnits',
    );
    expect(tx.flashSaleCategory.deleteMany).not.toHaveBeenCalled();
    expect(tx.flashSaleRange.deleteMany).not.toHaveBeenCalled();
  });

  it('keeps existing categories and ranges when updating fields without them', async () => {
    prisma.flashSale.findUnique.mockResolvedValue(existingFlashSale());

    await service.update('flash-sale-1', {
      name: 'Updated Sale',
      isActive: false,
    });

    expect(tx.flashSaleCategory.deleteMany).not.toHaveBeenCalled();
    expect(tx.flashSaleRange.deleteMany).not.toHaveBeenCalled();
    expect(tx.flashSale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Updated Sale',
          isActive: false,
          categories: undefined,
          ranges: undefined,
        }),
      }),
    );
  });

  it('replaces categories only when categoryIds are provided', async () => {
    prisma.flashSale.findUnique.mockResolvedValue(existingFlashSale());
    prisma.category.findMany.mockResolvedValue([{ id: 'cat-2' }]);

    await service.update('flash-sale-1', { categoryIds: ['cat-2'] });

    expect(tx.flashSaleCategory.deleteMany).toHaveBeenCalledWith({
      where: { flashSaleId: 'flash-sale-1' },
    });
    expect(tx.flashSaleRange.deleteMany).not.toHaveBeenCalled();
    expect(tx.flashSale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categories: { create: [{ categoryId: 'cat-2' }] },
          ranges: undefined,
        }),
      }),
    );
  });

  it('replaces ranges only when ranges are provided', async () => {
    prisma.flashSale.findUnique.mockResolvedValue(existingFlashSale());
    const rangeEndDate = '2030-06-02T00:00:00.000Z';

    await service.update('flash-sale-1', {
      ranges: [
        {
          minPrice: 100,
          maxPrice: 1000,
          discountPercent: 15,
          endDate: rangeEndDate,
        },
      ],
    });

    expect(tx.flashSaleCategory.deleteMany).not.toHaveBeenCalled();
    expect(tx.flashSaleRange.deleteMany).toHaveBeenCalledWith({
      where: { flashSaleId: 'flash-sale-1' },
    });
    expect(tx.flashSale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categories: undefined,
          ranges: {
            create: [
              {
                minPrice: 100,
                maxPrice: 1000,
                discountPercent: 15,
                endDate: new Date(rangeEndDate),
              },
            ],
          },
        }),
      }),
    );
  });

  it('rejects update perUserLimit greater than existing maxUnits', async () => {
    prisma.flashSale.findUnique.mockResolvedValue(
      existingFlashSale({ maxUnits: 5 }),
    );

    await expect(
      service.update('flash-sale-1', { perUserLimit: 6 }),
    ).rejects.toThrow('perUserLimit must be less than or equal to maxUnits');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('excludes paused sales from active pricing by querying ACTIVE state only', async () => {
    prisma.flashSale.findFirst.mockResolvedValue(null);

    const result = await service.calculateEffectivePrice(1000, 'cat-1');

    expect(prisma.flashSale.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          saleState: FlashSaleState.ACTIVE,
          categories: {
            some: expect.objectContaining({ categoryId: 'cat-1' }),
          },
        }),
      }),
    );
    expect(result).toEqual({
      originalPrice: 1000,
      discountedPrice: 1000,
      discountPercent: 0,
      flashSaleId: null,
    });
  });

  it('does not apply a discount from an expired sale range', async () => {
    prisma.flashSale.findFirst.mockResolvedValue({
      id: 'flash-sale-1',
      ranges: [
        {
          minPrice: 100,
          maxPrice: 1000,
          discountPercent: 10,
          endDate: new Date('2020-01-01T00:00:00.000Z'),
          deletedAt: null,
        },
      ],
    });

    const result = await service.calculateEffectivePrice(500, 'cat-1');

    expect(result).toEqual({
      originalPrice: 500,
      discountedPrice: 500,
      discountPercent: 0,
      flashSaleId: 'flash-sale-1',
    });
  });

  it('applies flash sale ranges inclusively at maxPrice boundary', async () => {
    prisma.flashSale.findFirst.mockResolvedValue({
      id: 'flash-sale-1',
      ranges: [
        {
          minPrice: 100,
          maxPrice: 1000,
          discountPercent: 10,
          endDate: new Date('2030-01-01T00:00:00.000Z'),
          deletedAt: null,
        },
      ],
    });

    const result = await service.calculateEffectivePrice(1000, 'cat-1');

    expect(result).toEqual({
      originalPrice: 1000,
      discountedPrice: 900,
      discountPercent: 10,
      flashSaleId: 'flash-sale-1',
    });
  });

  it('treats null maxPrice as no upper bound defensively', async () => {
    prisma.flashSale.findFirst.mockResolvedValue({
      id: 'flash-sale-1',
      ranges: [
        {
          minPrice: 100,
          maxPrice: null,
          discountPercent: 10,
          endDate: new Date('2030-01-01T00:00:00.000Z'),
          deletedAt: null,
        },
      ],
    });

    const result = await service.calculateEffectivePrice(5000, 'cat-1');

    expect(result).toEqual({
      originalPrice: 5000,
      discountedPrice: 4500,
      discountPercent: 10,
      flashSaleId: 'flash-sale-1',
    });
  });

  it('excludes ended sales from active sale listing by querying ACTIVE state only', async () => {
    await service.findActive();

    expect(prisma.flashSale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          saleState: FlashSaleState.ACTIVE,
        }),
      }),
    );
  });

  it('uses active visibility for the public flash sale list', async () => {
    await service.findAll();

    expect(prisma.flashSale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          saleState: FlashSaleState.ACTIVE,
          startAt: { lte: expect.any(Date) },
          endAt: { gte: expect.any(Date) },
          ranges: {
            some: expect.objectContaining({
              deletedAt: null,
              endDate: { gt: expect.any(Date) },
            }),
          },
        }),
      }),
    );
  });

  it('keeps existing sale creation without guardrails working', async () => {
    await service.create(createDto());

    expect(prisma.flashSale.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: true,
          saleState: FlashSaleState.ACTIVE,
        }),
      }),
    );
  });
});
