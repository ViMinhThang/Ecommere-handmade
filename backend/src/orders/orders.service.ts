import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { CartService } from '../cart/cart.service';
import {
  EnrichedCart,
  EnrichedCartItem,
  UnifiedOrder,
} from '../common/interfaces/commerce.interface';
import {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SubOrder,
  ProductStatus,
  CategoryStatus,
  InventoryChangeReason,
  CustomOrderStatus,
} from '@prisma/client';
import { CheckoutDto } from './dto/checkout.dto';

const SHIPPING_FEE = 25000;
const STRIPE_PAYMENT_EXPIRY_MS = 30 * 60 * 1000;
const EXPIRED_ORDER_SWEEP_MS = 5 * 60 * 1000;

interface SubOrderGroup {
  subTotal: number;
  items: EnrichedCartItem[];
}

interface ExecuteCheckoutTransactionParams {
  userId: string;
  cart: EnrichedCart;
  sellerGroups: Map<string, SubOrderGroup>;
  shippingAddress: Record<string, unknown>;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string | null;
  paymentExpiresAt?: Date | null;
}

interface PaymentIntentSnapshot {
  id: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

interface StripeWebhookPaymentPayload {
  eventId: string;
  paymentIntentId: string;
  type: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
}

type OrderWithStockItems = Prisma.OrderGetPayload<{
  include: {
    subOrders: {
      include: {
        items: {
          select: {
            productId: true;
            quantity: true;
          };
        };
      };
    };
  };
}>;

interface AdminOrderFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  customer?: string;
  seller?: string;
}

