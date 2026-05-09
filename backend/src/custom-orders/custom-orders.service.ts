import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { CustomOrderStatus, Prisma, Role, UserStatus } from '@prisma/client';
import { CreateCustomOrderDto } from './dto/create-custom-order.dto';
import { UpdateSketchDto } from './dto/update-sketch.dto';

@Injectable()
export class CustomOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  private isAdmin(roles: string[]) {
    return roles.includes(Role.ROLE_ADMIN);
  }

  private canAccessOrder(
    order: { customerId: string; sellerId: string },
    userId: string,
    roles: string[],
  ) {
    return (
      this.isAdmin(roles) ||
      order.customerId === userId ||
      order.sellerId === userId
    );
  }

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

    if (customerId === sellerId) {
      throw new BadRequestException('Seller cannot create an order for self');
    }

    const customer = await this.prisma.user.findFirst({
      where: {
        id: customerId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
      },
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
        specifications: (specifications ?? []) as Prisma.InputJsonValue,
        sketchImageUrl,
        status: CustomOrderStatus.PENDING_REVIEW,
      },
      include: {
        seller: {
          select: { id: true, name: true, shopName: true, avatar: true },
        },
      },
    });
  }

  async getCustomOrderById(id: string, userId: string, roles: string[]) {
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
    if (!this.canAccessOrder(order, userId, roles)) {
      throw new ForbiddenException('Not your order');
    }

    return {
      ...order,
      specifications: this.parseSpecifications(order.specifications),
    };
  }

  private parseSpecifications(specs: Prisma.JsonValue | null): unknown[] {
    try {
      if (Array.isArray(specs)) {
        return specs;
      }

      if (typeof specs === 'string') {
        const parsed: unknown = JSON.parse(specs);
        return Array.isArray(parsed) ? parsed : [];
      }

      return [];
    } catch {
      return [];
    }
  }

  async requestRevision(id: string, customerId: string, revisionNote: string) {
    const order = await this.getAndVerifyOrder(id, customerId, 'customer');

    if (order.status !== CustomOrderStatus.PENDING_REVIEW) {
      throw new BadRequestException('Order is not in review state');
    }

    return this.prisma.customOrder.update({
      where: { id },
      data: {
        status: CustomOrderStatus.REVISION_REQUESTED,
        revisionNote,
      },
    });
  }

  async approveSketch(id: string, customerId: string) {
    const order = await this.getAndVerifyOrder(id, customerId, 'customer');

    if (order.status !== CustomOrderStatus.PENDING_REVIEW) {
      throw new BadRequestException('Order is not in review state');
    }

    let { paymentIntentId } = order;
    let clientSecret: string | null = null;

    if (!paymentIntentId) {
      const intent = await this.stripeService.createPaymentIntent(
        Math.round(Number(order.price)),
        'vnd',
        {
          customOrderId: order.id,
          customerId: order.customerId,
          sellerId: order.sellerId,
          type: 'custom_order',
        },
      );
      paymentIntentId = intent.id;
      clientSecret = intent.client_secret;

      await this.prisma.customOrder.update({
        where: { id },
        data: { status: CustomOrderStatus.AWAITING_PAYMENT, paymentIntentId },
      });
    }

    return { success: true, clientSecret, paymentIntentId };
  }

  async confirmPayment(
    id: string,
    customerId: string,
    paymentIntentId: string,
  ) {
    const order = await this.prisma.customOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.customerId !== customerId) {
      throw new ForbiddenException('Not your order');
    }

    if (order.paymentIntentId !== paymentIntentId) {
      throw new BadRequestException('Payment intent does not belong to order');
    }

    const paidStatuses: CustomOrderStatus[] = [
      CustomOrderStatus.CRAFTING,
      CustomOrderStatus.FINISHING,
      CustomOrderStatus.SHIPPED,
    ];

    if (paidStatuses.includes(order.status)) {
      return order;
    }

    if (order.status !== CustomOrderStatus.AWAITING_PAYMENT) {
      throw new BadRequestException('Order is not awaiting payment');
    }

    const paymentIntent =
      await this.stripeService.retrievePaymentIntent(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment has not succeeded yet');
    }
    if (paymentIntent.currency.toLowerCase() !== 'vnd') {
      throw new BadRequestException('Payment currency does not match order');
    }
    if (paymentIntent.amount !== Math.round(Number(order.price))) {
      throw new BadRequestException('Payment amount does not match order');
    }
    if (
      paymentIntent.metadata.customOrderId &&
      paymentIntent.metadata.customOrderId !== order.id
    ) {
      throw new BadRequestException('Payment metadata does not match order');
    }
    if (
      paymentIntent.metadata.customerId &&
      paymentIntent.metadata.customerId !== customerId
    ) {
      throw new BadRequestException('Payment metadata does not match customer');
    }

    return this.prisma.customOrder.update({
      where: { id },
      data: { status: CustomOrderStatus.CRAFTING },
    });
  }

  async advanceStatus(
    id: string,
    actorId: string,
    roles: string[],
    status: CustomOrderStatus,
  ) {
    const order = await this.prisma.customOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Custom Order not found');

    if (!this.isAdmin(roles) && order.sellerId !== actorId) {
      throw new ForbiddenException('Not your order');
    }

    this.assertStatusTransition(order.status, status);

    return this.prisma.customOrder.update({
      where: { id },
      data: { status },
    });
  }

  async updateSketch(id: string, sellerId: string, data: UpdateSketchDto) {
    const order = await this.getAndVerifyOrder(id, sellerId, 'seller');

    if (
      order.status !== CustomOrderStatus.PENDING_REVIEW &&
      order.status !== CustomOrderStatus.REVISION_REQUESTED
    ) {
      throw new BadRequestException(
        'Sketch can only be updated while order is under review',
      );
    }

    return this.prisma.customOrder.update({
      where: { id },
      data: {
        sketchImageUrl: data.sketchImageUrl,
        artisanNote: data.artisanNote,
        status: CustomOrderStatus.PENDING_REVIEW,
      },
    });
  }

  private assertStatusTransition(
    currentStatus: CustomOrderStatus,
    nextStatus: CustomOrderStatus,
  ) {
    if (currentStatus === nextStatus) {
      return;
    }

    const allowedTransitions: Partial<
      Record<CustomOrderStatus, CustomOrderStatus[]>
    > = {
      [CustomOrderStatus.CRAFTING]: [CustomOrderStatus.FINISHING],
      [CustomOrderStatus.FINISHING]: [CustomOrderStatus.SHIPPED],
    };

    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid custom order status transition from ${currentStatus} to ${nextStatus}`,
      );
    }
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

  async getSellerCustomOrders(sellerId: string, roles: string[] = []) {
    const orders = await this.prisma.customOrder.findMany({
      where: this.isAdmin(roles) ? undefined : { sellerId },
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
