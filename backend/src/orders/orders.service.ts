import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  async checkout(userId: string, shippingAddress: any) {
    // 1. Get user cart
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // 2. Validate stock and calculate total / group by seller
    let totalAmount = 0;
    const sellerSubOrders = new Map<string, { subTotal: number, items: any[] }>();

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(`Product ${item.product.name} is out of stock or insufficient quantity (Available: ${item.product.stock})`);
      }
      
      const itemSubtotal = Number(item.product.price) * item.quantity;
      totalAmount += itemSubtotal;

      const sellerId = item.product.sellerId;
      if (!sellerSubOrders.has(sellerId)) {
        sellerSubOrders.set(sellerId, { subTotal: 0, items: [] });
      }
      const sellerData = sellerSubOrders.get(sellerId)!;
      sellerData.subTotal += itemSubtotal;
      sellerData.items.push(item);
    }

    // 3. Create Stripe PaymentIntent
    const paymentIntent = await this.stripeService.createPaymentIntent(totalAmount, 'vnd', { userId });

    // 4. Create Order Transaction (deduct stock immediately)
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
          paymentIntentId: paymentIntent.id,
          shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : undefined,
          status: 'PENDING',
        },
      });

      // Create SubOrders
      for (const [sellerId, data] of sellerSubOrders.entries()) {
        const subOrder = await tx.subOrder.create({
          data: {
            orderId: newOrder.id,
            sellerId,
            subTotal: data.subTotal,
            status: 'PENDING',
          },
        });

        // Create Order Items
        const orderItems = data.items.map(item => ({
          subOrderId: subOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        }));
        await tx.orderItem.createMany({ data: orderItems });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

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
    const isPaid = await this.stripeService.verifyPaymentIntent(paymentIntentId);

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
}
