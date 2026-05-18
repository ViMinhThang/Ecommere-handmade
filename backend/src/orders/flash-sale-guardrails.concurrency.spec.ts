import {
  CategoryStatus,
  FlashSaleState,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  ProductStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { EnrichedCart } from '../common/interfaces/commerce.interface';
import { OrdersService } from './orders.service';
import { StripePaymentIntent } from '../stripe/stripe.service';

// These tests need PostgreSQL row-level behavior; mock Prisma cannot prove
// atomic guardrail safety under concurrent checkout attempts.
const shouldRunConcurrencyTests =
  process.env.RUN_FLASH_SALE_CONCURRENCY_TESTS === 'true' &&
  Boolean(process.env.TEST_DATABASE_URL);

const describeConcurrency = shouldRunConcurrencyTests
  ? describe
  : describe.skip;

type FakeIntent = StripePaymentIntent;

type Scenario = {
  prefix: string;
  service: OrdersService;
  prisma: PrismaClient;
  fakeStripe: ReturnType<typeof createFakeStripeService>;
  customerIds: string[];
  flashSaleId: string;
  productId: string;
};

const shippingAddress = {
  fullName: 'Concurrency Customer',
  phone: '0900000000',
  address: '1 Test Street',
  city: 'HCM',
  district: '1',
  ward: 'Ben Nghe',
};

function createFakeStripeService(prefix: string) {
  const intents = new Map<string, FakeIntent>();
  let sequence = 0;

  return {
    intents,
    createPaymentIntent: jest.fn(
      async (
        amount: number,
        currency: string,
        metadata?: Record<string, string>,
      ) => {
        sequence += 1;
        const intent: FakeIntent = {
          id: `pi_${prefix}_${sequence}`,
          client_secret: `secret_${prefix}_${sequence}`,
          status: 'requires_payment_method',
          amount,
          amount_received: 0,
          currency,
          metadata: metadata ?? {},
        };
        intents.set(intent.id, intent);
        return intent;
      },
    ),
    updatePaymentIntentMetadata: jest.fn(
      async (paymentIntentId: string, metadata: Record<string, string>) => {
        const intent = intents.get(paymentIntentId);
        if (!intent) {
          throw new Error('missing intent');
        }
        intent.metadata = { ...intent.metadata, ...metadata };
        return intent;
      },
    ),
    retrievePaymentIntent: jest.fn(async (paymentIntentId: string) => {
      const intent = intents.get(paymentIntentId);
      if (!intent) {
        throw new Error('missing intent');
      }
      return intent;
    }),
    cancelPaymentIntent: jest.fn(async (paymentIntentId: string) => {
      const intent = intents.get(paymentIntentId);
      if (intent) {
        intent.status = 'canceled';
      }
      return intent ?? null;
    }),
    createRefund: jest.fn(),
  };
}

async function cleanupByPrefix(prisma: PrismaClient, prefix: string) {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: `${prefix}_` } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  const orders = userIds.length
    ? await prisma.order.findMany({
        where: { customerId: { in: userIds } },
        select: { id: true },
      })
    : [];
  const orderIds = orders.map((order) => order.id);

  await prisma.paymentWebhookEvent.deleteMany({
    where: { paymentIntentId: { startsWith: `pi_${prefix}_` } },
  });
  if (orderIds.length > 0) {
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }
  await prisma.flashSale.deleteMany({
    where: { name: { startsWith: prefix } },
  });
  await prisma.product.deleteMany({
    where: { name: { startsWith: prefix } },
  });
  await prisma.category.deleteMany({
    where: { name: { startsWith: prefix } },
  });
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

async function createScenario(
  prisma: PrismaClient,
  options: {
    userCount?: number;
    maxUnits?: number | null;
    perUserLimit?: number | null;
    reserveStock?: number;
    productStock?: number;
    quantity?: number;
  } = {},
): Promise<Scenario> {
  const prefix = `f6_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  await cleanupByPrefix(prisma, prefix);

  const seller = await prisma.user.create({
    data: {
      name: `${prefix} seller`,
      email: `${prefix}_seller@example.com`,
      password: 'test-password',
      roles: [Role.ROLE_SELLER],
      status: UserStatus.ACTIVE,
    },
  });
  const category = await prisma.category.create({
    data: {
      name: `${prefix} category`,
      slug: `${prefix}-category`,
      status: CategoryStatus.ACTIVE,
    },
  });
  const product = await prisma.product.create({
    data: {
      name: `${prefix} product`,
      description: 'Concurrency test product',
      price: 100000,
      stock: options.productStock ?? 100,
      status: ProductStatus.APPROVED,
      categoryId: category.id,
      sellerId: seller.id,
    },
  });
  const endAt = new Date(Date.now() + 60 * 60 * 1000);
  const flashSale = await prisma.flashSale.create({
    data: {
      name: `${prefix} sale`,
      startAt: new Date(Date.now() - 60 * 1000),
      endAt,
      isActive: true,
      saleState: FlashSaleState.ACTIVE,
      maxUnits: options.maxUnits,
      perUserLimit: options.perUserLimit,
      reserveStock: options.reserveStock ?? 0,
      categories: { create: { categoryId: category.id } },
      ranges: {
        create: {
          minPrice: 0,
          maxPrice: 200000,
          discountPercent: 10,
          endDate: endAt,
        },
      },
    },
  });

  const carts = new Map<string, EnrichedCart>();
  const customerIds: string[] = [];
  const userCount = options.userCount ?? 1;
  const quantity = options.quantity ?? 1;

  for (let i = 0; i < userCount; i += 1) {
    const customer = await prisma.user.create({
      data: {
        name: `${prefix} customer ${i}`,
        email: `${prefix}_customer_${i}@example.com`,
        password: 'test-password',
        roles: [Role.ROLE_USER],
        status: UserStatus.ACTIVE,
      },
    });
    const cart = await prisma.cart.create({
      data: { userId: customer.id },
    });
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId: product.id, quantity },
    });

    customerIds.push(customer.id);
    carts.set(customer.id, {
      id: cart.id,
      userId: customer.id,
      subtotal: 90000 * quantity,
      discountAmount: 0,
      total: 90000 * quantity,
      appliedVoucher: null,
      items: [
        {
          id: `${prefix}_cart_item_${i}`,
          cartId: cart.id,
          productId: product.id,
          quantity,
          createdAt: new Date(),
          updatedAt: new Date(),
          product: {
            ...product,
            price: 100000,
            images: [],
            category,
            seller: {
              id: seller.id,
              name: seller.name,
              shopName: seller.shopName,
              avatar: seller.avatar,
            },
          } as never,
          pricing: {
            originalPrice: 100000,
            discountedPrice: 90000,
            discountPercent: 10,
            flashSaleId: flashSale.id,
          },
        },
      ],
    });
  }

  const fakeStripe = createFakeStripeService(prefix);
  const fakeCartService = {
    getCart: jest.fn(async (userId: string) => {
      const cart = carts.get(userId);
      if (!cart) {
        throw new Error(`Missing test cart for ${userId}`);
      }
      return cart;
    }),
  };

  const service = new OrdersService(
    prisma as never,
    fakeStripe as never,
    fakeCartService as never,
  );

  return {
    prefix,
    service,
    prisma,
    fakeStripe,
    customerIds,
    flashSaleId: flashSale.id,
    productId: product.id,
  };
}

describeConcurrency('Flash sale guardrails concurrency (PostgreSQL)', () => {
  let prisma: PrismaClient;
  let previousGuardrailsFlag: string | undefined;
  let currentPrefix: string | undefined;

  beforeAll(async () => {
    jest.setTimeout(120000);
    previousGuardrailsFlag = process.env.FLASH_SALE_GUARDRAILS_ENABLED;
    process.env.FLASH_SALE_GUARDRAILS_ENABLED = 'true';
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } },
    });
    await prisma.$connect();
  });

  afterEach(async () => {
    if (currentPrefix) {
      await cleanupByPrefix(prisma, currentPrefix);
      currentPrefix = undefined;
    }
  });

  afterAll(async () => {
    if (previousGuardrailsFlag === undefined) {
      delete process.env.FLASH_SALE_GUARDRAILS_ENABLED;
    } else {
      process.env.FLASH_SALE_GUARDRAILS_ENABLED = previousGuardrailsFlag;
    }
    await prisma?.$disconnect();
  });

  it('caps concurrent checkout reservations by maxUnits', async () => {
    const scenario = await createScenario(prisma, {
      userCount: 20,
      maxUnits: 10,
    });
    currentPrefix = scenario.prefix;

    const results = await Promise.allSettled(
      scenario.customerIds.map((userId, index) =>
        scenario.service.checkout(
          userId,
          {
            idempotencyKey: `${scenario.prefix}_checkout_${index}`,
            shippingAddress,
          },
          PaymentMethod.STRIPE,
        ),
      ),
    );

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const flashSale = await prisma.flashSale.findUniqueOrThrow({
      where: { id: scenario.flashSaleId },
    });

    expect(fulfilled).toHaveLength(10);
    expect(flashSale.reservedUnits).toBe(10);
  });

  it('caps concurrent checkout reservations by perUserLimit', async () => {
    const scenario = await createScenario(prisma, {
      userCount: 1,
      maxUnits: null,
      perUserLimit: 2,
    });
    currentPrefix = scenario.prefix;
    const userId = scenario.customerIds[0];

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, (_, index) =>
        scenario.service.checkout(
          userId,
          {
            idempotencyKey: `${scenario.prefix}_user_limit_${index}`,
            shippingAddress,
          },
          PaymentMethod.STRIPE,
        ),
      ),
    );

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const usage = await prisma.flashSaleUserUsage.findUniqueOrThrow({
      where: {
        flashSaleId_userId: {
          flashSaleId: scenario.flashSaleId,
          userId,
        },
      },
    });

    expect(fulfilled).toHaveLength(2);
    expect(usage.reservedUnits).toBe(2);
  });

  it('blocks checkout when reserveStock would be consumed', async () => {
    const scenario = await createScenario(prisma, {
      userCount: 1,
      reserveStock: 5,
      productStock: 6,
      quantity: 2,
    });
    currentPrefix = scenario.prefix;

    await expect(
      scenario.service.checkout(
        scenario.customerIds[0],
        {
          idempotencyKey: `${scenario.prefix}_reserve_stock`,
          shippingAddress,
        },
        PaymentMethod.STRIPE,
      ),
    ).rejects.toThrow('Insufficient stock for flash sale');

    const [flashSale, product] = await Promise.all([
      prisma.flashSale.findUniqueOrThrow({
        where: { id: scenario.flashSaleId },
      }),
      prisma.product.findUniqueOrThrow({ where: { id: scenario.productId } }),
    ]);

    expect(flashSale.reservedUnits).toBe(0);
    expect(product.stock).toBe(6);
  });

  it('does not double reserve or create duplicate orders for the same idempotency key', async () => {
    const scenario = await createScenario(prisma, { userCount: 1 });
    currentPrefix = scenario.prefix;
    const userId = scenario.customerIds[0];

    await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        scenario.service.checkout(
          userId,
          {
            idempotencyKey: `${scenario.prefix}_same_key`,
            shippingAddress,
          },
          PaymentMethod.STRIPE,
        ),
      ),
    );

    const [orders, flashSale] = await Promise.all([
      prisma.order.findMany({ where: { customerId: userId } }),
      prisma.flashSale.findUniqueOrThrow({
        where: { id: scenario.flashSaleId },
      }),
    ]);
    const activeIntents = Array.from(
      scenario.fakeStripe.intents.values(),
    ).filter((intent) => intent.status !== 'canceled');

    expect(orders).toHaveLength(1);
    expect(flashSale.reservedUnits).toBe(1);
    expect(activeIntents).toHaveLength(1);
  });

  it('does not double convert when confirmPayment races with success webhook', async () => {
    const scenario = await createScenario(prisma, { userCount: 1 });
    currentPrefix = scenario.prefix;
    const checkout = await scenario.service.checkout(
      scenario.customerIds[0],
      {
        idempotencyKey: `${scenario.prefix}_pay`,
        shippingAddress,
      },
      PaymentMethod.STRIPE,
    );
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.orderId },
    });
    const intent = scenario.fakeStripe.intents.get(order.paymentIntentId!);
    if (!intent) {
      throw new Error('missing fake intent');
    }
    intent.status = 'succeeded';
    intent.amount_received = Number(order.totalAmount);
    intent.metadata = { orderId: order.id, userId: order.customerId };

    await Promise.allSettled([
      scenario.service.confirmPayment(order.customerId, intent.id),
      scenario.service.handlePaymentIntentSucceeded({
        eventId: `${scenario.prefix}_evt_success`,
        type: 'payment_intent.succeeded',
        paymentIntentId: intent.id,
        amount: intent.amount,
        currency: intent.currency,
        metadata: intent.metadata,
      }),
    ]);

    const flashSale = await prisma.flashSale.findUniqueOrThrow({
      where: { id: scenario.flashSaleId },
    });
    const usage = await prisma.flashSaleUserUsage.findUniqueOrThrow({
      where: {
        flashSaleId_userId: {
          flashSaleId: scenario.flashSaleId,
          userId: order.customerId,
        },
      },
    });

    expect(flashSale.reservedUnits).toBe(0);
    expect(flashSale.soldUnits).toBe(1);
    expect(usage.reservedUnits).toBe(0);
    expect(usage.soldUnits).toBe(1);
  });

  it('does not double release when failed webhook races with expiration', async () => {
    const scenario = await createScenario(prisma, { userCount: 1 });
    currentPrefix = scenario.prefix;
    const checkout = await scenario.service.checkout(
      scenario.customerIds[0],
      {
        idempotencyKey: `${scenario.prefix}_fail`,
        shippingAddress,
      },
      PaymentMethod.STRIPE,
    );
    const order = await prisma.order.update({
      where: { id: checkout.orderId },
      data: { paymentExpiresAt: new Date(Date.now() - 60 * 1000) },
    });

    await Promise.allSettled([
      scenario.service.handlePaymentIntentFailed({
        eventId: `${scenario.prefix}_evt_failed`,
        type: 'payment_intent.payment_failed',
        paymentIntentId: order.paymentIntentId!,
      }),
      scenario.service.releaseExpiredStripeOrders(),
    ]);

    const flashSale = await prisma.flashSale.findUniqueOrThrow({
      where: { id: scenario.flashSaleId },
    });
    const usage = await prisma.flashSaleUserUsage.findUniqueOrThrow({
      where: {
        flashSaleId_userId: {
          flashSaleId: scenario.flashSaleId,
          userId: order.customerId,
        },
      },
    });

    expect(flashSale.reservedUnits).toBe(0);
    expect(flashSale.soldUnits).toBe(0);
    expect(usage.reservedUnits).toBe(0);
    expect(usage.soldUnits).toBe(0);
  });

  it('does not double release duplicate failed webhooks', async () => {
    const scenario = await createScenario(prisma, { userCount: 1 });
    currentPrefix = scenario.prefix;
    const checkout = await scenario.service.checkout(
      scenario.customerIds[0],
      {
        idempotencyKey: `${scenario.prefix}_duplicate_fail`,
        shippingAddress,
      },
      PaymentMethod.STRIPE,
    );
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: checkout.orderId },
    });

    await Promise.allSettled([
      scenario.service.handlePaymentIntentFailed({
        eventId: `${scenario.prefix}_evt_failed`,
        type: 'payment_intent.payment_failed',
        paymentIntentId: order.paymentIntentId!,
      }),
      scenario.service.handlePaymentIntentFailed({
        eventId: `${scenario.prefix}_evt_failed`,
        type: 'payment_intent.payment_failed',
        paymentIntentId: order.paymentIntentId!,
      }),
    ]);

    const flashSale = await prisma.flashSale.findUniqueOrThrow({
      where: { id: scenario.flashSaleId },
    });

    expect(flashSale.reservedUnits).toBe(0);
    expect(flashSale.soldUnits).toBe(0);
  });
});
