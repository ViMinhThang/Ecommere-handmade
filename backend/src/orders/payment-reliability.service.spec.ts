import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  CustomOrderStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client';
import { PaymentReliabilityService } from './payment-reliability.service';

describe('PaymentReliabilityService', () => {
  let service: PaymentReliabilityService;

  const mockPrisma = {
    order: {
      findMany: jest.fn(),
    },
    customOrder: {
      findMany: jest.fn(),
    },
    marketplaceLedgerEntry: {
      findMany: jest.fn(),
    },
    paymentWebhookEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.customOrder.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceLedgerEntry.findMany.mockResolvedValue([]);
    mockPrisma.paymentWebhookEvent.findMany.mockResolvedValue([]);
    mockPrisma.paymentWebhookEvent.count.mockResolvedValue(0);
    service = new PaymentReliabilityService(mockPrisma as never);
  });

  it('rejects non-admin callers', async () => {
    await expect(
      service.getAnomalies(['ROLE_SELLER'], {
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('classifies payment reliability anomalies', async () => {
    const now = new Date('2026-05-14T08:00:00.000Z');

    jest.useFakeTimers().setSystemTime(now);
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'order_unpaid_expired',
        status: 'PENDING',
        paymentStatus: PaymentStatus.UNPAID,
        paymentIntentId: null,
        paymentExpiresAt: new Date('2026-05-10T00:00:00.000Z'),
        totalAmount: 100000,
        currency: 'vnd',
        createdAt: new Date('2026-05-09T00:00:00.000Z'),
        updatedAt: new Date('2026-05-10T00:00:00.000Z'),
        refunds: [],
      },
      {
        id: 'order_paid_mismatch',
        status: 'PAID',
        paymentStatus: PaymentStatus.REFUNDED,
        paymentIntentId: 'pi_order_paid',
        paymentExpiresAt: null,
        totalAmount: 100000,
        currency: 'vnd',
        createdAt: new Date('2026-05-10T00:00:00.000Z'),
        updatedAt: new Date('2026-05-11T00:00:00.000Z'),
        refunds: [],
      },
    ]);
    mockPrisma.customOrder.findMany.mockResolvedValue([
      {
        id: 'custom_unpaid_expired',
        status: CustomOrderStatus.AWAITING_PAYMENT,
        paymentStatus: PaymentStatus.UNPAID,
        paymentIntentId: 'pi_custom_unpaid',
        paymentExpiresAt: new Date('2026-05-11T00:00:00.000Z'),
        price: 250000,
        createdAt: new Date('2026-05-10T00:00:00.000Z'),
        updatedAt: new Date('2026-05-11T00:00:00.000Z'),
        refunds: [],
      },
    ]);

    const result = await service.getAnomalies(['ROLE_ADMIN'], {
      page: 1,
      limit: 50,
    });

    const types = result.data.map((row) => row.type);
    expect(types).toContain('STRIPE_ORDER_UNPAID_EXPIRED');
    expect(types).toContain('CUSTOM_ORDER_UNPAID_EXPIRED');
    expect(types).toContain('PAID_ORDER_MISSING_CAPTURE_LEDGER');
    expect(types).toContain('REFUND_STATUS_MISMATCH');
    expect(types).toContain('PAID_WITHOUT_WEBHOOK_RECORD');
    const webhookMissingRow = result.data.find(
      (row) => row.type === 'PAID_WITHOUT_WEBHOOK_RECORD',
    );
    expect(webhookMissingRow?.severity).toBe('LOW');
    expect(webhookMissingRow?.details).toEqual(
      expect.objectContaining({
        isHeuristic: true,
      }),
    );
    expect(
      result.data.find((row) => row.type === 'CUSTOM_ORDER_UNPAID_EXPIRED')
        ?.severity,
    ).toBe('HIGH');

    jest.useRealTimers();
  });

  it('clamps pagination limit to 100', async () => {
    const now = new Date('2026-05-14T08:00:00.000Z');
    const manyRows = Array.from({ length: 150 }, (_, index) => ({
      id: `order_${index}`,
      status: 'PENDING',
      paymentStatus: PaymentStatus.UNPAID,
      paymentIntentId: null,
      paymentExpiresAt: new Date('2026-05-01T00:00:00.000Z'),
      totalAmount: 1000,
      currency: 'vnd',
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: now,
      refunds: [],
    }));
    jest.useFakeTimers().setSystemTime(now);
    mockPrisma.order.findMany.mockResolvedValue(manyRows);

    const result = await service.getAnomalies(['ROLE_ADMIN'], {
      page: 1,
      limit: 1000,
    });

    expect(result.meta.limit).toBe(100);
    expect(result.data).toHaveLength(100);
    jest.useRealTimers();
  });

  it('applies default bounded date window when from/to are missing', async () => {
    const fixedNow = new Date('2026-05-14T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(fixedNow);

    await service.getAnomalies(['ROLE_ADMIN'], {
      page: 1,
      limit: 20,
    });

    expect(mockPrisma.order.findMany).toHaveBeenCalledTimes(1);
    const orderFindManyArgs = mockPrisma.order.findMany.mock.calls[0][0];
    expect(orderFindManyArgs.where.paymentMethod).toBe(PaymentMethod.STRIPE);
    expect(orderFindManyArgs.where.createdAt?.gte).toBeInstanceOf(Date);
    expect(orderFindManyArgs.where.createdAt?.lte).toBeInstanceOf(Date);
    const spanMs =
      orderFindManyArgs.where.createdAt.lte.getTime() -
      orderFindManyArgs.where.createdAt.gte.getTime();
    expect(spanMs).toBe(30 * 24 * 60 * 60 * 1000);

    const customOrderArgs = mockPrisma.customOrder.findMany.mock.calls[0][0];
    expect(customOrderArgs.where.createdAt?.gte).toBeInstanceOf(Date);
    expect(customOrderArgs.where.createdAt?.lte).toBeInstanceOf(Date);
    jest.useRealTimers();
  });

  it('uses bounded 30-day window when only from is provided', async () => {
    const from = '2026-05-01T00:00:00.000Z';
    await service.getAnomalies(['ROLE_ADMIN'], {
      page: 1,
      limit: 20,
      from,
    });

    const orderFindManyArgs = mockPrisma.order.findMany.mock.calls[0][0];
    const start = orderFindManyArgs.where.createdAt.gte as Date;
    const end = orderFindManyArgs.where.createdAt.lte as Date;
    expect(start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('uses bounded 30-day window when only to is provided', async () => {
    const to = '2026-05-20T00:00:00.000Z';
    await service.getAnomalies(['ROLE_ADMIN'], {
      page: 1,
      limit: 20,
      to,
    });

    const orderFindManyArgs = mockPrisma.order.findMany.mock.calls[0][0];
    const start = orderFindManyArgs.where.createdAt.gte as Date;
    const end = orderFindManyArgs.where.createdAt.lte as Date;
    expect(end.toISOString()).toBe('2026-05-20T00:00:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('throws when from is later than to', async () => {
    await expect(
      service.getAnomalies(['ROLE_ADMIN'], {
        page: 1,
        limit: 20,
        from: '2026-05-14T00:00:00.000Z',
        to: '2026-05-13T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when date input is invalid', async () => {
    await expect(
      service.getAnomalies(['ROLE_ADMIN'], {
        page: 1,
        limit: 20,
        from: 'not-a-date',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when date window exceeds 90 days', async () => {
    await expect(
      service.getAnomalies(['ROLE_ADMIN'], {
        page: 1,
        limit: 20,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-05-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns empty paginated shape when no anomaly exists', async () => {
    const result = await service.getAnomalies(['ROLE_ADMIN'], {
      page: 1,
      limit: 20,
    });

    expect(result).toEqual({
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it('flags REFUNDED status when refunded amount exceeds total', async () => {
    const now = new Date('2026-05-14T08:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'order_refunded_over',
        status: 'PAID',
        paymentStatus: PaymentStatus.REFUNDED,
        paymentIntentId: 'pi_refund_over',
        paymentExpiresAt: null,
        totalAmount: 100000,
        currency: 'vnd',
        createdAt: new Date('2026-05-10T00:00:00.000Z'),
        updatedAt: now,
        refunds: [
          {
            amount: 120000,
            status: RefundStatus.SUCCEEDED,
          },
        ],
      },
    ]);

    const result = await service.getAnomalies(['ROLE_ADMIN'], {
      page: 1,
      limit: 20,
    });

    expect(
      result.data.some((row) => row.type === 'REFUND_STATUS_MISMATCH'),
    ).toBe(true);
    jest.useRealTimers();
  });
});
