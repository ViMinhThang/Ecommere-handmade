import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Notification,
  NotificationType,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Prisma.InputJsonValue;
  dedupeKey?: string | null;
  readAt?: Date | null;
}

export interface CreateManyNotificationsInput extends Omit<
  CreateNotificationInput,
  'userId' | 'dedupeKey'
> {
  userIds: string[];
  dedupeKey?: string | ((userId: string) => string | null | undefined);
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string, query: ListNotificationsQueryDto) {
    const page = Math.max(Math.floor(Number(query.page) || 1), 1);
    const limit = Math.min(
      Math.max(Math.floor(Number(query.limit) || 20), 1),
      50,
    );
    const where: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
      ...(query.status === 'unread' ? { readAt: null } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
    });

    return { unreadCount };
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.findOwnedNotification(
      userId,
      notificationId,
    );

    if (notification.readAt) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
      data: { readAt: new Date() },
    });

    return { updatedCount: result.count };
  }

  async softDelete(userId: string, notificationId: string) {
    const notification = await this.findOwnedNotification(
      userId,
      notificationId,
    );

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async createForUser(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        metadata: input.metadata ?? undefined,
        dedupeKey: input.dedupeKey ?? null,
        readAt: input.readAt ?? null,
      },
    });
  }

  async createManyForUsers(input: CreateManyNotificationsInput) {
    const uniqueUserIds = Array.from(new Set(input.userIds)).filter(Boolean);
    return Promise.all(
      uniqueUserIds.map((userId) =>
        this.createForUser({
          ...input,
          userId,
          dedupeKey: this.resolveDedupeKey(input.dedupeKey, userId),
        }),
      ),
    );
  }

  async safeCreateForUser(input: CreateNotificationInput) {
    try {
      return await this.createForUser(input);
    } catch (error) {
      this.logSafeCreateFailure(error, input.type, input.dedupeKey ?? null);
      return null;
    }
  }

  async safeCreateManyForUsers(input: CreateManyNotificationsInput) {
    const uniqueUserIds = Array.from(new Set(input.userIds)).filter(Boolean);
    const results = await Promise.all(
      uniqueUserIds.map((userId) =>
        this.safeCreateForUser({
          ...input,
          userId,
          dedupeKey: this.resolveDedupeKey(input.dedupeKey, userId),
        }),
      ),
    );

    return results.filter(Boolean) as Notification[];
  }

  async safeCreateForAdmins(
    input: Omit<CreateManyNotificationsInput, 'userIds'>,
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        roles: { has: Role.ROLE_ADMIN },
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (admins.length === 0) {
      return [];
    }

    return this.safeCreateManyForUsers({
      ...input,
      userIds: admins.map((admin) => admin.id),
    });
  }

  private async findOwnedNotification(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        deletedAt: null,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  private resolveDedupeKey(
    dedupeKey: CreateManyNotificationsInput['dedupeKey'],
    userId: string,
  ) {
    return typeof dedupeKey === 'function'
      ? (dedupeKey(userId) ?? null)
      : (dedupeKey ?? null);
  }

  private logSafeCreateFailure(
    error: unknown,
    type: NotificationType,
    dedupeKey: string | null,
  ) {
    if (this.isUniqueConstraintError(error)) {
      this.logger.debug(
        `Skipped duplicate notification ${type} (${dedupeKey ?? 'no-dedupe'})`,
      );
      return;
    }

    this.logger.warn(
      `Notification create failed for ${type} (${dedupeKey ?? 'no-dedupe'}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
