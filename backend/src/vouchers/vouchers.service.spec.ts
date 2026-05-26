import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VouchersService } from './vouchers.service';

describe('VouchersService visibility', () => {
  let service: VouchersService;
  let tx: {
    voucherRange: {
      deleteMany: jest.Mock;
    };
    voucher: {
      update: jest.Mock;
    };
  };
  let prisma: {
    category: {
      findUnique: jest.Mock;
    };
    voucher: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
    voucherUsage: {
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    tx = {
      voucherRange: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      voucher: {
        update: jest.fn().mockResolvedValue({ id: 'voucher-1' }),
      },
    };

    prisma = {
      category: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      },
      voucher: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'voucher-1' }),
      },
      voucherUsage: {
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };

    service = new VouchersService(prisma as unknown as never);
  });

  it('only lists active, current vouchers on the public endpoint', async () => {
    await service.findAll();

    expect(prisma.voucher.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          isActive: true,
          endDate: { gt: expect.any(Date) },
          category: {
            deletedAt: null,
            status: 'ACTIVE',
          },
          ranges: {
            some: {
              deletedAt: null,
              endDate: { gt: expect.any(Date) },
            },
          },
        }),
      }),
    );
    expect(prisma.voucher.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        isActive: true,
        endDate: { gt: expect.any(Date) },
      }),
    });
  });

  it('allows admins to list inactive vouchers through the admin path', async () => {
    await service.findAll(undefined, { includeInactive: true });

    expect(prisma.voucher.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        include: {
          category: true,
          ranges: true,
        },
      }),
    );
  });

  it('does not return expired or inactive voucher codes to public callers', async () => {
    prisma.voucher.findFirst.mockResolvedValue(null);

    await expect(service.findByCode('EXPIRED')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.voucher.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          code: 'EXPIRED',
          isActive: true,
          endDate: { gt: expect.any(Date) },
        }),
      }),
    );
  });

  it('keeps existing ranges when updating voucher fields without ranges', async () => {
    await service.update('voucher-1', { name: 'Updated voucher' });

    expect(tx.voucherRange.deleteMany).not.toHaveBeenCalled();
    expect(tx.voucher.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Updated voucher',
          ranges: undefined,
        }),
      }),
    );
  });

  it('replaces ranges only when update payload includes ranges', async () => {
    const endDate = '2030-06-01T00:00:00.000Z';

    await service.update('voucher-1', {
      ranges: [
        {
          minPrice: 100,
          maxPrice: 1000,
          discountPercent: 10,
          endDate,
        },
      ],
    });

    expect(tx.voucherRange.deleteMany).toHaveBeenCalledWith({
      where: { voucherId: 'voucher-1' },
    });
    expect(tx.voucher.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ranges: {
            create: [
              {
                minPrice: 100,
                maxPrice: 1000,
                discountPercent: 10,
                endDate: new Date(endDate),
              },
            ],
          },
        }),
      }),
    );
  });

  it('caps voucher discount by maxDiscountAmount and subtotal', () => {
    expect(
      service.calculateDiscountAmount(
        { maxDiscountAmount: 15000 } as never,
        { discountPercent: 20 } as never,
        100000,
      ),
    ).toBe(15000);

    expect(
      service.calculateDiscountAmount(
        { maxDiscountAmount: 250000 } as never,
        { discountPercent: 150 } as never,
        100000,
      ),
    ).toBe(100000);
  });

  it('matches voucher ranges inclusively at maxPrice boundary', () => {
    const range = {
      minPrice: 100,
      maxPrice: 1000,
      discountPercent: 10,
      endDate: new Date('2030-01-01T00:00:00.000Z'),
      deletedAt: null,
    };

    expect(service.findMatchingRange([range] as never, 1000)).toBe(range);
  });

  it('rejects invalid voucher hardening limits', async () => {
    await expect(
      service.create({
        name: 'Bad voucher',
        code: 'BAD',
        categoryId: 'cat-1',
        endDate: '2030-01-01T00:00:00.000Z',
        maxDiscountAmount: -1,
        ranges: [
          {
            minPrice: 100,
            maxPrice: 1000,
            discountPercent: 10,
            endDate: '2030-01-01T00:00:00.000Z',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.voucher.create).not.toHaveBeenCalled();
  });

  it('rejects voucher application when global usage limit is reached', async () => {
    await expect(
      service.assertVoucherUsageAvailable(
        {
          id: 'voucher-1',
          usageLimit: 5,
          perUserLimit: null,
          usedCount: 5,
        } as never,
        'user-1',
        prisma as never,
      ),
    ).rejects.toThrow('Voucher usage limit has been reached');

    expect(prisma.voucherUsage.count).not.toHaveBeenCalled();
  });

  it('rejects voucher application when per-user usage limit is reached', async () => {
    prisma.voucherUsage.count.mockResolvedValue(2);

    await expect(
      service.assertVoucherUsageAvailable(
        {
          id: 'voucher-1',
          usageLimit: null,
          perUserLimit: 2,
          usedCount: 1,
        } as never,
        'user-1',
        prisma as never,
      ),
    ).rejects.toThrow('Voucher usage limit has been reached for this user');

    expect(prisma.voucherUsage.count).toHaveBeenCalledWith({
      where: { voucherId: 'voucher-1', userId: 'user-1' },
    });
  });
});
