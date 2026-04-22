import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private cartService: CartService,
  ) {}

  async checkout(userId: string, shippingAddress: any) {
    // 1. Get enriched user cart (with flash sales and voucher discounts)
    const cart = await this.cartService.getCart(userId);

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Group items by seller and prepare suborder data
    const sellerSubOrders = new Map<
      string,
      { subTotal: number; items: any[] }
    >();

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Product ${item.product.name} is out of stock or insufficient quantity (Available: ${item.product.stock})`,
        );
      }

      const itemEffectivePrice = item.pricing.discountedPrice;
      const itemSubtotal = itemEffectivePrice * item.quantity;

      const sellerId = item.product.sellerId;
      if (!sellerSubOrders.has(sellerId)) {
        sellerSubOrders.set(sellerId, { subTotal: 0, items: [] });
      }
      const sellerData = sellerSubOrders.get(sellerId)!;
      sellerData.subTotal += itemSubtotal;
      sellerData.items.push(item);
    }

    // 3. Allocate voucher discount proportionally across suborders (if any)
    const totalVoucherDiscount = cart.discountAmount;
    const voucherCode = cart.appliedVoucher?.code;
    const shippingFee = 25000; // Flat shipping fee in VND
    const totalAmount = cart.total + shippingFee;

    // 4. Create Stripe PaymentIntent
    const paymentIntent = await this.stripeService.createPaymentIntent(
      totalAmount,
      'vnd',
      { userId, voucherCode: voucherCode || '' },
    );

    // 5. Create Order Transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Deduct stock
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Create Master Order
      const newOrder = await tx.order.create({
        data: {
          customerId: userId,
          totalAmount,
          discountAmount: totalVoucherDiscount,
          voucherCode,
          paymentIntentId: paymentIntent.id,
          shippingAddress: shippingAddress
            ? JSON.stringify(shippingAddress)
            : undefined,
          status: 'PENDING',
        },
      });

      // Calculate proportional discounts for suborders
      let remainingDiscount = totalVoucherDiscount;
      const subOrderEntries = Array.from(sellerSubOrders.entries());

      for (let i = 0; i < subOrderEntries.length; i++) {
        const [sellerId, data] = subOrderEntries[i];
        let subOrderDiscount = 0;

        if (totalVoucherDiscount > 0) {
          if (i === subOrderEntries.length - 1) {
            subOrderDiscount = remainingDiscount;
          } else {
            const subtotalWeight = data.subTotal / (cart.subtotal || 1);
            subOrderDiscount = Math.round(totalVoucherDiscount * subtotalWeight);
            remainingDiscount -= subOrderDiscount;
          }
        }

        const subOrder = await tx.subOrder.create({
          data: {
            orderId: newOrder.id,
            sellerId,
            subTotal: data.subTotal,
            discountAmount: subOrderDiscount,
            status: 'PENDING',
          },
        });

        // Create Order Items
        const orderItems = data.items.map((item) => ({
          subOrderId: subOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.pricing.discountedPrice, // Store the price at time of purchase
        }));
        await tx.orderItem.createMany({ data: orderItems });
      }

      // Clear cart
      await this.cartService.clearCart(userId);
      // Also clear applied voucher since it's used
      await tx.cart.update({
        where: { id: cart.id },
        data: { appliedVoucherId: null },
      });

      return newOrder;
    });

    return {
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
    };
  }

  async confirmPayment(userId: string, paymentIntentId: string) {
    const order = await this.prisma.order.findUnique({
      where: { paymentIntentId },
      include: { subOrders: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found for this payment intent');
    }

    if (order.customerId !== userId) {
      throw new BadRequestException('Order does not belong to user');
    }

    if (order.status !== 'PENDING') {
      return { status: order.status, message: 'Order is already processed' };
    }

    // Synchronously verify with Stripe
    const isPaid =
      await this.stripeService.verifyPaymentIntent(paymentIntentId);

    if (!isPaid) {
      throw new BadRequestException('Payment was not successful in Stripe');
    }

    // Update statuses to PAID
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

      for (const subOrder of order.subOrders) {
        await tx.subOrder.update({
          where: { id: subOrder.id },
          data: { status: 'PAID' },
        });
      }
    });

    return { success: true, orderId: order.id };
  }

  async findOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        subOrders: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                shopName: true,
                avatar: true,
              },
            },
            items: {
              include: {
                product: {
                  include: {
                    images: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order || order.customerId !== userId) {
      throw new NotFoundException('Order not found or unauthorized access');
    }

    return order;
  }

  async findAllSubOrdersByUser(userId: string) {
    return this.prisma.subOrder.findMany({
      where: {
        order: {
          customerId: userId,
        },
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            shopName: true,
            avatar: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: {
                  where: { isMain: true },
                  take: 1,
                },
              },
            },
            review: true,
          },
        },
        order: {
          select: {
            createdAt: true,
            shippingAddress: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findSubOrderById(userId: string, subOrderId: string) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id: subOrderId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            shopName: true,
            avatar: true,
            sellerTitle: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
            review: true,
          },
        },
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!subOrder || (subOrder as any).order.customerId !== userId) {
      throw new NotFoundException('Sub-order not found or unauthorized access');
    }

    return subOrder;
  }

  async findAllSubOrdersBySeller(sellerId: string) {
    return this.prisma.subOrder.findMany({
      where: { sellerId },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateSubOrderStatus(
    sellerId: string,
    subOrderId: string,
    status: any,
  ) {
    const subOrder = await this.prisma.subOrder.findUnique({
      where: { id: subOrderId },
    });

    if (!subOrder || subOrder.sellerId !== sellerId) {
      throw new NotFoundException('Sub-order not found or unauthorized access');
    }

    const updatedSubOrder = await this.prisma.subOrder.update({
      where: { id: subOrderId },
      data: { status },
    });

    // Aggregate Master Order status
    await this.syncMasterOrderStatus(subOrder.orderId);

    return updatedSubOrder;
  }

  private async syncMasterOrderStatus(orderId: string) {
    const subOrders = await this.prisma.subOrder.findMany({
      where: { orderId },
    });

    if (subOrders.length === 0) return;

    // Define status hierarchy for "minimum progress"
    const statusHierarchy: Record<string, number> = {
      PENDING: 0,
      PAID: 1,
      PROCESSING: 2,
      SHIPPED: 3,
      DELIVERED: 4,
      CANCELLED: -1, // Special case
    };

    const activeSubOrders = subOrders.filter((so) => so.status !== 'CANCELLED');

    let newMasterStatus: any;

    if (activeSubOrders.length === 0) {
      newMasterStatus = 'CANCELLED';
    } else {
      // Find the minimum progress among active sub-orders
      const minStatusWeight = Math.min(
        ...activeSubOrders.map((so) => statusHierarchy[so.status] ?? 0),
      );

      // Reverse map the weights to status
      newMasterStatus = Object.keys(statusHierarchy).find(
        (key) => statusHierarchy[key] === minStatusWeight,
      );
    }

    if (newMasterStatus) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: newMasterStatus },
      });
    }
  }
}
