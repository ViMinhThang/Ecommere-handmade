import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CustomOrderStatus,
  MarketplaceLedgerEntryType,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { CustomOrdersService } from './custom-orders.service';

type LedgerCreateArgs = {
  data: {
    type: MarketplaceLedgerEntryType;
    idempotencyKey?: string;
  };
};

type CustomOrderUpdateArgs = {
  data: {
    status?: CustomOrderStatus;
    paymentStatus?: PaymentStatus;
    paymentExpiresAt?: Date | null;
    paymentIntentId?: string | null;
    cancelledAt?: Date;
  };
};

describe('CustomOrdersService', () => {
  let service: CustomOrdersService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
    },
    customOrder: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    paymentWebhookEvent: {
      create: jest.fn(),
    },
    marketplaceLedgerEntry: {
      create: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const mockStripe = {
    cancelPaymentIntent: jest.fn(),
    createRefund: jest.fn(),
    createPaymentIntent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
    );
    mockPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'evt_row' });
    mockPrisma.marketplaceLedgerEntry.create.mockResolvedValue({
      id: 'ledger_1',
    });
    mockPrisma.refund.findUnique.mockResolvedValue(null);
    mockStripe.cancelPaymentIntent.mockResolvedValue(null);
    mockStripe.createRefund.mockResolvedValue({
      id: 're_1',
      status: 'succeeded',
      amount: 100000,
      currency: 'vnd',
      payment_intent: 'pi_1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
      ],
    }).compile();

    service = module.get<CustomOrdersService>(CustomOrdersService);
  });

  it('rejects payment confirmation by another customer', async () => {
    mockPrisma.customOrder.findUnique.mockResolvedValue({
      id: 'co_1',
      customerId: 'customer_1',
      sellerId: 'seller_1',
      paymentIntentId: 'pi_1',
      status: CustomOrderStatus.AWAITING_PAYMENT,
      price: 100000,
    });

    await expect(
      service.confirmPayment('co_1', 'customer_2', 'pi_1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects payment intents that do not belong to the custom order', async () => {
    mockPrisma.customOrder.findUnique.mockResolvedValue({
      id: 'co_1',
      customerId: 'customer_1',
      sellerId: 'seller_1',
      paymentIntentId: 'pi_order',
      status: CustomOrderStatus.AWAITING_PAYMENT,
      price: 100000,
    });

    await expect(
      service.confirmPayment('co_1', 'customer_1', 'pi_other'),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents sellers from jumping custom order into paid work states', async () => {
    mockPrisma.customOrder.findUnique.mockResolvedValue({
      id: 'co_1',
      customerId: 'customer_1',
      sellerId: 'seller_1',
      status: CustomOrderStatus.AWAITING_PAYMENT,
    });

    await expect(
      service.advanceStatus(
        'co_1',
        'seller_1',
        ['ROLE_SELLER'],
        CustomOrderStatus.CRAFTING,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks a custom order paid from Stripe webhook without client confirm', async () => {
    const order = {
      id: 'co_1',
      customerId: 'customer_1',
      sellerId: 'seller_1',
      paymentIntentId: 'pi_1',
      paymentStatus: PaymentStatus.UNPAID,
      status: CustomOrderStatus.AWAITING_PAYMENT,
      price: 100000,
    };
    mockPrisma.customOrder.findUnique.mockResolvedValue(order);
    mockPrisma.customOrder.update.mockResolvedValue({
      ...order,
      paymentStatus: PaymentStatus.PAID,
      status: CustomOrderStatus.CRAFTING,
    });

    const result = await service.handlePaymentIntentSucceeded({
      eventId: 'evt_1',
      type: 'payment_intent.succeeded',
      paymentIntentId: 'pi_1',
      amount: 100000,
      currency: 'vnd',
      metadata: {
        customOrderId: 'co_1',
        customerId: 'customer_1',
        sellerId: 'seller_1',
      },
    });

    expect(result).toMatchObject({
      processed: true,
      customOrderId: 'co_1',
      paymentStatus: PaymentStatus.PAID,
    });
    const ledgerCreateMock = mockPrisma.marketplaceLedgerEntry
      .create as jest.MockedFunction<(args: LedgerCreateArgs) => unknown>;
    const sellerEarningCall = ledgerCreateMock.mock.calls
      .map((call) => call[0])
      .find(
        (call) => call.data.type === MarketplaceLedgerEntryType.SELLER_EARNING,
      );
    expect(sellerEarningCall?.data.idempotencyKey).toBe(
      'custom_order:co_1:seller_earning',
    );
  });

  it('recreates an expired custom order payment intent', async () => {
    const expiredAt = new Date(Date.now() - 60_000);
    mockPrisma.customOrder.findUnique.mockResolvedValue({
      id: 'co_1',
      customerId: 'customer_1',
      sellerId: 'seller_1',
      paymentIntentId: 'pi_old',
      paymentStatus: PaymentStatus.UNPAID,
      paymentExpiresAt: expiredAt,
      status: CustomOrderStatus.AWAITING_PAYMENT,
      price: 100000,
    });
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_new',
      client_secret: 'secret_new',
    });

    const result = await service.approveSketch('co_1', 'customer_1');

    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_old');
    expect(mockStripe.createPaymentIntent).toHaveBeenCalledWith(
      100000,
      'vnd',
      expect.objectContaining({ customOrderId: 'co_1' }),
    );
    expect(result).toMatchObject({
      success: true,
      paymentIntentId: 'pi_new',
      clientSecret: 'secret_new',
    });
  });

  it('refunds a paid custom order before cancelling it', async () => {
    const paidOrder = {
      id: 'co_1',
      customerId: 'customer_1',
      sellerId: 'seller_1',
      paymentIntentId: 'pi_1',
      paymentStatus: PaymentStatus.PAID,
      status: CustomOrderStatus.CRAFTING,
      price: 100000,
      refunds: [],
    };
    mockPrisma.customOrder.findUnique.mockResolvedValue(paidOrder);
    mockPrisma.refund.create.mockResolvedValue({
      id: 'refund_1',
      amount: 100000,
      status: RefundStatus.SUCCEEDED,
    });
    mockPrisma.customOrder.update.mockImplementation(
      (args: CustomOrderUpdateArgs) =>
        Promise.resolve({
          ...paidOrder,
          ...args.data,
          refunds: [],
        }),
    );

    const result = await service.cancelOrder('co_1', 'customer_1', [
      'ROLE_CUSTOMER',
    ]);

    expect(mockStripe.createRefund).toHaveBeenCalledWith(
      'pi_1',
      100000,
      expect.objectContaining({ customOrderId: 'co_1' }),
      'refund:custom_order:co_1:100000:Custom order cancellation',
    );
    expect(result).toMatchObject({
      id: 'co_1',
      status: CustomOrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.REFUNDED,
    });
    expect(result.refund).toMatchObject({ id: 'refund_1' });
  });
});
