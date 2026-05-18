import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const prisma = {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  it('lists only active notifications for the current user with capped limit', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.notification.count.mockResolvedValue(0);

    await service.listMine('user-1', {
      page: 1,
      limit: 100,
      status: 'unread',
      type: NotificationType.ORDER_CREATED,
    });

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
        readAt: null,
        type: NotificationType.ORDER_CREATED,
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
    });
  });

  it('does not mark another user notification as read', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(
      service.markRead('user-1', 'notification-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'notification-2',
        userId: 'user-1',
        deletedAt: null,
      },
    });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('marks only current user unread notifications as read', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.markAllRead('user-1');

    expect(result).toEqual({ updatedCount: 2 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        readAt: null,
        deletedAt: null,
      },
      data: { readAt: expect.any(Date) },
    });
  });

  it('swallows notification creation failures in safeCreateForUser', async () => {
    prisma.notification.create.mockRejectedValue(new Error('database down'));

    const result = await service.safeCreateForUser({
      userId: 'user-1',
      type: NotificationType.SYSTEM,
      title: 'System',
      message: 'Safe create should not break the business flow',
      dedupeKey: 'system:user-1',
    });

    expect(result).toBeNull();
    expect(prisma.notification.create).toHaveBeenCalled();
  });
});
