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
import { SettingsService } from '../settings/settings.service';
import { CustomOrdersService } from './custom-orders.service';
import { VouchersService } from '../vouchers/vouchers.service';

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
    voucherId?: string | null;
    voucherCode?: string | null;
    discountAmount?: number;
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
      findMany: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    voucher: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    voucherUsage: {
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
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
  const mockSettings = {
    getPlatformCommissionBps: jest.fn(() => 1000),
  };
  const mockVouchers = {
    assertVoucherUsageAvailable: jest.fn(),
    calculateDiscountAmount: jest.fn(),
    findByCode: jest.fn(),
    findMatchingRange: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
    );
    mockPrisma.customOrder.update.mockImplementation(
      (args: CustomOrderUpdateArgs) =>
        Promise.resolve({
          id: 'co_1',
          customerId: 'customer_1',
          sellerId: 'seller_1',
          price: 100000,
          discountAmount: 0,
          ...args.data,
        }),
    );
    mockPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'evt_row' });
    mockPrisma.marketplaceLedgerEntry.create.mockResolvedValue({
      id: 'ledger_1',
    });
    mockPrisma.marketplaceLedgerEntry.findMany.mockResolvedValue([]);
    mockPrisma.refund.findUnique.mockResolvedValue(null);
    mockPrisma.voucher.findUnique.mockResolvedValue({
      id: 'voucher_1',
      usageLimit: null,
      perUserLimit: null,
      usedCount: 0,
    });
    mockPrisma.voucher.update.mockResolvedValue({ id: 'voucher_1' });
    mockPrisma.voucherUsage.count.mockResolvedValue(0);
    mockPrisma.voucherUsage.create.mockResolvedValue({ id: 'usage_1' });
    mockPrisma.voucherUsage.delete.mockResolvedValue({ id: 'usage_1' });
    mockPrisma.voucherUsage.findUnique.mockResolvedValue(null);
    mockStripe.cancelPaymentIntent.mockResolvedValue(null);
    mockStripe.createRefund.mockResolvedValue({
      id: 're_1',
      status: 'succeeded',
      amount: 100000,
      currency: 'vnd',
      payment_intent: 'pi_1',
    });
    mockVouchers.assertVoucherUsageAvailable.mockResolvedValue(undefined);
    mockVouchers.calculateDiscountAmount.mockReturnValue(0);
    mockVouchers.findByCode.mockResolvedValue({
      id: 'voucher_1',
      code: 'SAVE10',
      sellerId: null,
      maxDiscountAmount: null,
      usageLimit: null,
      perUserLimit: null,
      usedCount: 0,
      ranges: [],
    });
    mockVouchers.findMatchingRange.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomOrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
        { provide: SettingsService, useValue: mockSettings },
        { provide: VouchersService, useValue: mockVouchers },
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

  it('returns admin custom order ledger rows', async () => {
    const ledgerRows = [
      {
        id: 'ledger_capture',
        type: MarketplaceLedgerEntryType.PAYMENT_CAPTURE,
        amount: 100000,
      },
      {
        id: 'ledger_refund',
        type: MarketplaceLedgerEntryType.REFUND,
        amount: -90000,
      },
    ];
    mockPrisma.customOrder.findUnique.mockResolvedValue({ id: 'co_1' });
    mockPrisma.marketplaceLedgerEntry.findMany.mockResolvedValue(ledgerRows);

    const result = await service.getAdminCustomOrderLedger('co_1');

    expect(result).toBe(ledgerRows);
    expect(mockPrisma.marketplaceLedgerEntry.findMany).toHaveBeenCalledWith({
      where: { customOrderId: 'co_1' },
      include: {
        seller: {
          select: { id: true, name: true, shopName: true, avatar: true },
        },
        customer: { select: { id: true, name: true, email: true } },
        refund: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('throws when admin custom order ledger target does not exist', async () => {
    mockPrisma.customOrder.findUnique.mockResolvedValue(null);

    await expect(
      service.getAdminCustomOrderLedger('missing_custom_order'),
    ).rejects.toThrow('Custom Order not found');
    expect(mockPrisma.marketplaceLedgerEntry.findMany).not.toHaveBeenCalled();
  });
});
