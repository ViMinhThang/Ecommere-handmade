import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CategoryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
} from '@prisma/client';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockPrisma = {
    address: {
      findFirst: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subOrder: {
      updateMany: jest.fn(),
    },
    paymentWebhookEvent: {
      create: jest.fn(),
    },
    product: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const mockStripe = {
    createPaymentIntent: jest.fn(),
    retrievePaymentIntent: jest.fn(),
    updatePaymentIntentMetadata: jest.fn(),
    cancelPaymentIntent: jest.fn(),
  };
  const mockCart = {
    getCart: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripe },
        { provide: CartService, useValue: mockCart },
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
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      customerId: 'customer_1',
      totalAmount: 125000,
      paymentIntentId: 'pi_1',
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      status: OrderStatus.PENDING,
    });
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
  });
});
