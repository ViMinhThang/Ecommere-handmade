import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  Role,
  RewardPointLedger,
  RewardPointLedgerType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const REWARD_REDEEM_VND_PER_POINT = 1000;
export const REWARD_EARN_VND_PER_POINT = 10000;
export const MAX_ADMIN_REWARD_ADJUSTMENT = 10000;

const CUSTOMER_REWARD_USER_WHERE = {
  deletedAt: null,
  roles: { has: Role.ROLE_USER },
  NOT: [
    { roles: { has: Role.ROLE_SELLER } },
    { roles: { has: Role.ROLE_ADMIN } },
  ],
} satisfies Prisma.UserWhereInput;

interface ApplyLedgerParams {
  userId: string;
  orderId?: string | null;
  type: RewardPointLedgerType;
  points: number;
  idempotencyKey: string;
  description?: string;
}

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  normalizePoints(value: unknown) {
    const points = Number(value ?? 0);
    if (!Number.isInteger(points) || points < 0) {
      throw new BadRequestException(
        'Reward points must be a non-negative integer',
      );
    }

    return points;
  }

  calculateRedemption(points: number, orderTotal: number) {
    const normalizedPoints = this.normalizePoints(points);
    if (normalizedPoints === 0) {
      return { points: 0, discountAmount: 0 };
    }

    const roundedOrderTotal = Math.round(orderTotal);
    const discountAmount = normalizedPoints * REWARD_REDEEM_VND_PER_POINT;

    if (roundedOrderTotal <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    if (discountAmount >= roundedOrderTotal) {
      throw new BadRequestException(
        'Reward discount must be lower than order total',
      );
    }

    return { points: normalizedPoints, discountAmount };
  }

  calculateEarnPoints(orderPaidAmount: number) {
    return Math.max(
      0,
      Math.floor(Math.round(orderPaidAmount) / REWARD_EARN_VND_PER_POINT),
    );
  }

  getRules() {
    return {
      redeemVndPerPoint: REWARD_REDEEM_VND_PER_POINT,
      earnVndPerPoint: REWARD_EARN_VND_PER_POINT,
    };
  }

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { rewardPointsBalance: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      balance: user.rewardPointsBalance,
      ...this.getRules(),
    };
  }

  async getLedger(userId: string, page = 1, limit = 20) {
    const normalizedPage = Math.max(Math.floor(Number(page) || 1), 1);
    const normalizedLimit = Math.min(
      Math.max(Math.floor(Number(limit) || 20), 1),
      50,
    );

    const [data, total] = await Promise.all([
      this.prisma.rewardPointLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (normalizedPage - 1) * normalizedLimit,
        take: normalizedLimit,
      }),
      this.prisma.rewardPointLedger.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / normalizedLimit),
      },
    };
  }

  async getAdminUserLedger(userId: string, page = 1, limit = 20) {
    await this.assertCustomerAccount(this.prisma, userId);
    const ledger = await this.getLedger(userId, page, limit);

    return {
      ...ledger,
      data: ledger.data.map((entry) => ({
        ...entry,
        adjustedByAdminId:
          entry.type === RewardPointLedgerType.ADJUSTMENT
            ? (entry.idempotencyKey.match(/^admin:([^:]+):/)?.[1] ?? null)
            : null,
      })),
    };
  }

  async getAdminSummary() {
    const [balanceAggregate, usersWithPoints, adjustments] = await Promise.all([
      this.prisma.user.aggregate({
        where: CUSTOMER_REWARD_USER_WHERE,
        _sum: { rewardPointsBalance: true },
      }),
      this.prisma.user.count({
        where: {
          ...CUSTOMER_REWARD_USER_WHERE,
          rewardPointsBalance: { gt: 0 },
        },
      }),
      this.prisma.rewardPointLedger.count({
        where: {
          type: RewardPointLedgerType.ADJUSTMENT,
          user: CUSTOMER_REWARD_USER_WHERE,
        },
      }),
    ]);

    return {
      totalPoints: balanceAggregate._sum.rewardPointsBalance ?? 0,
      usersWithPoints,
      adjustments,
    };
  }

  async getAdminUsers(query?: string, page = 1, limit = 20) {
    const normalizedPage = Math.max(Math.floor(Number(page) || 1), 1);
    const normalizedLimit = Math.min(
      Math.max(Math.floor(Number(limit) || 20), 1),
      50,
    );
    const search = query?.trim();
    const where: Prisma.UserWhereInput = {
      ...CUSTOMER_REWARD_USER_WHERE,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          roles: true,
          status: true,
          rewardPointsBalance: true,
          _count: { select: { rewardPointLedger: true } },
        },
        orderBy: [{ rewardPointsBalance: 'desc' }, { createdAt: 'desc' }],
        skip: (normalizedPage - 1) * normalizedLimit,
        take: normalizedLimit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map(({ _count, ...user }) => ({
        ...user,
        ledgerEntries: _count.rewardPointLedger,
      })),
      meta: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / normalizedLimit),
      },
    };
  }

  async adminAdjustPoints(
    adminId: string,
    userId: string,
    points: number,
    reason: string,
  ) {
    if (
      !Number.isInteger(points) ||
      points === 0 ||
      Math.abs(points) > MAX_ADMIN_REWARD_ADJUSTMENT
    ) {
      throw new BadRequestException(
        `Reward adjustment must be a non-zero integer between -${MAX_ADMIN_REWARD_ADJUSTMENT} and ${MAX_ADMIN_REWARD_ADJUSTMENT}`,
      );
    }

    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5 || normalizedReason.length > 200) {
      throw new BadRequestException(
        'Adjustment reason must contain between 5 and 200 characters',
      );
    }

    const ledger = await this.prisma.$transaction(async (tx) => {
      await this.assertCustomerAccount(tx, userId);
      return this.applyLedgerEntry(tx, {
        userId,
        type: RewardPointLedgerType.ADJUSTMENT,
        points,
        idempotencyKey: `admin:${adminId}:reward_adjustment:${randomUUID()}`,
        description: `Quản trị viên điều chỉnh: ${normalizedReason}`,
      });
    });

    return { ledger };
  }

  async redeemForOrder(
    tx: Prisma.TransactionClient,
    userId: string,
    orderId: string,
    points: number,
  ) {
    if (points === 0) {
      return null;
    }

    return this.applyLedgerEntry(tx, {
      userId,
      orderId,
      type: RewardPointLedgerType.REDEEM,
      points: -points,
      idempotencyKey: `order:${orderId}:reward_redeem`,
      description: `Đã dùng ${points} điểm cho đơn hàng ${orderId}`,
    });
  }

  async refundRedeemedPointsForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    reason = 'Đơn hàng đã hủy hoặc hoàn tiền',
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        rewardPointsRedeemed: true,
      },
    });

    if (!order || order.rewardPointsRedeemed <= 0) {
      return null;
    }

    return this.applyLedgerEntry(tx, {
      userId: order.customerId,
      orderId: order.id,
      type: RewardPointLedgerType.REFUND,
      points: order.rewardPointsRedeemed,
      idempotencyKey: `order:${order.id}:reward_redeem_refund`,
      description: `${reason}: hoàn lại ${order.rewardPointsRedeemed} điểm`,
    });
  }

  async awardOrderCompletionPoints(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (
      !order ||
      order.status !== OrderStatus.DELIVERED ||
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      return null;
    }

    const points = this.calculateEarnPoints(Number(order.totalAmount));
    if (points <= 0) {
      return null;
    }

    return this.applyLedgerEntry(tx, {
      userId: order.customerId,
      orderId: order.id,
      type: RewardPointLedgerType.EARN,
      points,
      idempotencyKey: `order:${order.id}:reward_earn`,
      description: `Cộng ${points} điểm cho đơn hàng đã hoàn tất ${order.id}`,
    });
  }

  private async applyLedgerEntry(
    tx: Prisma.TransactionClient,
    params: ApplyLedgerParams,
  ): Promise<RewardPointLedger | null> {
    await this.lockUserPoints(tx, params.userId);

    const existing = await tx.rewardPointLedger.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const user = await tx.user.findUnique({
      where: { id: params.userId },
      select: { rewardPointsBalance: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const nextBalance = user.rewardPointsBalance + params.points;
    if (nextBalance < 0) {
      throw new BadRequestException('Insufficient reward points');
    }

    await tx.user.update({
      where: { id: params.userId },
      data: { rewardPointsBalance: nextBalance },
    });

    return tx.rewardPointLedger.create({
      data: {
        userId: params.userId,
        orderId: params.orderId ?? null,
        type: params.type,
        points: params.points,
        balanceAfter: nextBalance,
        idempotencyKey: params.idempotencyKey,
        description: params.description,
      },
    });
  }

  private async lockUserPoints(tx: Prisma.TransactionClient, userId: string) {
    await tx.$queryRaw(Prisma.sql`
      SELECT id
      FROM "User"
      WHERE id = ${userId}
      FOR UPDATE
    `);
  }

  private async assertCustomerAccount(
    tx: Prisma.TransactionClient | PrismaService,
    userId: string,
  ) {
    const customer = await tx.user.findFirst({
      where: {
        ...CUSTOMER_REWARD_USER_WHERE,
        id: userId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new NotFoundException('Customer account not found');
    }
  }
}
