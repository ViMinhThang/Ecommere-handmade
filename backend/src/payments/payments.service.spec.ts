import { PaymentMethod, PaymentStatus, RefundStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const prisma = {
    order: { findMany: jest.fn() },
    customOrder: { findMany: jest.fn() },
  } as unknown as PrismaService;
  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(prisma);
  });

  it('returns order and custom order payment history without card data', async () => {
    const newest = new Date('2026-05-02T00:00:00.000Z');
    const oldest = new Date('2026-05-01T00:00:00.000Z');

    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'order_1',
        totalAmount: 100000,
        currency: 'vnd',
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
        paymentIntentId: 'pi_order',
        refunds: [
          { amount: 25000, status: RefundStatus.SUCCEEDED },
          { amount: 10000, status: RefundStatus.FAILED },
        ],
        createdAt: oldest,
        updatedAt: oldest,
      },
    ]);
    (prisma.customOrder.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'custom_1',
        title: 'Custom vase',
        price: 250000,
        paymentStatus: PaymentStatus.PAID,
        paymentIntentId: 'pi_custom',
        refunds: [],
        createdAt: newest,
        updatedAt: newest,
      },
    ]);

    const result = await service.getPaymentHistory('customer_1');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      source: 'CUSTOM_ORDER',
      sourceId: 'custom_1',
      amount: 250000,
    });
    expect(result[1]).toMatchObject({
      source: 'ORDER',
      sourceId: 'order_1',
      refundedAmount: 25000,
    });
    expect(result[0]).not.toHaveProperty('cardNumber');
  });
});
