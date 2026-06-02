import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GiftWrapTiersService } from './gift-wrap-tiers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GiftWrapTiersService', () => {
  const prisma = {
    giftWrapTier: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: GiftWrapTiersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GiftWrapTiersService(prisma as unknown as PrismaService);
  });

  it('lists only active public tiers sorted by sort order', async () => {
    prisma.giftWrapTier.findMany.mockResolvedValue([]);

    await service.findPublic();

    expect(prisma.giftWrapTier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    );
  });

  it('creates a sanitized admin tier', async () => {
    prisma.giftWrapTier.create.mockResolvedValue({ id: 'tier-1' });

    await service.create({
      name: '  <b>Hộp quà cao cấp</b>  ',
      description: '<script>alert(1)</script>Giấy mỹ thuật và ruy băng',
      price: 35000,
      includesCard: true,
      sortOrder: 20,
      isActive: true,
    });

    expect(prisma.giftWrapTier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Hộp quà cao cấp',
          description: 'Giấy mỹ thuật và ruy băng',
          price: 35000,
          includesCard: true,
          sortOrder: 20,
          isActive: true,
        }),
      }),
    );
  });

  it('rejects empty tier name', async () => {
    expect(() =>
      service.create({
        name: '   ',
        price: 0,
      }),
    ).toThrow(BadRequestException);
  });

  it('updates only fields sent by admin', async () => {
    prisma.giftWrapTier.findFirst.mockResolvedValue({ id: 'tier-1' });
    prisma.giftWrapTier.update.mockResolvedValue({ id: 'tier-1' });

    await service.update('tier-1', { isActive: false });

    expect(prisma.giftWrapTier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tier-1' },
        data: { isActive: false },
      }),
    );
  });

  it('soft deletes a tier instead of removing historical order relations', async () => {
    prisma.giftWrapTier.findFirst.mockResolvedValue({ id: 'tier-1' });
    prisma.giftWrapTier.update.mockResolvedValue({ id: 'tier-1' });

    await service.remove('tier-1');

    expect(prisma.giftWrapTier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tier-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          isActive: false,
        }),
      }),
    );
  });

  it('throws not found for missing admin tier', async () => {
    prisma.giftWrapTier.findFirst.mockResolvedValue(null);

    await expect(service.update('missing', { isActive: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
