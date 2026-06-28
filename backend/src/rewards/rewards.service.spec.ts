import { BadRequestException } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  RewardPointLedgerType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RewardsService } from './rewards.service';

describe('RewardsService', () => {
  let service: RewardsService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      update: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    rewardPointLedger: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RewardsService(mockPrisma as unknown as PrismaService);
    mockPrisma.$queryRaw.mockResolvedValue([{ id: 'user_1' }]);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user_1' });
    mockPrisma.rewardPointLedger.findUnique.mockResolvedValue(null);
    mockPrisma.rewardPointLedger.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'ledger_1', ...data }),
    );
    mockPrisma.$transaction.mockImplementation((callback) =>
      callback(mockPrisma),
    );
  });

  it('redeems points atomically and records a negative ledger row', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ rewardPointsBalance: 20 });
    mockPrisma.user.update.mockResolvedValue({ rewardPointsBalance: 10 });

    const result = await service.redeemForOrder(
      mockPrisma as never,
      'user_1',
      'order_1',
      10,
    );

    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { rewardPointsBalance: 10 },
    });
    expect(mockPrisma.rewardPointLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        orderId: 'order_1',
        type: RewardPointLedgerType.REDEEM,
        points: -10,
        balanceAfter: 10,
        idempotencyKey: 'order:order_1:reward_redeem',
      }),
    });
    expect(result?.points).toBe(-10);
  });

  it('does not allow redeeming more points than the current balance', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ rewardPointsBalance: 5 });

    await expect(
      service.redeemForOrder(mockPrisma as never, 'user_1', 'order_1', 10),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.rewardPointLedger.create).not.toHaveBeenCalled();
  });

  it('awards completion points once per delivered paid order', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      customerId: 'user_1',
      totalAmount: 125000,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
    });
    mockPrisma.user.findUnique.mockResolvedValue({ rewardPointsBalance: 0 });

    await service.awardOrderCompletionPoints(mockPrisma as never, 'order_1');

    expect(mockPrisma.rewardPointLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: RewardPointLedgerType.EARN,
        points: 12,
        balanceAfter: 12,
        idempotencyKey: 'order:order_1:reward_earn',
      }),
    });

    jest.clearAllMocks();
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      customerId: 'user_1',
      totalAmount: 125000,
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
    });
    mockPrisma.rewardPointLedger.findUnique.mockResolvedValue({
      id: 'ledger_existing',
    });

    await service.awardOrderCompletionPoints(mockPrisma as never, 'order_1');

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.rewardPointLedger.create).not.toHaveBeenCalled();
  });

  it('rejects reward discounts that would cover the full order total', () => {
    expect(() => service.calculateRedemption(10, 10000)).toThrow(
      BadRequestException,
    );
  });

  it('lets an admin adjust points through the atomic ledger path', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ rewardPointsBalance: 25 });
    mockPrisma.user.update.mockResolvedValue({ rewardPointsBalance: 40 });

    const result = await service.adminAdjustPoints(
      'admin_1',
      'user_1',
      15,
      'Bù điểm chăm sóc khách hàng',
    );

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { rewardPointsBalance: 40 },
    });
    expect(mockPrisma.rewardPointLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        type: RewardPointLedgerType.ADJUSTMENT,
        points: 15,
        balanceAfter: 40,
        description: 'Quản trị viên điều chỉnh: Bù điểm chăm sóc khách hàng',
        idempotencyKey: expect.stringContaining(
          'admin:admin_1:reward_adjustment:',
        ),
      }),
    });
    expect(result.ledger?.points).toBe(15);
  });

  it('rejects an admin adjustment above the configured limit', async () => {
    await expect(
      service.adminAdjustPoints(
        'admin_1',
        'user_1',
        10001,
        'Điều chỉnh vượt giới hạn',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not allow an admin adjustment to create a negative balance', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ rewardPointsBalance: 5 });

    await expect(
      service.adminAdjustPoints(
        'admin_1',
        'user_1',
        -10,
        'Thu hồi điểm cấp nhầm',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.rewardPointLedger.create).not.toHaveBeenCalled();
  });

  it('rejects reward adjustments for seller or admin accounts', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.adminAdjustPoints(
        'admin_1',
        'seller_1',
        10,
        'Không áp dụng cho người bán',
      ),
    ).rejects.toThrow('Customer account not found');

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.rewardPointLedger.create).not.toHaveBeenCalled();
  });
});
