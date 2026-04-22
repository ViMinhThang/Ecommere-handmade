import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { CustomOrderStatus } from '@prisma/client';

export interface CreateCustomOrderDto {
  customerId: string;
  title: string;
  artisanNote?: string;
  price: number;
  leadTime: string;
  specifications: any[];
  sketchImageUrl?: string;
}

export interface UpdateSketchDto {
  sketchImageUrl?: string;
  artisanNote?: string;
}

@Injectable()
export class CustomOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async createCustomOrder(sellerId: string, data: CreateCustomOrderDto) {
    const {
      customerId,
      title,
      artisanNote,
      price,
      leadTime,
      specifications,
      sketchImageUrl,
    } = data;

    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
    });
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
        status: 'PENDING_REVIEW',
      },
      include: {
        seller: {
          select: { id: true, name: true, shopName: true, avatar: true },
        },
      },
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
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Custom Order not found');
    }

    return {
      ...order,
      specifications: this.parseSpecifications(order.specifications),
    };
  }

  private parseSpecifications(specs: any): any[] {
    try {
      return typeof specs === 'string' ? JSON.parse(specs) : specs || [];
    } catch {
      return [];
    }
  }

  async requestRevision(id: string, customerId: string, revisionNote: string) {
    const order = await this.getAndVerifyOrder(id, customerId, 'customer');

    if (order.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Order is not in review state');
    }

    return this.prisma.customOrder.update({
      where: { id },
      data: {
        status: 'REVISION_REQUESTED',
        revisionNote,
      },
    });
  }

  async approveSketch(id: string, customerId: string) {
    const order = await this.getAndVerifyOrder(id, customerId, 'customer');

    if (order.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Order is not in review state');
    }

    let { paymentIntentId } = order;
    let clientSecret: string | null = null;

    if (!paymentIntentId) {
      const intent = await this.stripeService.createPaymentIntent(
        Number(order.price),
        'vnd',
        { customOrderId: order.id, type: 'custom_order' },
      );
      paymentIntentId = intent.id;
      clientSecret = intent.client_secret;

      await this.prisma.customOrder.update({
        where: { id },
        data: { status: 'AWAITING_PAYMENT', paymentIntentId },
      });
    }

    return { success: true, clientSecret, paymentIntentId };
  }

  async confirmPayment(id: string, paymentIntentId: string) {
    const order = await this.prisma.customOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const isSucceeded =
      await this.stripeService.verifyPaymentIntent(paymentIntentId);
    if (!isSucceeded) {
      throw new BadRequestException('Payment has not succeeded yet');
    }

    return this.prisma.customOrder.update({
      where: { id },
      data: { status: 'CRAFTING' },
    });
  }

  async advanceStatus(id: string, sellerId: string, status: CustomOrderStatus) {
    await this.getAndVerifyOrder(id, sellerId, 'seller');

    return this.prisma.customOrder.update({
      where: { id },
      data: { status },
    });
  }

  async updateSketch(id: string, sellerId: string, data: UpdateSketchDto) {
    await this.getAndVerifyOrder(id, sellerId, 'seller');

    return this.prisma.customOrder.update({
      where: { id },
      data: {
        sketchImageUrl: data.sketchImageUrl,
        artisanNote: data.artisanNote,
        status: 'PENDING_REVIEW',
      },
    });
  }

  private async getAndVerifyOrder(
    id: string,
    userId: string,
    role: 'customer' | 'seller',
  ) {
    const order = await this.prisma.customOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Custom Order not found');

    const ownerId = role === 'customer' ? order.customerId : order.sellerId;
    if (ownerId !== userId) {
      throw new ForbiddenException('Not your order');
    }

    return order;
  }

  async getCustomerCustomOrders(customerId: string) {
    const orders = await this.prisma.customOrder.findMany({
      where: { customerId },
      include: {
        seller: { select: { id: true, name: true, shopName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => ({
      ...o,
      specifications: this.parseSpecifications(o.specifications),
    }));
  }

  async getSellerCustomOrders(sellerId: string) {
    const orders = await this.prisma.customOrder.findMany({
      where: { sellerId },
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => ({
      ...o,
      specifications: this.parseSpecifications(o.specifications),
    }));
  }
}
