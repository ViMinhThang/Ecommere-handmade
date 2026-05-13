import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CategoryStatus,
  MarketplaceLedgerEntryType,
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
import { OrdersService } from './orders.service';

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
      update: jest.fn(),
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
    product: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
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
  const mockSettings = {
    getPlatformCommissionBps: jest.fn(() => 1000),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.order.findFirst.mockResolvedValue(null);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'evt_row' });
    mockPrisma.marketplaceLedgerEntry.create.mockResolvedValue({
      id: 'ledger_1',
    });
    mockPrisma.marketplaceLedgerEntry.findMany.mockResolvedValue([]);
    mockPrisma.refund.findUnique.mockResolvedValue(null);
    mockStripe.createRefund.mockResolvedValue({
      id: 're_1',
      status: 'succeeded',
      amount: 100000,
      currency: 'vnd',
      payment_intent: 'pi_1',
    });
    mockStripe.cancelPaymentIntent.mockResolvedValue(null);
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
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
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
  });

  it('reuses an active checkout for the same idempotency key', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
      paymentIntentId: 'pi_1',
      paymentExpiresAt: expiresAt,
    });
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
  });
});
