import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CategoryStatus,
  MarketplaceLedgerEntryType,
  FlashSaleState,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
  RefundStatus,
} from '@prisma/client';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { SettingsService } from '../settings/settings.service';
import { RewardsService } from '../rewards/rewards.service';
import { OrdersService } from './orders.service';
import { VouchersService } from '../vouchers/vouchers.service';

type OrderFindUniqueArgs = {
  where: {
    id?: string;
    paymentIntentId?: string;
  };
  include?: unknown;
};

type LedgerCreateArgs = {
  data: {
    type: MarketplaceLedgerEntryType;
    idempotencyKey?: string;
    subOrder?: { connect: { id: string } };
    seller?: { connect: { id: string } };
  };
};

describe('OrdersService', () => {
  let service: OrdersService;

  const mockPrisma = {
    address: {
      findFirst: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    subOrder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderItem: {
      createMany: jest.fn(),
    },
    cartItem: {
      deleteMany: jest.fn(),
    },
    cart: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    paymentWebhookEvent: {
      create: jest.fn(),
    },
    marketplaceLedgerEntry: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    refund: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    flashSale: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    flashSaleUserUsage: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    voucher: {
      findFirst: jest.fn(),
    },
    voucherUsage: {
      count: jest.fn(),
    },
    shippingProfile: {
      findFirst: jest.fn(),
    },
    giftWrapTier: {
      findFirst: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const mockStripe = {
    createPaymentIntent: jest.fn(),
    createRefund: jest.fn(),
    retrievePaymentIntent: jest.fn(),
    updatePaymentIntentMetadata: jest.fn(),
    cancelPaymentIntent: jest.fn(),
  };
  const mockCart = {
    getCart: jest.fn(),
  };
  const previousFlashSaleGuardrailsFlag =
    process.env.FLASH_SALE_GUARDRAILS_ENABLED;
  const mockSettings = {
    getPlatformCommissionBps: jest.fn(() => 1000),
  };
  const mockRewards = {
    normalizePoints: jest.fn(() => 0),
    calculateRedemption: jest.fn(() => ({ points: 0, discountAmount: 0 })),
    redeemForOrder: jest.fn(),
    refundRedeemedPointsForOrder: jest.fn(),
    awardOrderCompletionPoints: jest.fn(),
  };
  const mockVouchers = {
    assertVoucherUsageAvailable: jest.fn(),
    findMatchingRange: jest.fn(),
    calculateDiscountAmount: jest.fn(),
  };

  const shippingAddress = {
    fullName: 'Customer',
    phone: '0900000000',
    address: '1 Handmade St',
    city: 'HCM',
    district: '1',
    ward: 'Ben Nghe',
  };

  const buildCart = (overrides: Record<string, unknown> = {}) => ({
    id: 'cart_1',
    userId: 'customer_1',
    subtotal: 100000,
    discountAmount: 0,
    total: 100000,
    appliedVoucher: null,
    items: [
      {
        productId: 'product_1',
        quantity: 1,
        personalization: null,
        selectedOptions: null,
        pricing: { discountedPrice: 100000, originalPrice: 100000 },
        product: {
          id: 'product_1',
          name: 'Handmade cup',
          sellerId: 'seller_1',
          status: ProductStatus.APPROVED,
          stock: 5,
          deletedAt: null,
          categoryId: 'cat_1',
          category: {
            status: CategoryStatus.ACTIVE,
            deletedAt: null,
          },
        },
      },
    ],
    ...overrides,
  });

  const buildVoucherCart = (overrides: Record<string, unknown> = {}) =>
    buildCart({
      discountAmount: 10000,
      total: 90000,
      appliedVoucher: {
        code: 'HANDMADE10',
        discountAmount: 10000,
        discountPercent: 10,
        categoryId: 'cat_1',
        sellerId: null,
      },
      ...overrides,
    });

  const buildVoucher = (overrides: Record<string, unknown> = {}) => ({
    id: 'voucher_1',
    code: 'HANDMADE10',
    categoryId: 'cat_1',
    isActive: true,
    endDate: new Date(Date.now() + 60 * 60 * 1000),
    maxDiscountAmount: null,
    usageLimit: null,
    perUserLimit: null,
    usedCount: 0,
    ranges: [
      {
        minPrice: 0,
        maxPrice: 200000,
        discountPercent: 10,
        endDate: new Date(Date.now() + 60 * 60 * 1000),
        deletedAt: null,
      },
    ],
    ...overrides,
  });

  const buildFlashSaleCart = (overrides: Record<string, unknown> = {}) =>
    buildCart({
      subtotal: 90000,
      total: 90000,
      items: [
        {
          productId: 'product_1',
          quantity: 1,
          personalization: null,
          selectedOptions: null,
          pricing: {
            originalPrice: 100000,
            discountedPrice: 90000,
            discountPercent: 10,
            flashSaleId: 'flash_sale_1',
          },
          product: {
            id: 'product_1',
            name: 'Handmade cup',
            sellerId: 'seller_1',
            status: ProductStatus.APPROVED,
            stock: 5,
            price: 100000,
            deletedAt: null,
            categoryId: 'cat_1',
            category: {
              status: CategoryStatus.ACTIVE,
              deletedAt: null,
            },
          },
        },
      ],
      ...overrides,
    });

  const buildFlashSale = (overrides: Record<string, unknown> = {}) => ({
    id: 'flash_sale_1',
    isActive: true,
    saleState: FlashSaleState.ACTIVE,
    startAt: new Date(Date.now() - 60 * 1000),
    endAt: new Date(Date.now() + 60 * 1000),
    ranges: [
      {
        minPrice: 0,
        maxPrice: 200000,
        discountPercent: 10,
      },
    ],
    ...overrides,
  });

  const expectNoFlashSaleCounterWrites = () => {
    expect(mockPrisma.flashSale.update).not.toHaveBeenCalled();
    expect(mockPrisma.flashSale.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.create).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.update).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.upsert).not.toHaveBeenCalled();
  };

  const getRawSqlValues = (callIndex: number) => {
    const sql = mockPrisma.$queryRaw.mock.calls.at(callIndex)?.[0] as
      | { values?: unknown[] }
      | undefined;
    return sql?.values ?? [];
  };

  const getRawSqlText = (callIndex: number) => {
    const sql = mockPrisma.$queryRaw.mock.calls.at(callIndex)?.[0] as
      | { strings?: readonly string[] }
      | undefined;
    return sql?.strings?.join(' ') ?? '';
  };

  const buildReusableOrder = (overrides: Record<string, unknown> = {}) => ({
    id: 'order_1',
    customerId: 'customer_1',
    totalAmount: 125000,
    discountAmount: 0,
    voucherCode: null,
    paymentMethod: PaymentMethod.STRIPE,
    paymentStatus: PaymentStatus.UNPAID,
    status: OrderStatus.PENDING,
    paymentIntentId: 'pi_1',
    paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    shippingAddress,
    subOrders: [
      {
        items: [
          {
            productId: 'product_1',
            quantity: 1,
            price: 100000,
            originalPrice: 100000,
            platformDiscountAmount: 0,
            personalization: null,
            selectedOptions: null,
          },
        ],
      },
    ],
    ...overrides,
  });

  const buildFlashSaleCounterOrder = (
    overrides: Record<string, unknown> = {},
  ) => ({
    id: 'order_1',
    customerId: 'customer_1',
    totalAmount: 125000,
    paymentIntentId: 'pi_1',
    paymentMethod: PaymentMethod.STRIPE,
    paymentStatus: PaymentStatus.UNPAID,
    status: OrderStatus.PENDING,
    refunds: [],
    subOrders: [
      {
        id: 'sub_1',
        sellerId: 'seller_1',
        status: OrderStatus.PENDING,
        discountAmount: 0,
        subTotal: 280000,
        items: [
          {
            productId: 'product_1',
            quantity: 1,
            price: 90000,
            originalPrice: 100000,
            flashSaleId: 'flash_sale_1',
            flashSaleDiscountPercent: 10,
          },
          {
            productId: 'product_2',
            quantity: 2,
            price: 95000,
            originalPrice: 100000,
            flashSaleId: 'flash_sale_1',
            flashSaleDiscountPercent: 5,
          },
          {
            productId: 'product_3',
            quantity: 1,
            price: 100000,
            originalPrice: 100000,
            flashSaleId: 'flash_sale_1',
            flashSaleDiscountPercent: 0,
          },
        ],
      },
    ],
    ...overrides,
  });

  const mockOrderLifecycleLookup = (
    paymentIntentOrder: Record<string, unknown>,
    counterOrder: Record<string, unknown> = buildFlashSaleCounterOrder(),
  ) => {
    mockPrisma.order.findUnique.mockImplementation(
      (args: OrderFindUniqueArgs & { select?: unknown }) => {
        if (args.where.paymentIntentId) {
          return Promise.resolve(paymentIntentOrder);
        }

        if (args.select || args.include) {
          return Promise.resolve(counterOrder);
        }

        return Promise.resolve({
          ...paymentIntentOrder,
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.PAID,
        });
      },
    );
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.FLASH_SALE_GUARDRAILS_ENABLED;
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.create.mockImplementation((args: { data: unknown }) =>
      Promise.resolve({
        id: 'order_1',
        ...(args.data as Record<string, unknown>),
      }),
    );
    mockPrisma.order.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.subOrder.create.mockResolvedValue({ id: 'sub_1' });
    mockPrisma.subOrder.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.orderItem.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.product.findFirst.mockResolvedValue({
      price: 100000,
      categoryId: 'cat_1',
    });
    mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.flashSale.findFirst.mockResolvedValue(null);
    mockPrisma.flashSale.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.flashSaleUserUsage.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.voucher.findFirst.mockResolvedValue(null);
    mockPrisma.voucherUsage.count.mockResolvedValue(0);
    mockPrisma.shippingProfile.findFirst.mockResolvedValue(null);
    mockPrisma.giftWrapTier.findFirst.mockResolvedValue(null);
    mockPrisma.inventoryLog.create.mockResolvedValue({ id: 'inv_1' });
    mockPrisma.$queryRaw.mockResolvedValue([{ id: 'flash_sale_1' }]);
    mockPrisma.cart.findUnique.mockResolvedValue(null);
    mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.cart.update.mockResolvedValue({ id: 'cart_1' });
    mockPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'evt_row' });
    mockPrisma.marketplaceLedgerEntry.create.mockResolvedValue({
      id: 'ledger_1',
    });
    mockPrisma.marketplaceLedgerEntry.findUnique.mockResolvedValue(null);
    mockPrisma.marketplaceLedgerEntry.findMany.mockResolvedValue([]);
    mockPrisma.refund.findUnique.mockResolvedValue(null);
    mockStripe.createRefund.mockResolvedValue({
      id: 're_1',
      status: 'succeeded',
      amount: 100000,
      currency: 'vnd',
      payment_intent: 'pi_1',
    });
    mockStripe.updatePaymentIntentMetadata.mockResolvedValue(null);
    mockStripe.cancelPaymentIntent.mockResolvedValue(null);
    mockRewards.normalizePoints.mockReturnValue(0);
    mockRewards.calculateRedemption.mockReturnValue({
      points: 0,
      discountAmount: 0,
    });
    mockRewards.redeemForOrder.mockResolvedValue(null);
    mockRewards.refundRedeemedPointsForOrder.mockResolvedValue(null);
    mockRewards.awardOrderCompletionPoints.mockResolvedValue(null);
    mockVouchers.assertVoucherUsageAvailable.mockResolvedValue(undefined);
    mockVouchers.findMatchingRange.mockImplementation((ranges) => ranges[0]);
    mockVouchers.calculateDiscountAmount.mockImplementation(
      (_voucher, range, eligibleSubtotal) =>
        Math.round(
          (Number(eligibleSubtotal) * Number(range.discountPercent)) / 100,
        ),
    );
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
        { provide: CartService, useValue: mockCart },
        { provide: SettingsService, useValue: mockSettings },
        { provide: RewardsService, useValue: mockRewards },
        { provide: VouchersService, useValue: mockVouchers },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterAll(() => {
    if (previousFlashSaleGuardrailsFlag === undefined) {
      delete process.env.FLASH_SALE_GUARDRAILS_ENABLED;
      return;
    }

    process.env.FLASH_SALE_GUARDRAILS_ENABLED = previousFlashSaleGuardrailsFlag;
  });

  it('does not checkout when atomic stock decrement fails', async () => {
    mockCart.getCart.mockResolvedValue({
      id: 'cart_1',
      userId: 'customer_1',
      subtotal: 100000,
      discountAmount: 0,
      total: 100000,
      appliedVoucher: null,
      items: [
        {
          productId: 'product_1',
          quantity: 2,
          pricing: { discountedPrice: 50000 },
          product: {
            id: 'product_1',
            name: 'Handmade cup',
            sellerId: 'seller_1',
            status: ProductStatus.APPROVED,
            stock: 2,
            deletedAt: null,
            categoryId: 'cat_1',
            category: {
              status: CategoryStatus.ACTIVE,
              deletedAt: null,
            },
          },
        },
      ],
    });
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret',
    });
    mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.checkout(
        'customer_1',
        {
          shippingAddress: {
            fullName: 'Customer',
            phone: '0900000000',
            address: '1 Handmade St',
            city: 'HCM',
            district: '1',
            ward: 'Ben Nghe',
          },
        },
        PaymentMethod.STRIPE,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
  });

  it('marks a Stripe order paid once from a valid webhook payload', async () => {
    const order = {
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 125000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    };
    mockPrisma.order.findUnique.mockImplementation(
      (args: OrderFindUniqueArgs) => {
        if (args.where.paymentIntentId) {
          return Promise.resolve(order);
        }
        return Promise.resolve({
          ...order,
          subOrders: [
            {
              id: 'sub_1',
              sellerId: 'seller_1',
              discountAmount: 0,
              items: [
                {
                  productId: 'product_1',
                  quantity: 1,
                  price: 100000,
                  originalPrice: 100000,
                },
              ],
            },
          ],
        });
      },
    );
    mockPrisma.order.update.mockResolvedValue({
      id: 'order_1',
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PAID,
    });
    mockPrisma.subOrder.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.handlePaymentIntentSucceeded({
      eventId: 'evt_1',
      type: 'payment_intent.succeeded',
      paymentIntentId: 'pi_1',
      amount: 125000,
      currency: 'vnd',
      metadata: { orderId: 'order_1', userId: 'customer_1' },
    });

    expect(result).toMatchObject({ processed: true, orderId: 'order_1' });
    const webhookCreateMock = mockPrisma.paymentWebhookEvent
      .create as jest.MockedFunction<
      (args: { data: { eventId: string } }) => unknown
    >;
    const webhookCreateCall = webhookCreateMock.mock.calls.at(-1)?.[0];
    expect(webhookCreateCall?.data.eventId).toBe('evt_1');

    const orderUpdateMock = mockPrisma.order.update as jest.MockedFunction<
      (args: { data: { paymentStatus: PaymentStatus } }) => unknown
    >;
    const orderUpdateCall = orderUpdateMock.mock.calls.at(-1)?.[0];
    expect(orderUpdateCall?.data.paymentStatus).toBe(PaymentStatus.PAID);
    const ledgerCreateMock = mockPrisma.marketplaceLedgerEntry
      .create as jest.MockedFunction<(args: LedgerCreateArgs) => unknown>;
    const paymentCaptureCall = ledgerCreateMock.mock.calls
      .map((call) => call[0])
      .find(
        (call) => call.data.type === MarketplaceLedgerEntryType.PAYMENT_CAPTURE,
      );
    expect(paymentCaptureCall?.data.idempotencyKey).toBe(
      'order:order_1:payment_capture',
    );
    expectNoFlashSaleCounterWrites();
  });

  it('converts Stripe webhook flash sale reservations to sold once when guardrails are enabled', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = {
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 125000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    };
    mockOrderLifecycleLookup(order);

    const result = await service.handlePaymentIntentSucceeded({
      eventId: 'evt_1',
      type: 'payment_intent.succeeded',
      paymentIntentId: 'pi_1',
      amount: 125000,
      currency: 'vnd',
      metadata: { orderId: 'order_1', userId: 'customer_1' },
    });

    expect(result).toMatchObject({ processed: true, orderId: 'order_1' });
    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order_1',
        paymentStatus: PaymentStatus.UNPAID,
        status: { not: OrderStatus.CANCELLED },
      },
      data: {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paymentExpiresAt: null,
      },
    });
    expect(mockPrisma.flashSale.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.flashSale.updateMany).toHaveBeenCalledWith({
      where: { id: 'flash_sale_1', reservedUnits: { gte: 3 } },
      data: {
        reservedUnits: { decrement: 3 },
        soldUnits: { increment: 3 },
      },
    });
    expect(mockPrisma.flashSaleUserUsage.updateMany).toHaveBeenCalledWith({
      where: {
        flashSaleId: 'flash_sale_1',
        userId: 'customer_1',
        reservedUnits: { gte: 3 },
      },
      data: {
        reservedUnits: { decrement: 3 },
        soldUnits: { increment: 3 },
      },
    });
  });

  it('converts client-confirmed Stripe flash sale reservations once', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = {
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 125000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    };
    mockOrderLifecycleLookup(order);
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount: 125000,
      amount_received: 125000,
      currency: 'vnd',
      metadata: { orderId: 'order_1', userId: 'customer_1' },
    });

    const result = await service.confirmPayment('customer_1', 'pi_1');

    expect(result).toMatchObject({
      success: true,
      orderId: 'order_1',
    });
    expect(mockStripe.retrievePaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.flashSale.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.flashSaleUserUsage.updateMany).toHaveBeenCalledTimes(1);
  });

  it('skips flash sale conversion for duplicate Stripe success webhooks', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 125000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    });
    mockPrisma.paymentWebhookEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.handlePaymentIntentSucceeded({
      eventId: 'evt_1',
      type: 'payment_intent.succeeded',
      paymentIntentId: 'pi_1',
      amount: 125000,
      currency: 'vnd',
      metadata: { orderId: 'order_1', userId: 'customer_1' },
    });

    expect(result).toMatchObject({ processed: false, reason: 'duplicate' });
    expect(mockPrisma.flashSale.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.updateMany).not.toHaveBeenCalled();
  });

  it('skips flash sale conversion when Stripe order is already paid', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 125000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PAID,
    });

    const result = await service.handlePaymentIntentSucceeded({
      eventId: 'evt_1',
      type: 'payment_intent.succeeded',
      paymentIntentId: 'pi_1',
      amount: 125000,
      currency: 'vnd',
      metadata: { orderId: 'order_1', userId: 'customer_1' },
    });

    expect(result).toMatchObject({ processed: false, reason: 'already_paid' });
    expect(mockPrisma.flashSale.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.updateMany).not.toHaveBeenCalled();
  });

  it('rolls back Stripe paid transition path when flash sale counter conversion fails', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = {
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 125000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    };
    mockOrderLifecycleLookup(order);
    mockPrisma.flashSale.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.handlePaymentIntentSucceeded({
        eventId: 'evt_1',
        type: 'payment_intent.succeeded',
        paymentIntentId: 'pi_1',
        amount: 125000,
        currency: 'vnd',
        metadata: { orderId: 'order_1', userId: 'customer_1' },
      }),
    ).rejects.toThrow('Flash sale reservation state is inconsistent');

    expect(mockPrisma.subOrder.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.marketplaceLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('reuses an active checkout for the same idempotency key', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    mockPrisma.order.findFirst.mockResolvedValue(
      buildReusableOrder({ paymentExpiresAt: expiresAt }),
    );
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
      status: 'requires_payment_method',
      amount: 125000,
      currency: 'vnd',
      metadata: {},
    });

    const result = await service.checkout(
      'customer_1',
      {
        idempotencyKey: 'checkout-key-1',
        shippingAddress,
      },
      PaymentMethod.STRIPE,
    );

    expect(result).toMatchObject({
      orderId: 'order_1',
      clientSecret: 'secret_1',
      paymentStatus: PaymentStatus.UNPAID,
      requiresPayment: true,
    });
    expect(mockCart.getCart).not.toHaveBeenCalled();
    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('rejects a reused idempotency key with another payment method', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(
      buildReusableOrder({
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.COD_PENDING,
        paymentIntentId: null,
        paymentExpiresAt: null,
      }),
    );

    await expect(
      service.checkout(
        'customer_1',
        {
          idempotencyKey: 'checkout-key-1',
          shippingAddress,
        },
        PaymentMethod.STRIPE,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockCart.getCart).not.toHaveBeenCalled();
    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('rejects a reused idempotency key with another shipping address', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(
      buildReusableOrder({
        shippingAddress: { ...shippingAddress, address: '2 Handmade St' },
      }),
    );

    await expect(
      service.checkout(
        'customer_1',
        {
          idempotencyKey: 'checkout-key-1',
          shippingAddress,
        },
        PaymentMethod.STRIPE,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockCart.getCart).not.toHaveBeenCalled();
    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('rejects a reused idempotency key with another cart payload', async () => {
    const changedCart = buildCart({
      items: [
        {
          productId: 'product_2',
          quantity: 1,
          pricing: { discountedPrice: 100000, originalPrice: 100000 },
          product: {
            id: 'product_2',
            name: 'Handmade bowl',
            sellerId: 'seller_1',
            status: ProductStatus.APPROVED,
            stock: 5,
            deletedAt: null,
            categoryId: 'cat_1',
            category: {
              status: CategoryStatus.ACTIVE,
              deletedAt: null,
            },
          },
        },
      ],
    });
    mockPrisma.cart.findUnique.mockResolvedValue({
      items: [{ productId: 'product_2', quantity: 1 }],
    });
    mockCart.getCart.mockResolvedValue(changedCart);
    mockPrisma.order.findFirst.mockResolvedValue(buildReusableOrder());

    await expect(
      service.checkout(
        'customer_1',
        {
          idempotencyKey: 'checkout-key-1',
          shippingAddress,
        },
        PaymentMethod.STRIPE,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('creates a deterministic server idempotency key when client key is missing', async () => {
    mockCart.getCart.mockResolvedValue(buildCart());
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    const result = await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.STRIPE,
    );

    const orderCreateCall = mockPrisma.order.create.mock.calls.at(-1)?.[0];
    expect(orderCreateCall?.data.checkoutIdempotencyKey).toMatch(/^server:/);
    expect(result).toMatchObject({
      orderId: 'order_1',
      clientSecret: 'secret_1',
      requiresPayment: true,
    });
  });

  it('copies cart item personalization into order item snapshots', async () => {
    const cart = buildCart();
    mockCart.getCart.mockResolvedValue({
      ...cart,
      items: [
        {
          ...cart.items[0],
          personalization: { text: 'Khắc tên Linh' },
          selectedOptions: {
            color: 'Đỏ rượu',
            material: 'Nhung',
            size: 'M',
            processingTime: '2-3 ngày',
          },
        },
      ],
    });

    await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.COD,
    );

    const itemCreateCall =
      mockPrisma.orderItem.createMany.mock.calls.at(-1)?.[0];
    expect(itemCreateCall?.data[0]).toMatchObject({
      productId: 'product_1',
      quantity: 1,
      personalization: { text: 'Khắc tên Linh' },
      selectedOptions: {
        color: 'Đỏ rượu',
        material: 'Nhung',
        size: 'M',
        processingTime: '2-3 ngày',
      },
    });
    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('adds selected gift wrap tier fee and snapshot to checkout order', async () => {
    mockCart.getCart.mockResolvedValue(buildCart());
    mockPrisma.giftWrapTier.findFirst.mockResolvedValue({
      id: 'gift_wrap_1',
      name: 'Hộp quà cao cấp',
      description: 'Hộp cứng và ruy băng',
      price: 35000,
      includesCard: true,
    });

    await service.checkout(
      'customer_1',
      {
        shippingAddress,
        giftWrap: true,
        giftWrapTierId: 'gift_wrap_1',
        giftMessage: 'Chúc mừng sinh nhật',
      },
      PaymentMethod.COD,
    );

    const orderCreateCall = mockPrisma.order.create.mock.calls.at(-1)?.[0];
    expect(orderCreateCall?.data).toMatchObject({
      totalAmount: 160000,
      giftWrap: true,
      giftCard: true,
      giftMessage: 'Chúc mừng sinh nhật',
      giftWrapTierId: 'gift_wrap_1',
      giftWrapFee: 35000,
      giftWrapTierSnapshot: expect.objectContaining({
        tierId: 'gift_wrap_1',
        name: 'Hộp quà cao cấp',
        price: 35000,
        includesCard: true,
      }),
    });
  });

  it('rejects checkout when gift wrap is selected without a tier', async () => {
    mockCart.getCart.mockResolvedValue(buildCart());

    await expect(
      service.checkout(
        'customer_1',
        { shippingAddress, giftWrap: true },
        PaymentMethod.COD,
      ),
    ).rejects.toThrow('Gift wrap tier is required');

    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });

  it('reuses existing checkout for the same missing-key payload fallback', async () => {
    mockCart.getCart.mockResolvedValue(buildCart());
    mockPrisma.order.findFirst.mockResolvedValue(buildReusableOrder());
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
      status: 'requires_payment_method',
      amount: 125000,
      currency: 'vnd',
      metadata: {},
    });

    const result = await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.STRIPE,
    );

    expect(result).toMatchObject({
      orderId: 'order_1',
      clientSecret: 'secret_1',
      requiresPayment: true,
    });
    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('reuses a provided idempotency key with the same checkout payload', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({
      items: [{ productId: 'product_1', quantity: 1 }],
    });
    mockCart.getCart.mockResolvedValue(buildCart());
    mockPrisma.order.findFirst.mockResolvedValue(buildReusableOrder());
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
      status: 'requires_payment_method',
      amount: 125000,
      currency: 'vnd',
      metadata: {},
    });

    const result = await service.checkout(
      'customer_1',
      {
        idempotencyKey: 'checkout-key-1',
        shippingAddress,
      },
      PaymentMethod.STRIPE,
    );

    expect(result).toMatchObject({
      orderId: 'order_1',
      clientSecret: 'secret_1',
      requiresPayment: true,
    });
    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('does not reserve flash sale counters when an idempotent checkout is reused', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockPrisma.cart.findUnique.mockResolvedValue({
      items: [{ productId: 'product_1', quantity: 1 }],
    });
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.order.findFirst.mockResolvedValue(
      buildReusableOrder({
        totalAmount: 115000,
        subOrders: [
          {
            items: [
              {
                productId: 'product_1',
                quantity: 1,
                price: 90000,
                originalPrice: 100000,
                platformDiscountAmount: 10000,
              },
            ],
          },
        ],
      }),
    );
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
      status: 'requires_payment_method',
      amount: 115000,
      currency: 'vnd',
      metadata: {},
    });

    const result = await service.checkout(
      'customer_1',
      {
        idempotencyKey: 'checkout-key-1',
        shippingAddress,
      },
      PaymentMethod.STRIPE,
    );

    expect(result).toMatchObject({
      orderId: 'order_1',
      clientSecret: 'secret_1',
      requiresPayment: true,
    });
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    expectNoFlashSaleCounterWrites();
  });

  it('records voucher usage when checkout succeeds with an applied voucher', async () => {
    mockCart.getCart.mockResolvedValue(buildVoucherCart());
    mockPrisma.voucher.findFirst.mockResolvedValue(buildVoucher());

    const result = await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.COD,
    );

    expect(result).toMatchObject({
      orderId: 'order_1',
      paymentMethod: PaymentMethod.COD,
      requiresPayment: false,
    });
    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          voucherCode: 'HANDMADE10',
          discountAmount: 10000,
          totalAmount: 115000,
        }),
      }),
    );
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(getRawSqlText(0)).toContain('INSERT INTO "VoucherUsage"');
    expect(getRawSqlText(1)).toContain('UPDATE "Voucher"');
    expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { cartId: 'cart_1' },
    });
  });

  it('rejects checkout when the applied voucher is no longer valid', async () => {
    mockCart.getCart.mockResolvedValue(buildVoucherCart());
    mockPrisma.voucher.findFirst.mockResolvedValue(null);

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.COD),
    ).rejects.toThrow('Voucher is no longer valid. Please refresh your cart.');

    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('rejects checkout when voucher discount no longer matches the cart', async () => {
    mockCart.getCart.mockResolvedValue(
      buildVoucherCart({
        appliedVoucher: {
          code: 'HANDMADE10',
          discountAmount: 15000,
          discountPercent: 10,
          categoryId: 'cat_1',
          sellerId: null,
        },
        discountAmount: 15000,
        total: 85000,
      }),
    );
    mockPrisma.voucher.findFirst.mockResolvedValue(buildVoucher());

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.COD),
    ).rejects.toThrow('Voucher discount changed. Please refresh your cart.');

    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('rejects checkout when voucher usage limit reservation fails', async () => {
    mockCart.getCart.mockResolvedValue(buildVoucherCart());
    mockPrisma.voucher.findFirst.mockResolvedValue(buildVoucher());
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'usage_1' }])
      .mockResolvedValueOnce([]);

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.COD),
    ).rejects.toThrow(
      'Voucher usage limit has been reached. Please refresh your cart.',
    );

    expect(mockPrisma.cartItem.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.cart.update).not.toHaveBeenCalled();
  });

  it('rejects checkout when per-user voucher usage reservation fails', async () => {
    mockCart.getCart.mockResolvedValue(buildVoucherCart());
    mockPrisma.voucher.findFirst.mockResolvedValue(buildVoucher());
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.COD),
    ).rejects.toThrow(
      'Voucher usage limit has been reached. Please refresh your cart.',
    );

    expect(mockPrisma.cartItem.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.cart.update).not.toHaveBeenCalled();
  });

  it('does not record voucher usage when checkout transaction fails before order creation', async () => {
    mockCart.getCart.mockResolvedValue(buildVoucherCart());
    mockPrisma.voucher.findFirst.mockResolvedValue(buildVoucher());
    mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.COD),
    ).rejects.toThrow(BadRequestException);

    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('does not double count voucher usage when an idempotent checkout is reused', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    mockPrisma.order.findFirst.mockResolvedValue(
      buildReusableOrder({
        voucherCode: 'HANDMADE10',
        discountAmount: 10000,
        totalAmount: 115000,
        paymentExpiresAt: expiresAt,
      }),
    );
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
      status: 'requires_payment_method',
      amount: 115000,
      currency: 'vnd',
      metadata: {},
    });

    const result = await service.checkout(
      'customer_1',
      {
        idempotencyKey: 'checkout-key-1',
        shippingAddress,
      },
      PaymentMethod.STRIPE,
    );

    expect(result).toMatchObject({
      orderId: 'order_1',
      clientSecret: 'secret_1',
      requiresPayment: true,
    });
    expect(mockCart.getCart).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('does not create an order when PaymentIntent creation fails', async () => {
    mockCart.getCart.mockResolvedValue(buildCart());
    mockStripe.createPaymentIntent.mockRejectedValue(new Error('stripe_down'));

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.STRIPE),
    ).rejects.toThrow('stripe_down');

    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('recovers reusable checkout after an idempotency unique conflict', async () => {
    const uniqueConflict = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['customerId', 'checkoutIdempotencyKey'] },
      },
    );
    mockPrisma.cart.findUnique.mockResolvedValue({
      items: [{ productId: 'product_1', quantity: 1 }],
    });
    mockCart.getCart.mockResolvedValue(buildCart());
    mockPrisma.order.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        buildReusableOrder({ paymentIntentId: 'pi_existing' }),
      );
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_duplicate',
      client_secret: 'duplicate_secret',
    });
    mockStripe.retrievePaymentIntent.mockResolvedValue({
      id: 'pi_existing',
      client_secret: 'existing_secret',
      status: 'requires_payment_method',
      amount: 125000,
      currency: 'vnd',
      metadata: {},
    });
    mockPrisma.$transaction.mockRejectedValueOnce(uniqueConflict);

    const result = await service.checkout(
      'customer_1',
      {
        idempotencyKey: 'checkout-key-1',
        shippingAddress,
      },
      PaymentMethod.STRIPE,
    );

    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_duplicate');
    expect(result).toMatchObject({
      orderId: 'order_1',
      clientSecret: 'existing_secret',
      requiresPayment: true,
    });
  });

  it('does not reuse a cancelled checkout for the same idempotency key', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(
      buildReusableOrder({ status: OrderStatus.CANCELLED }),
    );
    mockCart.getCart.mockResolvedValue(buildCart());
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await service.checkout(
      'customer_1',
      {
        idempotencyKey: 'checkout-key-1',
        shippingAddress,
      },
      PaymentMethod.STRIPE,
    );

    expect(mockStripe.createPaymentIntent).toHaveBeenCalledTimes(1);
    expect(mockPrisma.order.create).toHaveBeenCalled();
  });

  it('keeps flash sale snapshot fields unset when guardrails flag is off', async () => {
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.STRIPE,
    );

    const itemCreateCall =
      mockPrisma.orderItem.createMany.mock.calls.at(-1)?.[0];
    expect(itemCreateCall?.data[0]).not.toHaveProperty('flashSaleId');
    expect(itemCreateCall?.data[0]).not.toHaveProperty(
      'flashSaleDiscountPercent',
    );
    expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.flashSale.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    expectNoFlashSaleCounterWrites();
  });

  it('revalidates active flash sale pricing and writes order item snapshot when flag is on', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(buildFlashSale());
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.STRIPE,
    );

    const itemCreateCall =
      mockPrisma.orderItem.createMany.mock.calls.at(-1)?.[0];
    expect(itemCreateCall?.data[0]).toMatchObject({
      flashSaleId: 'flash_sale_1',
      flashSaleDiscountPercent: 10,
      price: 90000,
      originalPrice: 100000,
    });
    expect(mockPrisma.flashSale.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          saleState: FlashSaleState.ACTIVE,
          categories: { some: { categoryId: 'cat_1' } },
        }),
      }),
    );
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(getRawSqlValues(0)).toEqual(
      expect.arrayContaining(['flash_sale_1', 1, 1]),
    );
    expect(getRawSqlValues(1)).toEqual(
      expect.arrayContaining(['flash_sale_1', 'customer_1', 1, 1]),
    );
    expectNoFlashSaleCounterWrites();
  });

  it('allows flash sale reservation and tracks user usage when limits are null', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(
      buildFlashSale({ maxUnits: null, perUserLimit: null }),
    );
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.STRIPE,
    );

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(getRawSqlValues(1)).toEqual(
      expect.arrayContaining(['flash_sale_1', 'customer_1', 1, 1]),
    );
    expect(getRawSqlText(1)).toContain('INSERT INTO "FlashSaleUserUsage"');
    expect(getRawSqlText(1)).toContain('ON CONFLICT ("flashSaleId", "userId")');
    expect(getRawSqlText(1)).toContain('DO UPDATE SET');
    expect(mockPrisma.order.create).toHaveBeenCalled();
    expectNoFlashSaleCounterWrites();
  });

  it('rejects checkout when flash sale maxUnits reservation fails', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(buildFlashSale());
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.STRIPE),
    ).rejects.toThrow('Flash sale is sold out. Please refresh your cart.');

    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expectNoFlashSaleCounterWrites();
  });

  it('rejects checkout when per-user flash sale limit reservation fails', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(
      buildFlashSale({ perUserLimit: 1 }),
    );
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'flash_sale_1' }])
      .mockResolvedValueOnce([]);
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.STRIPE),
    ).rejects.toThrow(
      'Flash sale purchase limit exceeded. Please refresh your cart.',
    );

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(getRawSqlValues(1)).toEqual(
      expect.arrayContaining(['flash_sale_1', 'customer_1', 1, 1]),
    );
    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expectNoFlashSaleCounterWrites();
  });

  it('aggregates multiple discounted items by flashSaleId for reservation', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(
      buildFlashSaleCart({
        subtotal: 270000,
        total: 270000,
        items: [
          {
            productId: 'product_1',
            quantity: 1,
            personalization: null,
            selectedOptions: null,
            pricing: {
              originalPrice: 100000,
              discountedPrice: 90000,
              discountPercent: 10,
              flashSaleId: 'flash_sale_1',
            },
            product: {
              id: 'product_1',
              name: 'Handmade cup',
              sellerId: 'seller_1',
              status: ProductStatus.APPROVED,
              stock: 5,
              price: 100000,
              deletedAt: null,
              categoryId: 'cat_1',
              category: {
                status: CategoryStatus.ACTIVE,
                deletedAt: null,
              },
            },
          },
          {
            productId: 'product_2',
            quantity: 2,
            pricing: {
              originalPrice: 100000,
              discountedPrice: 90000,
              discountPercent: 10,
              flashSaleId: 'flash_sale_1',
            },
            product: {
              id: 'product_2',
              name: 'Handmade bowl',
              sellerId: 'seller_1',
              status: ProductStatus.APPROVED,
              stock: 5,
              price: 100000,
              deletedAt: null,
              categoryId: 'cat_1',
              category: {
                status: CategoryStatus.ACTIVE,
                deletedAt: null,
              },
            },
          },
        ],
      }),
    );
    mockPrisma.flashSale.findFirst.mockResolvedValue(buildFlashSale());
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.STRIPE,
    );

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(getRawSqlValues(0)).toEqual(
      expect.arrayContaining(['flash_sale_1', 3, 3]),
    );
    expect(getRawSqlValues(1)).toEqual(
      expect.arrayContaining(['flash_sale_1', 'customer_1', 3, 3]),
    );
  });

  it('preserves active flash sale without matching range as zero-discount snapshot', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(
      buildFlashSaleCart({
        subtotal: 100000,
        total: 100000,
        items: [
          {
            productId: 'product_1',
            quantity: 1,
            pricing: {
              originalPrice: 100000,
              discountedPrice: 100000,
              discountPercent: 0,
              flashSaleId: 'flash_sale_1',
            },
            product: {
              id: 'product_1',
              name: 'Handmade cup',
              sellerId: 'seller_1',
              status: ProductStatus.APPROVED,
              stock: 5,
              price: 100000,
              deletedAt: null,
              categoryId: 'cat_1',
              category: {
                status: CategoryStatus.ACTIVE,
                deletedAt: null,
              },
            },
          },
        ],
      }),
    );
    mockPrisma.flashSale.findFirst.mockResolvedValue(
      buildFlashSale({
        ranges: [{ minPrice: 200000, maxPrice: 300000, discountPercent: 10 }],
      }),
    );
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.STRIPE,
    );

    const itemCreateCall =
      mockPrisma.orderItem.createMany.mock.calls.at(-1)?.[0];
    expect(itemCreateCall?.data[0]).toMatchObject({
      flashSaleId: 'flash_sale_1',
      flashSaleDiscountPercent: 0,
      price: 100000,
      originalPrice: 100000,
    });
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('keeps stock decrement behavior unchanged when reserveStock is zero', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(
      buildFlashSale({ reserveStock: 0 }),
    );
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await service.checkout(
      'customer_1',
      { shippingAddress },
      PaymentMethod.STRIPE,
    );

    expect(
      mockPrisma.product.updateMany.mock.calls.at(-1)?.[0].where.stock,
    ).toEqual({ gte: 1 });
  });

  it('rejects checkout when reserveStock prevents stock decrement', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(
      buildFlashSale({ reserveStock: 5 }),
    );
    mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.STRIPE),
    ).rejects.toThrow(
      'Insufficient stock for flash sale. Please refresh your cart.',
    );

    expect(
      mockPrisma.product.updateMany.mock.calls.at(-1)?.[0].where.stock,
    ).toEqual({ gte: 6 });
    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expectNoFlashSaleCounterWrites();
  });

  it('rejects COD checkout on sale reservation failure without Stripe calls', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(buildFlashSale());
    mockPrisma.$queryRaw.mockResolvedValue([]);

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.COD),
    ).rejects.toThrow('Flash sale is sold out. Please refresh your cart.');

    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
    expect(mockStripe.cancelPaymentIntent).not.toHaveBeenCalled();
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    expectNoFlashSaleCounterWrites();
  });

  it('rejects COD checkout on per-user reservation failure without Stripe calls', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(buildFlashSale());
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'flash_sale_1' }])
      .mockResolvedValueOnce([]);

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.COD),
    ).rejects.toThrow(
      'Flash sale purchase limit exceeded. Please refresh your cart.',
    );

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
    expect(mockStripe.cancelPaymentIntent).not.toHaveBeenCalled();
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expectNoFlashSaleCounterWrites();
  });

  it('rejects paused flash sale pricing when guardrails flag is on', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(null);
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.STRIPE),
    ).rejects.toThrow('Cart pricing changed. Please refresh your cart.');

    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('rejects ended flash sale pricing when guardrails flag is on', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(null);
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.STRIPE),
    ).rejects.toThrow('Cart pricing changed. Please refresh your cart.');

    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('rejects inactive flash sale pricing when guardrails flag is on', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(null);
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.STRIPE),
    ).rejects.toThrow('Cart pricing changed. Please refresh your cart.');

    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('rejects changed flash sale discount percent when guardrails flag is on', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildFlashSaleCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(
      buildFlashSale({
        ranges: [{ minPrice: 0, maxPrice: 200000, discountPercent: 20 }],
      }),
    );
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.STRIPE),
    ).rejects.toThrow('Cart pricing changed. Please refresh your cart.');

    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.orderItem.createMany).not.toHaveBeenCalled();
  });

  it('rejects changed product price during COD checkout without Stripe calls', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildCart());
    mockPrisma.product.findFirst.mockResolvedValue({
      price: 120000,
      categoryId: 'cat_1',
    });
    mockPrisma.flashSale.findFirst.mockResolvedValue(null);

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.COD),
    ).rejects.toThrow('Cart pricing changed. Please refresh your cart.');

    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
    expect(mockStripe.cancelPaymentIntent).not.toHaveBeenCalled();
    expect(mockPrisma.orderItem.createMany).not.toHaveBeenCalled();
  });

  it('rejects a new flash sale appearing after cart pricing when guardrails flag is on', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockCart.getCart.mockResolvedValue(buildCart());
    mockPrisma.flashSale.findFirst.mockResolvedValue(buildFlashSale());
    mockStripe.createPaymentIntent.mockResolvedValue({
      id: 'pi_1',
      client_secret: 'secret_1',
    });

    await expect(
      service.checkout('customer_1', { shippingAddress }, PaymentMethod.STRIPE),
    ).rejects.toThrow('Cart pricing changed. Please refresh your cart.');

    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.orderItem.createMany).not.toHaveBeenCalled();
  });

  it('releases flash sale reservations on Stripe failed webhook', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = buildFlashSaleCounterOrder({
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    });
    mockPrisma.order.findUnique.mockImplementation(
      (args: OrderFindUniqueArgs & { select?: unknown }) => {
        if (args.where.paymentIntentId || args.select) {
          return Promise.resolve(order);
        }
        return Promise.resolve(order);
      },
    );
    mockPrisma.order.update.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.FAILED,
    });

    const result = await service.handlePaymentIntentFailed({
      eventId: 'evt_failed',
      type: 'payment_intent.payment_failed',
      paymentIntentId: 'pi_1',
    });

    expect(result).toMatchObject({ processed: true, orderId: 'order_1' });
    expect(mockPrisma.flashSale.updateMany).toHaveBeenCalledWith({
      where: { id: 'flash_sale_1', reservedUnits: { gte: 3 } },
      data: { reservedUnits: { decrement: 3 } },
    });
    expect(mockPrisma.flashSaleUserUsage.updateMany).toHaveBeenCalledWith({
      where: {
        flashSaleId: 'flash_sale_1',
        userId: 'customer_1',
        reservedUnits: { gte: 3 },
      },
      data: { reservedUnits: { decrement: 3 } },
    });
    expect(mockPrisma.product.update).toHaveBeenCalled();
  });

  it('does not touch flash sale counters on failed webhook when guardrails flag is off', async () => {
    const order = buildFlashSaleCounterOrder({
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    });
    mockPrisma.order.findUnique.mockResolvedValue(order);
    mockPrisma.order.update.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.FAILED,
    });

    const result = await service.handlePaymentIntentFailed({
      eventId: 'evt_failed',
      type: 'payment_intent.payment_failed',
      paymentIntentId: 'pi_1',
    });

    expect(result).toMatchObject({ processed: true, orderId: 'order_1' });
    expectNoFlashSaleCounterWrites();
  });

  it('rolls back failed webhook path when flash sale release counters are inconsistent', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = buildFlashSaleCounterOrder({
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    });
    mockPrisma.order.findUnique.mockImplementation(
      (args: OrderFindUniqueArgs & { select?: unknown }) => {
        if (args.where.paymentIntentId || args.select) {
          return Promise.resolve(order);
        }
        return Promise.resolve(order);
      },
    );
    mockPrisma.flashSale.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.handlePaymentIntentFailed({
        eventId: 'evt_failed',
        type: 'payment_intent.payment_failed',
        paymentIntentId: 'pi_1',
      }),
    ).rejects.toThrow('Flash sale reservation state is inconsistent');

    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(mockPrisma.marketplaceLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('skips flash sale release for duplicate Stripe failed webhooks', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockPrisma.order.findUnique.mockResolvedValue(
      buildFlashSaleCounterOrder({
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.UNPAID,
      }),
    );
    mockPrisma.paymentWebhookEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.handlePaymentIntentFailed({
      eventId: 'evt_failed',
      type: 'payment_intent.payment_failed',
      paymentIntentId: 'pi_1',
    });

    expect(result).toMatchObject({ processed: false, reason: 'duplicate' });
    expect(mockPrisma.flashSale.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.updateMany).not.toHaveBeenCalled();
  });

  it('releases flash sale reservations for expired Stripe orders', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = buildFlashSaleCounterOrder({
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
      paymentExpiresAt: new Date(Date.now() - 60 * 1000),
    });
    mockPrisma.order.findMany.mockResolvedValue([order]);
    mockPrisma.order.findUnique.mockResolvedValue(order);
    mockPrisma.order.update.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.FAILED,
    });

    const result = await service.releaseExpiredStripeOrders();

    expect(result).toEqual({ released: 1 });
    expect(mockStripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockPrisma.flashSale.updateMany).toHaveBeenCalledWith({
      where: { id: 'flash_sale_1', reservedUnits: { gte: 3 } },
      data: { reservedUnits: { decrement: 3 } },
    });
    expect(mockPrisma.product.update).toHaveBeenCalled();
  });

  it('does not release flash sale reservations for stale expired Stripe order scans', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = buildFlashSaleCounterOrder({
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
      paymentExpiresAt: new Date(Date.now() - 60 * 1000),
    });
    mockPrisma.order.findMany.mockResolvedValue([order]);
    mockPrisma.order.findUnique.mockResolvedValue({
      ...order,
      paymentStatus: PaymentStatus.PAID,
    });

    const result = await service.releaseExpiredStripeOrders();

    expect(result).toEqual({ released: 0 });
    expect(mockPrisma.flashSale.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.updateMany).not.toHaveBeenCalled();
  });

  it('releases flash sale reservations when COD order is cancelled before paid', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = buildFlashSaleCounterOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.COD_PENDING,
      status: OrderStatus.PENDING,
    });
    mockPrisma.order.findUnique.mockResolvedValue(order);
    mockPrisma.order.update.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.FAILED,
    });

    await service.cancelOrder('customer_1', 'order_1');

    expect(mockPrisma.flashSale.updateMany).toHaveBeenCalledWith({
      where: { id: 'flash_sale_1', reservedUnits: { gte: 3 } },
      data: { reservedUnits: { decrement: 3 } },
    });
    expect(mockPrisma.flashSaleUserUsage.updateMany).toHaveBeenCalledWith({
      where: {
        flashSaleId: 'flash_sale_1',
        userId: 'customer_1',
        reservedUnits: { gte: 3 },
      },
      data: { reservedUnits: { decrement: 3 } },
    });
  });

  it('does not decrement flash sale sold units on paid Stripe refund', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = buildFlashSaleCounterOrder({
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PAID,
      refunds: [],
    });
    mockPrisma.order.findUnique.mockResolvedValue(order);
    mockPrisma.refund.create.mockResolvedValue({
      id: 'refund_1',
      amount: 10000,
      status: RefundStatus.SUCCEEDED,
    });

    await service.refundOrder('order_1', {
      amount: 10000,
      reason: 'Customer refund',
    });

    expect(mockStripe.createRefund).toHaveBeenCalled();
    expect(mockPrisma.flashSale.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.updateMany).not.toHaveBeenCalled();
  });

  it('does not release flash sale reservations when paid Stripe order is cancelled through refund flow', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = buildFlashSaleCounterOrder({
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PAID,
      refunds: [],
    });
    mockPrisma.order.findUnique.mockResolvedValue(order);
    mockPrisma.refund.create.mockResolvedValue({
      id: 'refund_1',
      amount: 125000,
      status: RefundStatus.SUCCEEDED,
    });
    mockPrisma.order.update.mockResolvedValue({
      ...order,
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.REFUNDED,
    });

    await service.cancelOrder('customer_1', 'order_1');

    expect(mockStripe.createRefund).toHaveBeenCalled();
    expect(mockPrisma.flashSale.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.updateMany).not.toHaveBeenCalled();
  });

  it('treats duplicate payment webhooks as already processed', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 125000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    });
    mockPrisma.paymentWebhookEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await service.handlePaymentIntentSucceeded({
      eventId: 'evt_1',
      type: 'payment_intent.succeeded',
      paymentIntentId: 'pi_1',
      amount: 125000,
      currency: 'vnd',
      metadata: { orderId: 'order_1', userId: 'customer_1' },
    });

    expect(result).toMatchObject({ processed: false, reason: 'duplicate' });
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(mockPrisma.marketplaceLedgerEntry.create).not.toHaveBeenCalled();
  });

  it('rejects refunds that exceed the paid balance', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 100000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
      status: OrderStatus.PAID,
      refunds: [
        {
          amount: 90000,
          status: RefundStatus.SUCCEEDED,
          subOrderId: null,
        },
      ],
      subOrders: [],
    });

    await expect(
      service.refundOrder('order_1', {
        amount: 20000,
        reason: 'Too much',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockStripe.createRefund).not.toHaveBeenCalled();
  });

  it('returns admin order ledger rows for order and sub-orders', async () => {
    const ledgerRows = [
      {
        id: 'ledger_capture',
        type: MarketplaceLedgerEntryType.PAYMENT_CAPTURE,
        amount: 225000,
      },
      {
        id: 'ledger_refund',
        type: MarketplaceLedgerEntryType.REFUND,
        amount: -90000,
      },
    ];
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      subOrders: [{ id: 'sub_1' }, { id: 'sub_2' }],
    });
    mockPrisma.marketplaceLedgerEntry.findMany.mockResolvedValue(ledgerRows);

    const result = await service.getAdminOrderLedger('order_1');

    expect(result).toBe(ledgerRows);
    expect(mockPrisma.marketplaceLedgerEntry.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { orderId: 'order_1' },
          { subOrderId: { in: ['sub_1', 'sub_2'] } },
        ],
      },
      include: {
        seller: {
          select: { id: true, name: true, shopName: true, avatar: true },
        },
        customer: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        refund: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('throws when admin order ledger target does not exist', async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);

    await expect(service.getAdminOrderLedger('missing_order')).rejects.toThrow(
      'Order not found',
    );
    expect(mockPrisma.marketplaceLedgerEntry.findMany).not.toHaveBeenCalled();
  });

  it('posts a sub-order refund only against the selected seller', async () => {
    const paidOrder = {
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 225000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.PAID,
      refunds: [],
      subOrders: [
        {
          id: 'sub_1',
          sellerId: 'seller_1',
          subTotal: 100000,
          discountAmount: 0,
          items: [
            {
              productId: 'product_1',
              quantity: 1,
              price: 100000,
              originalPrice: 100000,
            },
          ],
        },
        {
          id: 'sub_2',
          sellerId: 'seller_2',
          subTotal: 100000,
          discountAmount: 0,
          items: [
            {
              productId: 'product_2',
              quantity: 1,
              price: 100000,
              originalPrice: 100000,
            },
          ],
        },
      ],
    };
    mockPrisma.order.findUnique.mockResolvedValue(paidOrder);
    mockPrisma.refund.create.mockResolvedValue({
      id: 'refund_1',
      amount: 100000,
      status: RefundStatus.SUCCEEDED,
    });

    await service.refundOrder('order_1', {
      subOrderId: 'sub_1',
      reason: 'Seller cancellation',
    });

    expect(mockStripe.createRefund).toHaveBeenCalledWith(
      'pi_1',
      100000,
      expect.objectContaining({ subOrderId: 'sub_1' }),
      'refund:order:order_1:sub_1:100000:Seller cancellation',
    );
    const ledgerCreateMock = mockPrisma.marketplaceLedgerEntry
      .create as jest.MockedFunction<(args: LedgerCreateArgs) => unknown>;
    const refundLedgerCalls = ledgerCreateMock.mock.calls
      .map((call) => call[0].data)
      .filter((data) => data.type === MarketplaceLedgerEntryType.REFUND);
    expect(refundLedgerCalls).toHaveLength(1);
    const refundLedgerCall = refundLedgerCalls.at(0);
    expect(refundLedgerCall?.subOrder?.connect.id).toBe('sub_1');
    expect(refundLedgerCall?.seller?.connect.id).toBe('seller_1');
  });

  it('does not restore stock twice when a sub-order cancel is retried', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    mockPrisma.subOrder.findUnique.mockResolvedValue({
      id: 'sub_1',
      orderId: 'order_1',
      sellerId: 'seller_1',
      status: OrderStatus.CANCELLED,
      items: [{ productId: 'product_1', quantity: 2 }],
      order: {
        id: 'order_1',
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.UNPAID,
        status: OrderStatus.CANCELLED,
      },
    });
    mockPrisma.subOrder.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.subOrder.update.mockResolvedValue({
      id: 'sub_1',
      status: OrderStatus.CANCELLED,
    });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.CANCELLED,
    });
    mockPrisma.subOrder.findMany.mockResolvedValue([
      { id: 'sub_1', status: OrderStatus.CANCELLED },
    ]);
    mockPrisma.order.update.mockResolvedValue({
      id: 'order_1',
      status: OrderStatus.CANCELLED,
    });

    await service.updateSubOrderStatus(
      'seller_1',
      ['ROLE_SELLER'],
      'sub_1',
      OrderStatus.CANCELLED,
    );

    expect(mockPrisma.subOrder.updateMany).toHaveBeenCalledWith({
      where: { id: 'sub_1', status: { not: OrderStatus.CANCELLED } },
      data: { status: OrderStatus.CANCELLED },
    });
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
    expect(mockPrisma.inventoryLog.create).not.toHaveBeenCalled();
    expectNoFlashSaleCounterWrites();
  });

  it('marks COD master order paid and posts ledger when all active sub-orders are delivered', async () => {
    const order = {
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 225000,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.COD_PENDING,
      status: OrderStatus.SHIPPED,
    };

    mockPrisma.subOrder.findUnique.mockResolvedValue({
      id: 'sub_1',
      orderId: 'order_1',
      sellerId: 'seller_1',
      status: OrderStatus.SHIPPED,
      items: [{ productId: 'product_1', quantity: 1 }],
      order,
    });
    mockPrisma.subOrder.update.mockResolvedValue({
      id: 'sub_1',
      status: OrderStatus.DELIVERED,
    });
    mockPrisma.subOrder.findMany.mockResolvedValue([
      { id: 'sub_1', status: OrderStatus.DELIVERED },
      { id: 'sub_2', status: OrderStatus.DELIVERED },
    ]);
    mockPrisma.order.findUnique.mockImplementation(
      (args: OrderFindUniqueArgs) => {
        if (args.include) {
          return Promise.resolve({
            ...order,
            subOrders: [
              {
                id: 'sub_1',
                sellerId: 'seller_1',
                discountAmount: 0,
                items: [
                  {
                    productId: 'product_1',
                    quantity: 1,
                    price: 100000,
                    originalPrice: 100000,
                  },
                ],
              },
              {
                id: 'sub_2',
                sellerId: 'seller_2',
                discountAmount: 0,
                items: [
                  {
                    productId: 'product_2',
                    quantity: 1,
                    price: 100000,
                    originalPrice: 100000,
                  },
                ],
              },
            ],
          });
        }

        return Promise.resolve(order);
      },
    );
    mockPrisma.order.update.mockResolvedValue({
      id: 'order_1',
      status: OrderStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
    });

    await service.updateSubOrderStatus(
      'seller_1',
      ['ROLE_SELLER'],
      'sub_1',
      OrderStatus.DELIVERED,
    );

    expect(mockPrisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order_1' },
      data: {
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    const ledgerCreateMock = mockPrisma.marketplaceLedgerEntry
      .create as jest.MockedFunction<(args: LedgerCreateArgs) => unknown>;
    const sellerEarningCalls = ledgerCreateMock.mock.calls
      .map((call) => call[0].data)
      .filter(
        (data) => data.type === MarketplaceLedgerEntryType.SELLER_EARNING,
      );
    expect(sellerEarningCalls).toHaveLength(2);
    expect(sellerEarningCalls.map((call) => call.seller?.connect.id)).toEqual([
      'seller_1',
      'seller_2',
    ]);
    expectNoFlashSaleCounterWrites();
  });

  it('converts COD flash sale reservations when order becomes paid', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = {
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 225000,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.COD_PENDING,
      status: OrderStatus.SHIPPED,
    };
    const counterOrder = buildFlashSaleCounterOrder({
      ...order,
      subOrders: [
        {
          id: 'sub_1',
          sellerId: 'seller_1',
          status: OrderStatus.DELIVERED,
          discountAmount: 0,
          subTotal: 280000,
          items: [
            {
              productId: 'product_1',
              quantity: 1,
              price: 90000,
              originalPrice: 100000,
              flashSaleId: 'flash_sale_1',
              flashSaleDiscountPercent: 10,
            },
          ],
        },
      ],
    });

    mockPrisma.subOrder.findUnique.mockResolvedValue({
      id: 'sub_1',
      orderId: 'order_1',
      sellerId: 'seller_1',
      status: OrderStatus.SHIPPED,
      items: [{ productId: 'product_1', quantity: 1 }],
      order,
    });
    mockPrisma.subOrder.update.mockResolvedValue({
      id: 'sub_1',
      status: OrderStatus.DELIVERED,
    });
    mockPrisma.subOrder.findMany.mockResolvedValue([
      { id: 'sub_1', status: OrderStatus.DELIVERED },
    ]);
    mockPrisma.order.findUnique.mockImplementation(
      (args: OrderFindUniqueArgs & { select?: unknown }) => {
        if (args.select || args.include) {
          return Promise.resolve(counterOrder);
        }
        return Promise.resolve(order);
      },
    );

    await service.updateSubOrderStatus(
      'seller_1',
      ['ROLE_SELLER'],
      'sub_1',
      OrderStatus.DELIVERED,
    );

    expect(mockPrisma.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order_1',
        paymentStatus: { not: PaymentStatus.PAID },
      },
      data: {
        status: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      },
    });
    expect(mockPrisma.flashSale.updateMany).toHaveBeenCalledWith({
      where: { id: 'flash_sale_1', reservedUnits: { gte: 1 } },
      data: {
        reservedUnits: { decrement: 1 },
        soldUnits: { increment: 1 },
      },
    });
    expect(mockPrisma.flashSaleUserUsage.updateMany).toHaveBeenCalledWith({
      where: {
        flashSaleId: 'flash_sale_1',
        userId: 'customer_1',
        reservedUnits: { gte: 1 },
      },
      data: {
        reservedUnits: { decrement: 1 },
        soldUnits: { increment: 1 },
      },
    });
  });

  it('does not double convert COD reservations when order is already paid', async () => {
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    const order = {
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 225000,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.SHIPPED,
    };
    mockPrisma.subOrder.findUnique.mockResolvedValue({
      id: 'sub_1',
      orderId: 'order_1',
      sellerId: 'seller_1',
      status: OrderStatus.SHIPPED,
      items: [{ productId: 'product_1', quantity: 1 }],
      order,
    });
    mockPrisma.subOrder.update.mockResolvedValue({
      id: 'sub_1',
      status: OrderStatus.DELIVERED,
    });
    mockPrisma.subOrder.findMany.mockResolvedValue([
      { id: 'sub_1', status: OrderStatus.DELIVERED },
    ]);
    mockPrisma.order.findUnique.mockImplementation(
      (args: OrderFindUniqueArgs & { include?: unknown }) => {
        if (args.include) {
          return Promise.resolve(
            buildFlashSaleCounterOrder({
              ...order,
              subOrders: [
                {
                  id: 'sub_1',
                  sellerId: 'seller_1',
                  status: OrderStatus.DELIVERED,
                  discountAmount: 0,
                  subTotal: 100000,
                  items: [
                    {
                      productId: 'product_1',
                      quantity: 1,
                      price: 100000,
                      originalPrice: 100000,
                    },
                  ],
                },
              ],
            }),
          );
        }

        return Promise.resolve(order);
      },
    );

    await service.updateSubOrderStatus(
      'seller_1',
      ['ROLE_SELLER'],
      'sub_1',
      OrderStatus.DELIVERED,
    );

    expect(mockPrisma.flashSale.updateMany).not.toHaveBeenCalled();
    expect(mockPrisma.flashSaleUserUsage.updateMany).not.toHaveBeenCalled();
  });
});