type CustomOrderSummary = {
  id: string;
  sellerId: string;
  seller?: unknown;
  customer?: unknown;
  price: Prisma.Decimal | number;
  title: string;
  sketchImageUrl: string | null;
  status: CustomOrderStatus;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private expiredOrderSweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly cartService: CartService,
  ) {}

  onModuleInit() {
    this.expiredOrderSweepTimer = setInterval(
      () => void this.releaseExpiredStripeOrders(),
      EXPIRED_ORDER_SWEEP_MS,
    );
    this.expiredOrderSweepTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.expiredOrderSweepTimer) {
      clearInterval(this.expiredOrderSweepTimer);
    }
  }

  async checkout(
    userId: string,
    checkoutDto: CheckoutDto,
    paymentMethod: PaymentMethod = PaymentMethod.STRIPE,
  ) {
    await this.releaseExpiredStripeOrders();

    const shippingAddress = await this.resolveCheckoutShippingAddress(
      userId,
      checkoutDto,
    );
    const cart = await this.cartService.getCart(userId);
    this.validateCart(cart);

    const sellerGroups = this.groupItemsBySeller(cart.items);
    const normalizedPaymentMethod = this.normalizePaymentMethod(paymentMethod);

    if (normalizedPaymentMethod === PaymentMethod.COD) {
      const order = await this.executeCheckoutTransaction({
        userId,
        cart,
        sellerGroups,
        shippingAddress,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.COD_PENDING,
      });

      return {
        orderId: order.id,
        paymentMethod: PaymentMethod.COD,
        requiresPayment: false,
      };
    }

    const finalTotal = cart.total + SHIPPING_FEE;

    const paymentIntent = await this.stripeService.createPaymentIntent(
      finalTotal,
      'vnd',
      { userId, voucherCode: cart.appliedVoucher?.code || '' },
    );

    let order: Order;
    try {
      order = await this.executeCheckoutTransaction({
        userId,
        cart,
        sellerGroups,
        shippingAddress,
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.UNPAID,
        paymentIntentId: paymentIntent.id,
        paymentExpiresAt: new Date(Date.now() + STRIPE_PAYMENT_EXPIRY_MS),
      });
    } catch (error) {
      await this.stripeService.cancelPaymentIntent(paymentIntent.id);
      throw error;
    }

    await this.stripeService.updatePaymentIntentMetadata(paymentIntent.id, {
      orderId: order.id,
      userId,
      voucherCode: cart.appliedVoucher?.code || '',
    });

    return {
      clientSecret: paymentIntent.client_secret as string,
      orderId: order.id,
      paymentMethod: PaymentMethod.STRIPE,
      requiresPayment: true,
    };
  }

  private normalizePaymentMethod(paymentMethod: PaymentMethod): PaymentMethod {
    if (
      paymentMethod !== PaymentMethod.STRIPE &&
      paymentMethod !== PaymentMethod.COD
    ) {
      throw new BadRequestException('Invalid payment method');
    }

    return paymentMethod;
  }

  private async resolveCheckoutShippingAddress(
    userId: string,
    checkoutDto: CheckoutDto,
  ): Promise<Record<string, unknown>> {
    if (checkoutDto.addressId) {
      const address = await this.prisma.address.findFirst({
        where: {
          id: checkoutDto.addressId,
          userId,
          deletedAt: null,
        },
      });

      if (!address) {
        throw new NotFoundException('Shipping address not found');
      }

      return {
        addressId: address.id,
        fullName: address.fullName,
        phone: address.phone,
        address: address.address,
        city: address.city,
        district: address.district,
        ward: address.ward,
      };
    }

    if (checkoutDto.shippingAddress) {
      return { ...checkoutDto.shippingAddress };
    }

    throw new BadRequestException('Shipping address is required');
  }

  private validateCart(cart: EnrichedCart) {
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      const isPurchasable =
        item.product.status === ProductStatus.APPROVED &&
        item.product.category.status === CategoryStatus.ACTIVE &&
        item.product.deletedAt === null &&
        item.product.category.deletedAt === null;

      if (!isPurchasable) {
        throw new BadRequestException(
          `Product ${item.product.name} is not available for purchase`,
        );
      }

      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Product ${item.product.name} is out of stock (Available: ${item.product.stock})`,
        );
      }
    }
  }

  private groupItemsBySeller(
    items: EnrichedCartItem[],
  ): Map<string, SubOrderGroup> {
    const groups = new Map<string, SubOrderGroup>();
    for (const item of items) {
      const sellerId = item.product.sellerId;
      if (!groups.has(sellerId)) {
        groups.set(sellerId, { subTotal: 0, items: [] });
      }
      const group = groups.get(sellerId)!;
      group.subTotal += item.pricing.discountedPrice * item.quantity;
      group.items.push(item);
    }
    return groups;
  }

  private async executeCheckoutTransaction(
    params: ExecuteCheckoutTransactionParams,
  ): Promise<Order> {
    const {
      userId,
      cart,
      sellerGroups,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      paymentIntentId,
      paymentExpiresAt,
    } = params;

    return this.prisma.$transaction(async (tx) => {
      await this.updateStock(tx, cart.items);

      const order = await tx.order.create({
        data: {
          customerId: userId,
          totalAmount: cart.total + SHIPPING_FEE,
          discountAmount: cart.discountAmount,
          voucherCode: cart.appliedVoucher?.code,
          paymentMethod,
          paymentStatus,
          paymentIntentId: paymentIntentId ?? null,
          paymentExpiresAt: paymentExpiresAt ?? null,
          shippingAddress: shippingAddress
            ? (shippingAddress as Prisma.InputJsonValue)
            : undefined,
          status: OrderStatus.PENDING,
        },
      });

      await this.createSubOrders(tx, order.id, cart, sellerGroups);
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { appliedVoucherId: null },
      });

      return order;
    });
  }

  private async updateStock(
    tx: Prisma.TransactionClient,
    items: EnrichedCartItem[],
  ) {
    for (const item of items) {
      const result = await tx.product.updateMany({
        where: {
          id: item.productId,
          deletedAt: null,
          status: ProductStatus.APPROVED,
          stock: { gte: item.quantity },
          category: {
            deletedAt: null,
            status: CategoryStatus.ACTIVE,
          },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (result.count !== 1) {
        throw new BadRequestException(
          `Product ${item.product.name} is out of stock`,
        );
      }

      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          change: -item.quantity,
          reason: InventoryChangeReason.ORDER,
        },
      });
    }
  }

  private async createSubOrders(
    tx: Prisma.TransactionClient,
    orderId: string,
    cart: EnrichedCart,
    sellerGroups: Map<string, SubOrderGroup>,
  ) {
    const groups = Array.from(sellerGroups.entries());
    let remainingDiscount = cart.discountAmount;

    for (let i = 0; i < groups.length; i++) {
      const [sellerId, data] = groups[i];
      const isLast = i === groups.length - 1;

      const subOrderDiscount = isLast
        ? remainingDiscount
        : Math.round(
            cart.discountAmount * (data.subTotal / (cart.subtotal || 1)),
          );

      remainingDiscount -= subOrderDiscount;

      const subOrder = await tx.subOrder.create({
        data: {
          orderId,
          sellerId,
          subTotal: data.subTotal,
          discountAmount: subOrderDiscount,
          status: 'PENDING',
        },
      });

      await tx.orderItem.createMany({
        data: data.items.map((item) => ({
          subOrderId: subOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.pricing.discountedPrice,
        })),
      });
    }
  }

  async findAllSubOrdersByUser(userId: string): Promise<UnifiedOrder[]> {
    const [subOrders, customOrders] = await Promise.all([
      this.prisma.subOrder.findMany({
        where: { order: { customerId: userId } },
        include: this.userOrderInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customOrder.findMany({
        where: { customerId: userId },
        include: { seller: { select: this.sellerSelect } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return this.mergeAndSortOrders(
      this.formatStandardOrders(subOrders),
      this.formatCustomOrders(customOrders),
    );
  }

  async findAllSubOrdersBySeller(sellerId: string): Promise<UnifiedOrder[]> {
    const [subOrders, customOrders] = await Promise.all([
      this.prisma.subOrder.findMany({
        where: { sellerId },
        include: this.sellerOrderInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customOrder.findMany({
        where: { sellerId },
        include: { customer: { select: this.customerSelect } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return this.mergeAndSortOrders(
      this.formatStandardOrders(subOrders),
      this.formatCustomOrders(customOrders),
    );
  }

  private formatStandardOrders<T extends object>(orders: T[]): UnifiedOrder[] {
    return orders.map(
      (order) => ({ ...order, type: 'STANDARD' }) as unknown as UnifiedOrder,
    );
  }

  private formatCustomOrders(orders: CustomOrderSummary[]): UnifiedOrder[] {
    return orders.map(
      (co) =>
        ({
          id: co.id,
          orderId: co.id,
          sellerId: co.sellerId,
          seller: co.seller,
          subTotal: co.price,
          status: co.status,
          createdAt: co.createdAt,
          updatedAt: co.updatedAt,
          type: 'CUSTOM',
          items: [
            {
              id: co.id,
              productId: 'custom',
              quantity: 1,
              price: co.price,
              product: {
                name: co.title,
                images: co.sketchImageUrl
                  ? [{ url: co.sketchImageUrl, isMain: true }]
                  : [],
              },
            },
          ],
          order: {
            createdAt: co.createdAt,
            shippingAddress: null,
            paymentMethod: null,
            paymentStatus: null,
            customer: co.customer,
          },
        }) as unknown as UnifiedOrder,
    );
  }

  private mergeAndSortOrders(
    standard: UnifiedOrder[],
    custom: UnifiedOrder[],
  ): UnifiedOrder[] {
    return [...standard, ...custom].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private readonly sellerSelect = {
    id: true,
    name: true,
    shopName: true,
    avatar: true,
  };
  private readonly customerSelect = {
    id: true,
    name: true,
    email: true,
    avatar: true,
  };

  private readonly userOrderInclude = {
    seller: { select: this.sellerSelect },
    items: {
      include: {
        product: {
          include: { images: { where: { isMain: true as const }, take: 1 } },
        },
        review: true,
      },
    },
    order: {
      select: {
        createdAt: true,
        shippingAddress: true,
        paymentMethod: true,
        paymentStatus: true,
      },
    },
  };

  private readonly sellerOrderInclude = {
    order: {
      select: {
        createdAt: true,
        shippingAddress: true,
        paymentMethod: true,
        paymentStatus: true,
        customer: { select: this.customerSelect },
      },
    },
    items: { include: { product: { include: { images: true } } } },
  };

  private readonly orderDetailInclude = {
    customer: { select: this.customerSelect },
    subOrders: {
      include: {
        seller: { select: this.sellerSelect },
        items: { include: { product: { include: { images: true } } } },
      },
    },
  };

  private readonly subOrderDetailInclude = {
    order: {
      include: {
        customer: { select: this.customerSelect },
      },
    },
    seller: { select: this.sellerSelect },
    items: {
      include: { product: { include: { images: true } }, review: true },
    },
  };

  private isAdmin(roles: string[]) {
    return roles.includes('ROLE_ADMIN');
  }

  private normalizeQueryFilter(value?: string | null) {
    return value?.trim() || undefined;
  }

  private canAdvanceFromPending(order: Order) {
    if (order.paymentMethod === PaymentMethod.COD) {
      return true;
    }

    return order.paymentStatus === PaymentStatus.PAID;
  }

  private assertSubOrderStatusTransition(
    order: Order,
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ) {
    if (currentStatus === nextStatus) {
      return;
    }

    if (
      currentStatus === OrderStatus.CANCELLED ||
      currentStatus === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        `Cannot change status from ${currentStatus}`,
      );
    }

    if (nextStatus === OrderStatus.CANCELLED) {
      if (
        currentStatus !== OrderStatus.PENDING &&
        currentStatus !== OrderStatus.PAID
      ) {
        throw new BadRequestException(
          'Only pending or paid orders can be cancelled',
        );
      }
      return;
    }

    if (currentStatus === OrderStatus.PENDING) {
      if (
        nextStatus === OrderStatus.PROCESSING &&
        this.canAdvanceFromPending(order)
      ) {
        return;
      }

      throw new BadRequestException(
        'Pending orders can only move to processing after payment or use COD',
      );
    }

    if (
      currentStatus === OrderStatus.PAID &&
      nextStatus === OrderStatus.PROCESSING
    ) {
      return;
    }

    if (
      currentStatus === OrderStatus.PROCESSING &&
      nextStatus === OrderStatus.SHIPPED
    ) {
      return;
    }

    if (
      currentStatus === OrderStatus.SHIPPED &&
      nextStatus === OrderStatus.DELIVERED
    ) {
      return;
    }

    throw new BadRequestException(
      `Invalid status transition from ${currentStatus} to ${nextStatus}`,
    );
  }

  private canCustomerCancelOrder(subOrders: SubOrder[]) {
    const blockingStatuses: OrderStatus[] = [
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ];

    return (
      subOrders.some((subOrder) => subOrder.status !== OrderStatus.CANCELLED) &&
      subOrders.every((subOrder) => !blockingStatuses.includes(subOrder.status))
    );
  }

  private async restoreSubOrderStock(
    tx: Prisma.TransactionClient,
    items: Array<{ productId: string; quantity: number }>,
  ) {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          change: item.quantity,
          reason: InventoryChangeReason.RETURN,
        },
      });
    }
  }

  private resolveCancelledPaymentStatus(order: Order) {
    if (order.paymentMethod === PaymentMethod.COD) {
      return PaymentStatus.FAILED;
    }

    return order.paymentStatus === PaymentStatus.PAID
      ? PaymentStatus.PAID
      : PaymentStatus.FAILED;
  }

  async findAdminOrders(filters: AdminOrderFilters) {
    const normalizedCustomer = this.normalizeQueryFilter(filters.customer);
    const normalizedSeller = this.normalizeQueryFilter(filters.seller);

    const conditions: Prisma.OrderWhereInput[] = [];

    if (filters.status) {
      conditions.push({ status: filters.status });
    }

    if (filters.paymentMethod) {
      conditions.push({ paymentMethod: filters.paymentMethod });
    }

    if (filters.paymentStatus) {
      conditions.push({ paymentStatus: filters.paymentStatus });
    }

    if (normalizedCustomer) {
      conditions.push({
        OR: [
          { customerId: normalizedCustomer },
          {
            customer: {
              name: { contains: normalizedCustomer, mode: 'insensitive' },
            },
          },
          {
            customer: {
              email: { contains: normalizedCustomer, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (normalizedSeller) {
      conditions.push({
        subOrders: {
          some: {
            OR: [
              { sellerId: normalizedSeller },
              {
                seller: {
                  name: { contains: normalizedSeller, mode: 'insensitive' },
                },
              },
              {
                seller: {
                  shopName: {
                    contains: normalizedSeller,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          },
        },
      });
    }

    return this.prisma.order.findMany({
      where: conditions.length > 0 ? { AND: conditions } : undefined,
      include: this.orderDetailInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAdminOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderDetailInclude,
    });

    if (!order) throw new NotFoundException('Order not found');

    return order;
  }

  async findOrderById(userId: string, roles: string[], id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderDetailInclude,
    });

    if (!order) throw new NotFoundException('Order not found');
    if (!this.isAdmin(roles) && order.customerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    return order;
  }

  async findSubOrderById(userId: string, roles: string[], subOrderId: string) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: this.subOrderDetailInclude,
    });

    if (!subOrder) throw new NotFoundException('Order not found');

    if (
      !this.isAdmin(roles) &&
      subOrder.order.customerId !== userId &&
      subOrder.sellerId !== userId
    ) {
      throw new ForbiddenException('Not your order');
    }

    return subOrder;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    if (!this.canCustomerCancelOrder(order.subOrders)) {
      throw new BadRequestException('This order can no longer be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const subOrder of order.subOrders) {
        if (subOrder.status === OrderStatus.CANCELLED) {
          continue;
        }

        await this.restoreSubOrderStock(tx, subOrder.items);
      }

      await tx.subOrder.updateMany({
        where: { orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: this.resolveCancelledPaymentStatus(order),
        },
        include: this.orderDetailInclude,
      });

      return {
        ...updatedOrder,
        refundRequired:
          order.paymentMethod === PaymentMethod.STRIPE &&
          order.paymentStatus === PaymentStatus.PAID,
      };
    });
  }

  async updateSubOrderStatus(
    actorId: string,
    roles: string[],
    subOrderId: string,
    status: OrderStatus,
  ) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: {
        order: true,
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    });

    if (!subOrder) throw new NotFoundException('SubOrder not found');
    if (!this.isAdmin(roles) && subOrder.sellerId !== actorId)
      throw new ForbiddenException('Not your order');

    this.assertSubOrderStatusTransition(
      subOrder.order,
      subOrder.status,
      status,
    );

    return this.prisma.$transaction(async (tx) => {
      if (
        status === OrderStatus.CANCELLED &&
        subOrder.status !== OrderStatus.CANCELLED
      ) {
        await this.restoreSubOrderStock(tx, subOrder.items);
      }

      const updated = await tx.subOrder.update({
        where: { id: subOrderId },
        data: { status },
      });

      await this.syncMasterOrderStatus(tx, subOrder.orderId);
      return updated;
    });
  }

  async updateAdminOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatableSubOrders = order.subOrders.filter(
      (subOrder) => subOrder.status !== OrderStatus.CANCELLED,
    );

    if (updatableSubOrders.length === 0) {
      throw new BadRequestException('Order has no active sub-orders');
    }

    for (const subOrder of updatableSubOrders) {
      this.assertSubOrderStatusTransition(order, subOrder.status, status);
    }

    return this.prisma.$transaction(async (tx) => {
      if (status === OrderStatus.CANCELLED) {
        for (const subOrder of updatableSubOrders) {
          await this.restoreSubOrderStock(tx, subOrder.items);
        }
      }

      await tx.subOrder.updateMany({
        where: {
          orderId,
          status: { not: OrderStatus.CANCELLED },
        },
        data: { status },
      });

      await this.syncMasterOrderStatus(tx, orderId);

      return tx.order.findUnique({
        where: { id: orderId },
        include: this.orderDetailInclude,
      });
    });
  }

  async confirmPayment(userId: string, paymentIntentId: string) {
    const order = await this.prisma.order.findUnique({
      where: { paymentIntentId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentMethod !== PaymentMethod.STRIPE) {
      throw new BadRequestException(
        'Only Stripe orders can be confirmed with payment intent',
      );
    }
    if (order.customerId !== userId)
      throw new ForbiddenException('Not your order');

    if (order.paymentStatus === PaymentStatus.PAID) {
      return {
        success: true,
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        orderStatus: order.status,
      };
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order has been cancelled');
    }

    const paymentIntent =
      await this.stripeService.retrievePaymentIntent(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment has not succeeded yet');
    }

    this.assertStripePaymentMatchesOrder(order, {
      id: paymentIntent.id,
      amount: paymentIntent.amount_received || paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await this.markStripeOrderPaid(tx, order.id);

      return {
        success: true,
        orderId: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
      };
    });
  }

  private assertStripePaymentMatchesOrder(
    order: Order,
    payment: PaymentIntentSnapshot,
  ) {
    if (payment.id !== order.paymentIntentId) {
      throw new BadRequestException('Payment intent does not belong to order');
    }

    const expectedAmount = Math.round(Number(order.totalAmount));
    if (payment.amount !== expectedAmount) {
      throw new BadRequestException('Payment amount does not match order');
    }

    if (payment.currency.toLowerCase() !== 'vnd') {
      throw new BadRequestException('Payment currency does not match order');
    }

    const metadata = payment.metadata ?? {};
    if (metadata.orderId && metadata.orderId !== order.id) {
      throw new BadRequestException('Payment metadata does not match order');
    }

    if (metadata.userId && metadata.userId !== order.customerId) {
      throw new BadRequestException('Payment metadata does not match customer');
    }
  }

  private async markStripeOrderPaid(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paymentExpiresAt: null,
      },
    });

    await tx.subOrder.updateMany({
      where: {
        orderId,
        status: { not: OrderStatus.CANCELLED },
      },
      data: { status: OrderStatus.PAID },
    });

    return updatedOrder;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private async recordWebhookEvent(
    tx: Prisma.TransactionClient,
    payload: StripeWebhookPaymentPayload,
  ) {
    try {
      await tx.paymentWebhookEvent.create({
        data: {
          eventId: payload.eventId,
          type: payload.type,
          paymentIntentId: payload.paymentIntentId,
        },
      });
      return true;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return false;
      }
      throw error;
    }
  }

  async handlePaymentIntentSucceeded(payload: StripeWebhookPaymentPayload) {
    return this.prisma.$transaction(async (tx) => {
      const recorded = await this.recordWebhookEvent(tx, payload);
      if (!recorded) {
        return { received: true, processed: false, reason: 'duplicate' };
      }

      const order = await tx.order.findUnique({
        where: { paymentIntentId: payload.paymentIntentId },
      });

      if (!order) {
        return { received: true, processed: false, reason: 'order_not_found' };
      }

      if (order.paymentMethod !== PaymentMethod.STRIPE) {
        return {
          received: true,
          processed: false,
          reason: 'not_stripe_order',
        };
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        return { received: true, processed: false, reason: 'already_paid' };
      }

      if (order.status === OrderStatus.CANCELLED) {
        return {
          received: true,
          processed: false,
          reason: 'order_cancelled',
        };
      }

      if (payload.amount === undefined || payload.currency === undefined) {
        throw new BadRequestException('Payment payload is incomplete');
      }

      this.assertStripePaymentMatchesOrder(order, {
        id: payload.paymentIntentId,
        amount: payload.amount,
        currency: payload.currency,
        metadata: payload.metadata,
      });

      const updatedOrder = await this.markStripeOrderPaid(tx, order.id);

      return {
        received: true,
        processed: true,
        orderId: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
      };
    });
  }

  async handlePaymentIntentFailed(payload: StripeWebhookPaymentPayload) {
    return this.prisma.$transaction(async (tx) => {
      const recorded = await this.recordWebhookEvent(tx, payload);
      if (!recorded) {
        return { received: true, processed: false, reason: 'duplicate' };
      }

      const order = await tx.order.findUnique({
        where: { paymentIntentId: payload.paymentIntentId },
        include: {
          subOrders: {
            include: {
              items: {
                select: {
                  productId: true,
                  quantity: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return { received: true, processed: false, reason: 'order_not_found' };
      }

      if (
        order.paymentMethod !== PaymentMethod.STRIPE ||
        order.paymentStatus === PaymentStatus.PAID ||
        order.status === OrderStatus.CANCELLED
      ) {
        return { received: true, processed: false, reason: 'terminal_order' };
      }

      const updatedOrder = await this.cancelStripeOrderAndRestoreStock(
        tx,
        order,
      );

      return {
        received: true,
        processed: true,
        orderId: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
      };
    });
  }

  private async cancelStripeOrderAndRestoreStock(
    tx: Prisma.TransactionClient,
    order: OrderWithStockItems,
  ) {
    for (const subOrder of order.subOrders) {
      if (subOrder.status === OrderStatus.CANCELLED) {
        continue;
      }
      await this.restoreSubOrderStock(tx, subOrder.items);
    }

    await tx.subOrder.updateMany({
      where: {
        orderId: order.id,
        status: { not: OrderStatus.CANCELLED },
      },
      data: { status: OrderStatus.CANCELLED },
    });

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
        paymentExpiresAt: null,
      },
    });
  }

  async releaseExpiredStripeOrders() {
    const now = new Date();
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        paymentMethod: PaymentMethod.STRIPE,
        paymentStatus: PaymentStatus.UNPAID,
        status: OrderStatus.PENDING,
        paymentExpiresAt: { lt: now },
      },
      include: {
        subOrders: {
          include: {
            items: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        },
      },
      take: 50,
    });

    let released = 0;

    for (const order of expiredOrders) {
      if (order.paymentIntentId) {
        await this.stripeService.cancelPaymentIntent(order.paymentIntentId);
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const freshOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: {
            subOrders: {
              include: {
                items: {
                  select: {
                    productId: true,
                    quantity: true,
                  },
                },
              },
            },
          },
        });

        if (
          !freshOrder ||
          freshOrder.paymentStatus !== PaymentStatus.UNPAID ||
          freshOrder.status !== OrderStatus.PENDING ||
          !freshOrder.paymentExpiresAt ||
          freshOrder.paymentExpiresAt > now
        ) {
          return null;
        }

        return this.cancelStripeOrderAndRestoreStock(tx, freshOrder);
      });

      if (updated) {
        released += 1;
      }
    }

    return { released };
  }

  private async syncMasterOrderStatus(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const [order, subOrders] = await Promise.all([
      tx.order.findUnique({
        where: { id: orderId },
      }),
      tx.subOrder.findMany({
        where: { orderId },
      }),
    ]);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const activeSubOrders = subOrders.filter(
      (subOrder) => subOrder.status !== OrderStatus.CANCELLED,
    );

    const statusHierarchy: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 1,
      [OrderStatus.PAID]: 2,
      [OrderStatus.PROCESSING]: 3,
      [OrderStatus.SHIPPED]: 4,
      [OrderStatus.DELIVERED]: 5,
      [OrderStatus.CANCELLED]: 0,
    };

    let newMasterStatus: OrderStatus;

    if (activeSubOrders.length === 0) {
      newMasterStatus = OrderStatus.CANCELLED;
    } else {
      const minStatusWeight = Math.min(
        ...activeSubOrders.map(
          (subOrder) => statusHierarchy[subOrder.status] ?? 1,
        ),
      );

      const statusKey = Object.entries(statusHierarchy).find(
        ([key, value]) =>
          key !== OrderStatus.CANCELLED && value === minStatusWeight,
      )?.[0];

      newMasterStatus = (statusKey as OrderStatus) || OrderStatus.PENDING;

      if (
        activeSubOrders.every(
          (subOrder) => subOrder.status === OrderStatus.DELIVERED,
        )
      ) {
        newMasterStatus = OrderStatus.DELIVERED;
      }
    }

    let newPaymentStatus = order.paymentStatus;

    if (newMasterStatus === OrderStatus.CANCELLED) {
      newPaymentStatus = this.resolveCancelledPaymentStatus(order);
    } else if (order.paymentMethod === PaymentMethod.COD) {
      newPaymentStatus = activeSubOrders.every(
        (subOrder) => subOrder.status === OrderStatus.DELIVERED,
      )
        ? PaymentStatus.PAID
        : PaymentStatus.COD_PENDING;
    } else if (
      order.paymentMethod === PaymentMethod.STRIPE &&
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      newPaymentStatus = PaymentStatus.UNPAID;
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: newMasterStatus,
        paymentStatus: newPaymentStatus,
      },
    });
  }
}
