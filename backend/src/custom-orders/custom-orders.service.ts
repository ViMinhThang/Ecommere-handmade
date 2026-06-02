import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import {
  CustomOrderStatus,
  MarketplaceLedgerEntryStatus,
  MarketplaceLedgerEntryType,
  PaymentStatus,
  Prisma,
  RefundStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { CreateCustomOrderDto } from './dto/create-custom-order.dto';
import { UpdateSketchDto } from './dto/update-sketch.dto';
import { CreateCustomOrderRefundDto } from './dto/create-custom-order-refund.dto';
import { CreateCustomOrderProgressEventDto } from './dto/create-custom-order-progress-event.dto';
import { CreateCustomOrderReviewDto } from './dto/create-custom-order-review.dto';
import { SettingsService } from '../settings/settings.service';

const CURRENCY = 'vnd';
const DEFAULT_PLATFORM_COMMISSION_BPS = 1000;
const STRIPE_PAYMENT_EXPIRY_MS = 30 * 60 * 1000;

interface StripeWebhookPaymentPayload {
  eventId: string;
  paymentIntentId: string;
  type: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class CustomOrdersService {
  private readonly logger = new Logger(CustomOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly settingsService: SettingsService,
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

  private getPlatformCommissionBps() {
    return (
      this.settingsService?.getPlatformCommissionBps() ??
      DEFAULT_PLATFORM_COMMISSION_BPS
    );
  }

  private roundMoney(amount: number) {
    return Math.round(amount);
  }

  private calculatePlatformFee(amount: number) {
    return this.roundMoney((amount * this.getPlatformCommissionBps()) / 10000);
  }

  private getFinancialSummary(order: {
    price: Prisma.Decimal | number;
    refunds?: Array<{ amount: Prisma.Decimal | number; status: RefundStatus }>;
  }) {
    const gross = Number(order.price);
    const platformFee = this.calculatePlatformFee(gross);
    const refundedAmount = (order.refunds ?? [])
      .filter((refund) => refund.status === RefundStatus.SUCCEEDED)
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
    const sellerNetBeforeRefunds = Math.max(0, gross - platformFee);
    const refundedRatio = gross > 0 ? Math.min(refundedAmount / gross, 1) : 0;

    return {
      gross,
      customerPaid: gross,
      platformDiscount: 0,
      platformFee,
      sellerNet: this.roundMoney(
        Math.max(0, sellerNetBeforeRefunds * (1 - refundedRatio)),
      ),
      refundedAmount,
    };
  }

  private attachFinancialSummary<T extends { price: Prisma.Decimal | number }>(
    order: T & {
      refunds?: Array<{
        amount: Prisma.Decimal | number;
        status: RefundStatus;
      }>;
    },
  ) {
    return {
      ...order,
      financialSummary: this.getFinancialSummary(order),
    };
  }

  private getProgressStatusTitle(status: CustomOrderStatus) {
    const titles: Record<CustomOrderStatus, string> = {
      [CustomOrderStatus.DRAFT]: 'Đơn thiết kế đã được tạo nháp',
      [CustomOrderStatus.PENDING_REVIEW]: 'Bản phác thảo đang chờ duyệt',
      [CustomOrderStatus.REVISION_REQUESTED]: 'Khách hàng yêu cầu chỉnh sửa',
      [CustomOrderStatus.AWAITING_PAYMENT]: 'Đơn thiết kế đang chờ thanh toán',
      [CustomOrderStatus.CRAFTING]: 'Sản phẩm bắt đầu được chế tác',
      [CustomOrderStatus.FINISHING]: 'Sản phẩm đang được hoàn thiện',
      [CustomOrderStatus.SHIPPED]: 'Sản phẩm đã được bàn giao vận chuyển',
      [CustomOrderStatus.DELIVERED]: 'Sản phẩm đã được giao',
      [CustomOrderStatus.CANCELLED]: 'Đơn thiết kế đã hủy',
    };

    return titles[status] ?? 'Cập nhật tiến độ';
  }

  private getProgressStatusNote(status: CustomOrderStatus) {
    const notes: Partial<Record<CustomOrderStatus, string>> = {
      [CustomOrderStatus.CRAFTING]:
        'Người bán đã bắt đầu chế tác sản phẩm handmade theo báo giá đã thống nhất.',
      [CustomOrderStatus.FINISHING]:
        'Sản phẩm đang được kiểm tra chi tiết, hoàn thiện bề mặt và chuẩn bị đóng gói.',
      [CustomOrderStatus.SHIPPED]:
        'Sản phẩm đã hoàn thiện và được chuyển sang giai đoạn giao hàng.',
      [CustomOrderStatus.DELIVERED]:
        'Sản phẩm đã được giao thành công cho khách hàng.',
      [CustomOrderStatus.CANCELLED]: 'Đơn thiết kế riêng đã được hủy.',
    };

    return notes[status];
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

  private async createLedgerEntry(
    tx: Prisma.TransactionClient,
    data: Prisma.MarketplaceLedgerEntryCreateInput,
  ) {
    try {
      return await tx.marketplaceLedgerEntry.create({ data });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        return null;
      }
      throw error;
    }
  }

  private async postCustomOrderLedger(
    tx: Prisma.TransactionClient,
    customOrderId: string,
  ) {
    const order = await tx.customOrder.findUnique({
      where: { id: customOrderId },
    });
    if (!order) {
      throw new NotFoundException('Custom Order not found');
    }

    const gross = Number(order.price);
    const platformFee = this.calculatePlatformFee(gross);
    const sellerEarning = Math.max(0, gross - platformFee);

    await this.createLedgerEntry(tx, {
      type: MarketplaceLedgerEntryType.PAYMENT_CAPTURE,
      status: MarketplaceLedgerEntryStatus.POSTED,
      amount: gross,
      currency: CURRENCY,
      idempotencyKey: `custom_order:${order.id}:payment_capture`,
      customOrder: { connect: { id: order.id } },
      customer: { connect: { id: order.customerId } },
      seller: { connect: { id: order.sellerId } },
    });

    await this.createLedgerEntry(tx, {
      type: MarketplaceLedgerEntryType.SELLER_EARNING,
      status: MarketplaceLedgerEntryStatus.POSTED,
      amount: sellerEarning,
      currency: CURRENCY,
      idempotencyKey: `custom_order:${order.id}:seller_earning`,
      customOrder: { connect: { id: order.id } },
      customer: { connect: { id: order.customerId } },
      seller: { connect: { id: order.sellerId } },
    });

    await this.createLedgerEntry(tx, {
      type: MarketplaceLedgerEntryType.PLATFORM_FEE,
      status: MarketplaceLedgerEntryStatus.POSTED,
      amount: platformFee,
      currency: CURRENCY,
      idempotencyKey: `custom_order:${order.id}:platform_fee`,
      customOrder: { connect: { id: order.id } },
      customer: { connect: { id: order.customerId } },
      seller: { connect: { id: order.sellerId } },
    });
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
        refunds: true,
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
      ...this.attachFinancialSummary(order),
      specifications: this.parseSpecifications(order.specifications),
    };
  }

  async getProgressEvents(id: string, userId: string, roles: string[]) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id },
      select: { id: true, customerId: true, sellerId: true },
    });

    if (!order) {
      throw new NotFoundException('Custom Order not found');
    }

    if (!this.canAccessOrder(order, userId, roles)) {
      throw new ForbiddenException('Not your order');
    }

    return this.prisma.customOrderProgressEvent.findMany({
      where: { customOrderId: id },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            roles: true,
            avatar: true,
            shopName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createProgressEvent(
    id: string,
    actorId: string,
    roles: string[],
    data: CreateCustomOrderProgressEventDto,
  ) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id },
      select: { id: true, customerId: true, sellerId: true, status: true },
    });

    if (!order) {
      throw new NotFoundException('Custom Order not found');
    }

    if (!this.isAdmin(roles) && order.sellerId !== actorId) {
      throw new ForbiddenException('Not your order');
    }

    return this.prisma.customOrderProgressEvent.create({
      data: {
        customOrderId: id,
        actorId,
        status: data.status ?? order.status,
        title: data.title.trim(),
        note: data.note?.trim() || null,
        imageUrl: data.imageUrl?.trim() || null,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            roles: true,
            avatar: true,
            shopName: true,
          },
        },
      },
    });
  }

  private async safeCreateProgressEvent(data: {
    customOrderId: string;
    actorId: string;
    status: CustomOrderStatus;
    title?: string;
    note?: string;
    imageUrl?: string | null;
  }) {
    try {
      await this.prisma.customOrderProgressEvent.create({
        data: {
          customOrderId: data.customOrderId,
          actorId: data.actorId,
          status: data.status,
          title: data.title ?? this.getProgressStatusTitle(data.status),
          note: data.note ?? this.getProgressStatusNote(data.status),
          imageUrl: data.imageUrl ?? null,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to create custom order progress event for ${data.customOrderId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
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

    const canCreatePayment =
      order.status === CustomOrderStatus.PENDING_REVIEW ||
      (order.status === CustomOrderStatus.AWAITING_PAYMENT &&
        order.paymentStatus === PaymentStatus.UNPAID);

    if (!canCreatePayment) {
      throw new BadRequestException('Order is not in review state');
    }

    let { paymentIntentId } = order;
    let clientSecret: string | null = null;
    const isExpired =
      order.paymentExpiresAt && order.paymentExpiresAt <= new Date();

    if (paymentIntentId && isExpired) {
      await this.stripeService.cancelPaymentIntent(paymentIntentId);
      await this.prisma.customOrder.update({
        where: { id },
        data: {
          paymentIntentId: null,
          paymentExpiresAt: null,
          paymentStatus: PaymentStatus.UNPAID,
        },
      });
      paymentIntentId = null;
    }

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
        data: {
          status: CustomOrderStatus.AWAITING_PAYMENT,
          paymentStatus: PaymentStatus.UNPAID,
          paymentIntentId,
          paymentExpiresAt: new Date(Date.now() + STRIPE_PAYMENT_EXPIRY_MS),
        },
      });
    } else {
      const intent =
        await this.stripeService.retrievePaymentIntent(paymentIntentId);
      clientSecret = intent.client_secret;
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
      CustomOrderStatus.DELIVERED,
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

    return this.prisma.$transaction((tx) => this.markCustomOrderPaid(tx, id));
  }

  private async markCustomOrderPaid(
    tx: Prisma.TransactionClient,
    customOrderId: string,
  ) {
    const order = await tx.customOrder.update({
      where: { id: customOrderId },
      data: {
        status: CustomOrderStatus.CRAFTING,
        paymentStatus: PaymentStatus.PAID,
        paymentExpiresAt: null,
      },
    });

    await this.postCustomOrderLedger(tx, customOrderId);
    return order;
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

    const updated = await this.prisma.customOrder.update({
      where: { id },
      data: {
        status,
        deliveredAt:
          status === CustomOrderStatus.DELIVERED ? new Date() : undefined,
      },
    });

    await this.safeCreateProgressEvent({
      customOrderId: id,
      actorId,
      status,
    });

    return updated;
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

  private calculateRefundedAmount(
    refunds: Array<{ amount: Prisma.Decimal | number; status: RefundStatus }>,
  ) {
    return refunds
      .filter((refund) => refund.status === RefundStatus.SUCCEEDED)
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
  }

  private getRefundPaymentStatus(orderTotal: number, refundedTotal: number) {
    return refundedTotal >= orderTotal
      ? PaymentStatus.REFUNDED
      : PaymentStatus.PARTIALLY_REFUNDED;
  }

  private async postCustomOrderRefundLedger(
    tx: Prisma.TransactionClient,
    customOrderId: string,
    refundId: string,
    refundAmount: number,
  ) {
    const order = await tx.customOrder.findUnique({
      where: { id: customOrderId },
    });
    if (!order) {
      throw new NotFoundException('Custom Order not found');
    }

    const ratio = Math.min(refundAmount / Number(order.price), 1);
    const sellerNet = Math.max(
      0,
      Number(order.price) - this.calculatePlatformFee(Number(order.price)),
    );
    const sellerRefundImpact = this.roundMoney(sellerNet * ratio);

    if (sellerRefundImpact === 0) {
      return;
    }

    await this.createLedgerEntry(tx, {
      type: MarketplaceLedgerEntryType.REFUND,
      status: MarketplaceLedgerEntryStatus.POSTED,
      amount: -sellerRefundImpact,
      currency: CURRENCY,
      idempotencyKey: `refund:${refundId}:custom_order:${order.id}`,
      customOrder: { connect: { id: order.id } },
      refund: { connect: { id: refundId } },
      customer: { connect: { id: order.customerId } },
      seller: { connect: { id: order.sellerId } },
    });
  }

  async refundCustomOrder(id: string, dto: CreateCustomOrderRefundDto) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id },
      include: { refunds: true },
    });
    if (!order) {
      throw new NotFoundException('Custom Order not found');
    }

    if (!order.paymentIntentId) {
      throw new BadRequestException('Custom order has no payment intent');
    }

    if (
      order.paymentStatus !== PaymentStatus.PAID &&
      order.paymentStatus !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException('Custom order is not refundable');
    }

    const refundedAmount = this.calculateRefundedAmount(order.refunds);
    const refundableBalance = Number(order.price) - refundedAmount;
    const amount = this.roundMoney(dto.amount ?? refundableBalance);

    if (amount <= 0 || amount > refundableBalance) {
      throw new BadRequestException('Refund amount exceeds paid balance');
    }

    const idempotencyKey = [
      'refund',
      'custom_order',
      order.id,
      amount,
      dto.reason.trim(),
    ].join(':');

    const existingRefund = await this.prisma.refund.findUnique({
      where: { idempotencyKey },
    });
    if (existingRefund) {
      return existingRefund;
    }

    const stripeRefund = await this.stripeService.createRefund(
      order.paymentIntentId,
      amount,
      {
        customOrderId: order.id,
        reason: dto.reason,
      },
      idempotencyKey,
    );

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          customOrderId: order.id,
          paymentIntentId: order.paymentIntentId!,
          providerRefundId: stripeRefund.id,
          amount,
          currency: CURRENCY,
          reason: dto.reason,
          status: RefundStatus.SUCCEEDED,
          idempotencyKey,
        },
      });

      await this.postCustomOrderRefundLedger(tx, order.id, refund.id, amount);

      await tx.customOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: this.getRefundPaymentStatus(
            Number(order.price),
            refundedAmount + amount,
          ),
        },
      });

      return refund;
    });
  }

  async cancelOrder(id: string, actorId: string, roles: string[]) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id },
      include: { refunds: true },
    });
    if (!order) {
      throw new NotFoundException('Custom Order not found');
    }
    if (!this.canAccessOrder(order, actorId, roles)) {
      throw new ForbiddenException('Not your order');
    }
    if (
      order.status === CustomOrderStatus.CANCELLED ||
      order.status === CustomOrderStatus.DELIVERED
    ) {
      throw new BadRequestException('Custom order can no longer be cancelled');
    }

    const shouldRefund =
      order.paymentStatus === PaymentStatus.PAID ||
      order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;
    const refund = shouldRefund
      ? await this.refundCustomOrder(id, {
          reason: 'Custom order cancellation',
        })
      : null;

    const updated = await this.prisma.customOrder.update({
      where: { id },
      data: {
        status: CustomOrderStatus.CANCELLED,
        paymentStatus: refund ? PaymentStatus.REFUNDED : order.paymentStatus,
        cancelledAt: new Date(),
      },
      include: { refunds: true },
    });

    return {
      ...this.attachFinancialSummary(updated),
      refund,
    };
  }

  async getAdminCustomOrderLedger(customOrderId: string) {
    const order = await this.prisma.customOrder.findUnique({
      where: { id: customOrderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('Custom Order not found');
    }

    return this.prisma.marketplaceLedgerEntry.findMany({
      where: { customOrderId },
      include: {
        seller: {
          select: { id: true, name: true, shopName: true, avatar: true },
        },
        customer: { select: { id: true, name: true, email: true } },
        refund: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private assertStripePaymentMatchesOrder(
    order: {
      id: string;
      customerId: string;
      sellerId: string;
      price: Prisma.Decimal | number;
    },
    payment: {
      amount: number;
      currency: string;
      metadata?: Record<string, string>;
    },
  ) {
    if (payment.currency.toLowerCase() !== CURRENCY) {
      throw new BadRequestException('Payment currency does not match order');
    }
    if (payment.amount !== Math.round(Number(order.price))) {
      throw new BadRequestException('Payment amount does not match order');
    }

    const metadata = payment.metadata ?? {};
    if (metadata.customOrderId && metadata.customOrderId !== order.id) {
      throw new BadRequestException('Payment metadata does not match order');
    }
    if (metadata.customerId && metadata.customerId !== order.customerId) {
      throw new BadRequestException('Payment metadata does not match customer');
    }
    if (metadata.sellerId && metadata.sellerId !== order.sellerId) {
      throw new BadRequestException('Payment metadata does not match seller');
    }
  }

  async handlePaymentIntentSucceeded(payload: StripeWebhookPaymentPayload) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.customOrder.findUnique({
        where: { paymentIntentId: payload.paymentIntentId },
      });

      if (!order) {
        return { received: true, processed: false, reason: 'order_not_found' };
      }

      const recorded = await this.recordWebhookEvent(tx, payload);
      if (!recorded) {
        return { received: true, processed: false, reason: 'duplicate' };
      }

      if (order.paymentStatus === PaymentStatus.PAID) {
        return { received: true, processed: false, reason: 'already_paid' };
      }

      if (order.status === CustomOrderStatus.CANCELLED) {
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
        amount: payload.amount,
        currency: payload.currency,
        metadata: payload.metadata,
      });

      const updatedOrder = await this.markCustomOrderPaid(tx, order.id);

      return {
        received: true,
        processed: true,
        customOrderId: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
      };
    });
  }

  async handlePaymentIntentFailed(payload: StripeWebhookPaymentPayload) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.customOrder.findUnique({
        where: { paymentIntentId: payload.paymentIntentId },
      });

      if (!order) {
        return { received: true, processed: false, reason: 'order_not_found' };
      }

      const recorded = await this.recordWebhookEvent(tx, payload);
      if (!recorded) {
        return { received: true, processed: false, reason: 'duplicate' };
      }

      if (
        order.paymentStatus !== PaymentStatus.UNPAID ||
        order.status === CustomOrderStatus.CANCELLED
      ) {
        return { received: true, processed: false, reason: 'terminal_order' };
      }

      const updatedOrder = await tx.customOrder.update({
        where: { id: order.id },
        data: {
          status: CustomOrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
          paymentExpiresAt: null,
          cancelledAt: new Date(),
        },
      });

      return {
        received: true,
        processed: true,
        customOrderId: updatedOrder.id,
        paymentStatus: updatedOrder.paymentStatus,
        orderStatus: updatedOrder.status,
      };
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
      [CustomOrderStatus.SHIPPED]: [CustomOrderStatus.DELIVERED],
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
        refunds: true,
        seller: { select: { id: true, name: true, shopName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => ({
      ...this.attachFinancialSummary(o),
      specifications: this.parseSpecifications(o.specifications),
    }));
  }

  async getSellerCustomOrders(sellerId: string, roles: string[] = []) {
    const orders = await this.prisma.customOrder.findMany({
      where: this.isAdmin(roles) ? undefined : { sellerId },
      include: {
        refunds: true,
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => ({
      ...this.attachFinancialSummary(o),
      specifications: this.parseSpecifications(o.specifications),
    }));
  }

  async createCustomOrderReview(
    userId: string,
    customOrderId: string,
    data: CreateCustomOrderReviewDto,
  ) {
    const customOrder = await this.prisma.customOrder.findUnique({
      where: { id: customOrderId },
      include: {
        customer: true,
        seller: true,
      },
    });

    if (!customOrder) {
      throw new NotFoundException('Không tìm thấy đơn hàng custom');
    }

    if (customOrder.customerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền đánh giá đơn hàng này',
      );
    }

    if (customOrder.status !== CustomOrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Bạn chỉ có thể đánh giá sau khi nhận được hàng',
      );
    }

    const existingReview = await this.prisma.customOrderReview.findUnique({
      where: { customOrderId },
    });

    if (existingReview) {
      throw new BadRequestException('Bạn đã đánh giá đơn hàng này rồi');
    }

    const review = await this.prisma.customOrderReview.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        images: data.images || [],
        userId,
        customOrderId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return review;
  }

  async getCustomOrderReview(customOrderId: string) {
    const review = await this.prisma.customOrderReview.findUnique({
      where: { customOrderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return review;
  }

  async sellerReplyToCustomOrderReview(
    sellerId: string,
    roles: string[],
    reviewId: string,
    reply: string,
  ) {
    const review = await this.prisma.customOrderReview.findUnique({
      where: { id: reviewId },
      include: {
        customOrder: {
          include: {
            seller: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    const isOwner = review.customOrder.sellerId === sellerId;
    const isAdminRole = this.isAdmin(roles);

    if (!isOwner && !isAdminRole) {
      throw new ForbiddenException(
        'Bạn không có quyền trả lời đánh giá này',
      );
    }

    const updatedReview = await this.prisma.customOrderReview.update({
      where: { id: reviewId },
      data: { sellerReply: reply },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return updatedReview;
  }

  async getSellerLatestCustomOrderReviews(sellerId: string) {
    const reviews = await this.prisma.customOrderReview.findMany({
      where: {
        customOrder: {
          sellerId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        customOrder: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return reviews;
  }
}
