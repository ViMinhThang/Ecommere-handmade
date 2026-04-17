import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class CustomOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async createCustomOrder(sellerId: string, data: any) {
    const { customerId, title, artisanNote, price, leadTime, specifications, sketchImageUrl } = data;

    // Validate customer
    const customer = await this.prisma.user.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.prisma.customOrder.create({
      data: {
        sellerId,
        customerId,
        title,
        artisanNote,
        price,
        leadTime,
        specifications: JSON.stringify(specifications || []),
        sketchImageUrl,
        status: 'PENDING_REVIEW', // Created draft is immediately sent to user for review
      },
      include: {
        seller: {
          select: { id: true, name: true, shopName: true, avatar: true },
        },
      }
    });
  }

  async getCustomOrderById(id: string) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true, name: true, shopName: true, avatar: true },
        },
        customer: {
          select: { id: true, name: true, email: true },
        }
      }
    });

    if (!order) {
      throw new NotFoundException('Custom Order not found');
    }

    return {
      ...order,
      specifications: order.specifications ? JSON.parse(order.specifications as string) : []
    };
  }

  async requestRevision(id: string, customerId: string, revisionNote: string) {
    const order = await this.prisma.customOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Custom Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    if (order.status !== 'PENDING_REVIEW') throw new BadRequestException('Order is not in review state');

    return this.prisma.customOrder.update({
      where: { id },
      data: { 
        status: 'REVISION_REQUESTED',
        revisionNote
      }
    });
  }

  async approveSketch(id: string, customerId: string) {
    const order = await this.prisma.customOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Custom Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    if (order.status !== 'PENDING_REVIEW') throw new BadRequestException('Order is not in review state');

    const amountToCharge = Number(order.price);

    let paymentIntentId = order.paymentIntentId;
    let clientSecret = null;

    if (!paymentIntentId) {
       const intent = await this.stripeService.createPaymentIntent(amountToCharge, 'vnd', {
         customOrderId: order.id,
         type: 'custom_order'
       });
       paymentIntentId = intent.id;
       clientSecret = intent.client_secret;

       await this.prisma.customOrder.update({
         where: { id },
         data: {
           status: 'AWAITING_PAYMENT',
           paymentIntentId
         }
       });
    }

    return {
      success: true,
      clientSecret,
      paymentIntentId
    };
  }

  async confirmPayment(id: string, paymentIntentId: string) {
    const order = await this.prisma.customOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const isSucceeded = await this.stripeService.verifyPaymentIntent(paymentIntentId);
    if (!isSucceeded) {
      throw new BadRequestException('Payment has not succeeded yet');
    }

    const updated = await this.prisma.customOrder.update({
      where: { id },
      data: { status: 'CRAFTING' },
    });

    return updated;
  }

  async advanceStatus(id: string, sellerId: string, status: any) {
    const order = await this.prisma.customOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId !== sellerId) throw new ForbiddenException('Not your order');

    return this.prisma.customOrder.update({
      where: { id },
      data: { status }
    });
  }

  async updateSketch(id: string, sellerId: string, data: any) {
    const order = await this.prisma.customOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.sellerId !== sellerId) throw new ForbiddenException('Not your order');

    return this.prisma.customOrder.update({
      where: { id },
      data: {
        sketchImageUrl: data.sketchImageUrl,
        artisanNote: data.artisanNote,
        status: 'PENDING_REVIEW'
      }
    });
  }

  async getCustomerCustomOrders(customerId: string) {
    const orders = await this.prisma.customOrder.findMany({
      where: { customerId },
      include: {
        seller: { select: { id: true, name: true, shopName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return orders.map(o => ({
      ...o,
      specifications: o.specifications ? JSON.parse(o.specifications as string) : []
    }));
  }

  async getSellerCustomOrders(sellerId: string) {
    const orders = await this.prisma.customOrder.findMany({
      where: { sellerId },
      include: {
        customer: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return orders.map(o => ({
      ...o,
      specifications: o.specifications ? JSON.parse(o.specifications as string) : []
    }));
  }
}
