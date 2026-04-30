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
  Prisma,
  SubOrder,
  CustomOrder,
} from '@prisma/client';

interface SubOrderGroup {
  subTotal: number;
  items: EnrichedCartItem[];
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

  async checkout(userId: string, shippingAddress: Record<string, any>) {
    const cart = await this.cartService.getCart(userId);
    this.validateCart(cart);

    const sellerGroups = this.groupItemsBySeller(cart.items);
    const shippingFee = 25000;
    const finalTotal = cart.total + shippingFee;

    const paymentIntent = await this.stripeService.createPaymentIntent(
      finalTotal,
      'vnd',
      { userId, voucherCode: cart.appliedVoucher?.code || '' },
    );

    const order = await this.executeCheckoutTransaction(
      userId,
      cart,
      sellerGroups,
      paymentIntent.id,
      shippingAddress,
    );

    return {
      clientSecret: paymentIntent.client_secret as string,
      orderId: order.id,
    };
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
    userId: string,
    cart: EnrichedCart,
    sellerGroups: Map<string, SubOrderGroup>,
    paymentIntentId: string,
    shippingAddress: Record<string, any>,
  ): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      await this.updateStock(tx, cart.items);

      const order = await tx.order.create({
        data: {
          customerId: userId,
          totalAmount: cart.total + 25000,
          discountAmount: cart.discountAmount,
          voucherCode: cart.appliedVoucher?.code,
          paymentIntentId,
          shippingAddress: shippingAddress
            ? JSON.stringify(shippingAddress)
            : undefined,
          status: 'PENDING',
        },
      });

      await this.createSubOrders(tx, order.id, cart, sellerGroups);
      await this.cartService.clearCart(userId);

      await tx.cart.update({
        where: { userId },
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
    order: { select: { createdAt: true, shippingAddress: true } },
  };

  private readonly sellerOrderInclude = {
    order: { include: { customer: { select: this.customerSelect } } },
    items: { include: { product: { include: { images: true } } } },
  };

  async findOrderById(userId: string, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        subOrders: {
          include: {
            seller: { select: this.sellerSelect },
            items: { include: { product: { include: { images: true } } } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== userId)
      throw new ForbiddenException('Not your order');

    return order;
  }

  async findSubOrderById(userId: string, subOrderId: string) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: {
        order: {
          include: {
            customer: { select: this.customerSelect },
          },
        },
        seller: { select: this.sellerSelect },
        items: {
          include: { product: { include: { images: true } }, review: true },
        },
      },
    });

    if (!subOrder) throw new NotFoundException('Order not found');

    if (subOrder.order.customerId !== userId && subOrder.sellerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    return subOrder;
  }

  async updateSubOrderStatus(
    sellerId: string,
    subOrderId: string,
    status: OrderStatus,
  ) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id: subOrderId },
    });

    if (!subOrder) throw new NotFoundException('SubOrder not found');
    if (subOrder.sellerId !== sellerId)
      throw new ForbiddenException('Not your order');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subOrder.update({
        where: { id: subOrderId },
        data: { status },
      });

      await this.syncMasterOrderStatus(tx, subOrder.orderId);
      return updated;
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
    if (order.customerId !== userId)
      throw new ForbiddenException('Not your order');

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

      await tx.subOrder.updateMany({
        where: { orderId: order.id },
        data: { status: 'PAID' },
      });

      return {
        success: true,
        orderId: updatedOrder.id,
        paymentStatus: updatedOrder.status,
        orderStatus: updatedOrder.status,
      };
    });
  }

  private async syncMasterOrderStatus(
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    const subOrders = await tx.subOrder.findMany({
      where: { orderId },
    });

    const statusHierarchy: Record<string, number> = {
      CANCELLED: 0,
      PENDING: 1,
      PAID: 2,
      PROCESSING: 3,
      SHIPPED: 4,
      DELIVERED: 5,
    };

    const minStatusWeight = Math.min(
      ...subOrders.map((so) => statusHierarchy[so.status] ?? 1),
    );

    let newMasterStatus: OrderStatus | null = null;
    if (subOrders.every((so) => so.status === 'CANCELLED')) {
      newMasterStatus = 'CANCELLED';
    } else {
      const statusKey = Object.keys(statusHierarchy).find(
        (key) => statusHierarchy[key] === minStatusWeight,
      );
      newMasterStatus = (statusKey as OrderStatus) || 'PENDING';
    }

    if (newMasterStatus) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: newMasterStatus },
      });
    }
  }
}
