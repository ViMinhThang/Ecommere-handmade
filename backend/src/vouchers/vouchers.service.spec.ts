import { NotFoundException } from '@nestjs/common';
import { VouchersService } from './vouchers.service';

describe('VouchersService visibility', () => {
  let service: VouchersService;
  let prisma: {
    voucher: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      voucher: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
      },
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
});
