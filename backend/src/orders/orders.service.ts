import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
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
  CustomOrder,
} from '@prisma/client';

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
}

interface AdminOrderFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  customer?: string;
  seller?: string;
}

type SubOrderWithRelations = Prisma.SubOrderGetPayload<{
  include: {
    seller: { select: { id: true; name: true; shopName: true; avatar: true } };
    items: {
      include: { product: { include: { images: true } }; review: true };
    };
    order: {
      select: {
        createdAt: true;
        shippingAddress: true;
        customer: {
          select: { id: true; name: true; email: true; avatar: true };
        };
      };
    };
  };
}>;

type CustomOrderWithRelations = Prisma.CustomOrderGetPayload<{
  include: {
    seller: { select: { id: true; name: true; shopName: true; avatar: true } };
    customer: { select: { id: true; name: true; email: true; avatar: true } };
  };
}>;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly cartService: CartService,
  ) {}

  async checkout(
    userId: string,
    shippingAddress: Record<string, unknown>,
    paymentMethod: PaymentMethod = PaymentMethod.STRIPE,
  ) {
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

    const shippingFee = 25000;
    const finalTotal = cart.total + shippingFee;

    const paymentIntent = await this.stripeService.createPaymentIntent(
      finalTotal,
      'vnd',
      { userId, voucherCode: cart.appliedVoucher?.code || '' },
    );

    const order = await this.executeCheckoutTransaction({
      userId,
      cart,
      sellerGroups,
      shippingAddress,
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.UNPAID,
      paymentIntentId: paymentIntent.id,
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

  private validateCart(cart: EnrichedCart) {
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
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
    } = params;

    return this.prisma.$transaction(async (tx) => {
      await this.updateStock(tx, cart.items);

      const order = await tx.order.create({
        data: {
          customerId: userId,
          totalAmount: cart.total + 25000,
          discountAmount: cart.discountAmount,
          voucherCode: cart.appliedVoucher?.code,
          paymentMethod,
          paymentStatus,
          paymentIntentId: paymentIntentId ?? null,
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
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
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
      this.formatStandardOrders(subOrders as any[]),
      this.formatCustomOrders(customOrders as any[]),
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
      this.formatStandardOrders(subOrders as any[]),
      this.formatCustomOrders(customOrders as any[]),
    );
  }

  private formatStandardOrders(orders: any[]): UnifiedOrder[] {
    return orders.map((o) => ({ ...o, type: 'STANDARD' })) as UnifiedOrder[];
  }

  private formatCustomOrders(orders: any[]): UnifiedOrder[] {
    return orders.map((co) => ({
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
    })) as UnifiedOrder[];
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

    this.assertSubOrderStatusTransition(subOrder.order, subOrder.status, status);

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
    const isSucceeded =
      await this.stripeService.verifyPaymentIntent(paymentIntentId);
    if (!isSucceeded) {
      throw new BadRequestException('Payment has not succeeded yet');
    }

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

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      await tx.subOrder.updateMany({
        where: { orderId: order.id },
        data: { status: OrderStatus.PAID },
      });

      return {
        success: true,
        orderId: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
      };
    });
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
